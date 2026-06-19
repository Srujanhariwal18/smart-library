import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbGet, dbRun } from '../config/db.js';
import { authenticateJWT } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretlibrarykey123!';

// Register Student
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  try {
    // Check if email already exists
    const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user (default role: student, status: active)
    const { id } = await dbRun(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [name, email, passwordHash, 'student', 'active']
    );

    await logActivity(id, 'REGISTER', `User registered with email: ${email}`);

    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    console.error('Registration Error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login User
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account is suspended. Please contact admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logActivity(user.id, 'LOGIN', 'User logged in successfully');

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login Error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get User Profile
router.get('/profile', authenticateJWT, async (req, res) => {
  try {
    const user = await dbGet('SELECT id, name, email, role, status, created_at FROM users WHERE id = ?', [req.user.id]);
    res.json(user);
  } catch (err) {
    console.error('Profile Retrieval Error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
