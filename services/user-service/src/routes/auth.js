import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';

const router = express.Router();

// POST /api/users/register
router.post('/register', async (req, res) => {
  const { email, password, name, role } = req.body;

  // --- Validation ---
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }

  // Simple email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (role && !['rider', 'driver'].includes(role)) {
    return res.status(400).json({ error: 'Role must be either rider or driver' });
  }

  try {
    // --- Hash the password ---
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // --- Insert into database ---
    const result = await query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, created_at`,
      [email, passwordHash, name, role || 'rider']
    );

    const user = result.rows[0];

    res.status(201).json({ user });
  } catch (err) {
    // Unique constraint violation (duplicate email)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Registration error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
