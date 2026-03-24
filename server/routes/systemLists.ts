import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/system-lists
// Get all lists, optionally filtered by category
router.get('/', async (req, res) => {
  try {
    const { category, activeOnly } = req.query;
    
    let query = `
      SELECT id, category, value, is_active AS "isActive", display_order AS "displayOrder"
      FROM system_lists
    `;
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }
    
    if (activeOnly === 'true') {
      conditions.push(`is_active = TRUE`);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY category ASC, display_order ASC, id ASC`;
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err: any) {
    console.error('Error fetching system lists:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/system-lists
// Create a new list item
router.post('/', async (req, res) => {
  try {
    const { category, value, isActive, displayOrder } = req.body;
    
    if (!category || !value) {
      return res.status(400).json({ error: 'Category and matching value are required' });
    }
    
    const { rows } = await pool.query(
      `INSERT INTO system_lists (category, value, is_active, display_order)
       VALUES ($1, $2, $3, $4)
       RETURNING id, category, value, is_active AS "isActive", display_order AS "displayOrder"`,
      [category, value, isActive !== undefined ? isActive : true, displayOrder || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err: any) {
    console.error('Error creating system list item:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/system-lists/:id
// Update an existing list item
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category, value, isActive, displayOrder } = req.body;
    
    const { rows } = await pool.query(
      `UPDATE system_lists SET 
        category = COALESCE($1, category),
        value = COALESCE($2, value),
        is_active = COALESCE($3, is_active),
        display_order = COALESCE($4, display_order),
        updated_at = NOW()
       WHERE id = $5
       RETURNING id, category, value, is_active AS "isActive", display_order AS "displayOrder"`,
      [category, value, isActive, displayOrder, id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'System list item not found' });
    }
    
    res.json(rows[0]);
  } catch (err: any) {
    console.error('Error updating system list item:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/system-lists/:id
// Delete a list item (Hard delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM system_lists WHERE id = $1', [id]);
    
    if (rowCount === 0) {
      return res.status(404).json({ error: 'System list item not found' });
    }
    
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting system list item:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
