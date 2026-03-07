import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM employees ORDER BY id');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, role, mobile, status, avatar } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO employees (name, role, mobile, status, avatar) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [name, role, mobile, status || 'active', avatar || '']
  );
  res.json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { name, role, mobile, status, avatar } = req.body;
  const { rows } = await pool.query(
    'UPDATE employees SET name=$1, role=$2, mobile=$3, status=$4, avatar=$5 WHERE id=$6 RETURNING *',
    [name, role, mobile, status, avatar, req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

export default router;
