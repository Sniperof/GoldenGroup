import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { JWT_SECRET } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
    }

    const { rows } = await pool.query(
      `SELECT id, name, username, password_hash, role, is_active
       FROM hr_users WHERE username = $1`,
      [username.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'الحساب غير مفعّل. تواصل مع المدير.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
