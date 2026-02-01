import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import redis from '../redis.js';
import authenticate from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

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

// POST /api/users/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    // --- Find user by email ---
    const result = await query(
      'SELECT id, email, password_hash, name, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // --- Compare password ---
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // --- Generate JWT ---
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // --- Store session in Redis ---
    // Key:   "session:{userId}"  — one session per user
    // Value: the JWT token string
    // EX:    86400 seconds = 24 hours (matches JWT expiry)
    //
    // Why? So the API gateway can CHECK if this session is still valid.
    // When the user logs out, we DELETE this key → token becomes instantly useless.
    await redis.set(`session:${user.id}`, token, 'EX', 86400);

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/logout (protected — you must be logged in to log out)
router.post('/logout', authenticate, async (req, res) => {
  try {
    // DEL session:{userId} — removes the session key from Redis.
    // After this, the API gateway will see "null" when it checks for this user's
    // session, and will reject any further requests with the old token.
    await redis.del(`session:${req.user.id}`);

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/profile (protected)
router.get('/profile', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, name, role, license_number, vehicle_info, is_available, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Profile error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/driver-profile (protected, driver-only)
router.put('/driver-profile', authenticate, authorize('driver'), async (req, res) => {
  const { license_number, vehicle_info, is_available } = req.body;

  try {
    const result = await query(
      `UPDATE users
       SET license_number = COALESCE($1, license_number),
           vehicle_info = COALESCE($2, vehicle_info),
           is_available = COALESCE($3, is_available)
       WHERE id = $4
       RETURNING id, email, name, role, license_number, vehicle_info, is_available, created_at`,
      [license_number, vehicle_info ? JSON.stringify(vehicle_info) : null, is_available, req.user.id]
    );

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Driver profile update error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
