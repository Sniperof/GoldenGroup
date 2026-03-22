import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/branches
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.id, b.name, b.location_geo_id AS "locationGeoId", 
             b.covered_geo_ids AS "coveredGeoIds", b.status, b.created_at AS "createdAt",
             g.name AS "locationGeoName"
      FROM branches b
      LEFT JOIN geo_units g ON g.id = b.location_geo_id
      ORDER BY b.created_at DESC
    `);
    res.json(rows);
  } catch (err: any) {
    console.error('Error fetching branches:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/branches
router.post('/', async (req, res) => {
  try {
    const { name, locationGeoId, coveredGeoIds, status } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO branches (name, location_geo_id, covered_geo_ids, status) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, location_geo_id AS "locationGeoId", 
                 covered_geo_ids AS "coveredGeoIds", status, created_at AS "createdAt"`,
      [name, locationGeoId || null, coveredGeoIds || [], status || 'active']
    );
    res.json(rows[0]);
  } catch (err: any) {
    console.error('Error creating branch:', err);
    // Log to a file we can read
    import('fs').then(fs => {
        fs.appendFileSync('branch_error.log', `${new Date().toISOString()} - ${err.message}\n${err.stack}\n`);
    });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/branches/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, locationGeoId, coveredGeoIds, status } = req.body;
    const { rows } = await pool.query(
      `UPDATE branches SET 
         name = $1, location_geo_id = $2, covered_geo_ids = $3, status = $4
       WHERE id = $5
       RETURNING id, name, location_geo_id AS "locationGeoId", 
                 covered_geo_ids AS "coveredGeoIds", status, created_at AS "createdAt"`,
      [name, locationGeoId || null, coveredGeoIds || [], status || 'active', id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    res.json(rows[0]);
  } catch (err: any) {
    console.error('Error updating branch:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/branches/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM branches WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting branch:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
