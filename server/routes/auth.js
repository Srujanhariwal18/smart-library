import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbGet, dbRun } from '../config/db.js';
import { authenticateJWT } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretlibrarykey123!';

// ─── Role Whitelist ─────────────────────────────────────────────────────────
const ADMIN_LIBRARIAN_EMAIL = 'srujanhariwal464@gmail.com';
const TEACHER_EMAIL = 'srujanhariwal18@gmail.com';

const resolveRoleForEmail = (email, requestedRole = null) => {
  const lower = (email || '').toLowerCase();
  if (lower === ADMIN_LIBRARIAN_EMAIL) {
    // Allow admin or librarian — default to admin
    return ['admin', 'librarian'].includes(requestedRole) ? requestedRole : 'admin';
  }
  if (lower === TEACHER_EMAIL) return 'teacher';
  // Everyone else: student by default, can self-select teacher
  return requestedRole === 'teacher' ? 'teacher' : 'student';
};
// ────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/clerk-sync
 * Called by the frontend after Clerk authenticates a user.
 * Syncs the Clerk user to our SQLite DB and returns a local JWT.
 * Body: { clerkId, email, name, requestedRole? }
 */
router.post('/clerk-sync', async (req, res) => {
  const { clerkId, email, name, requestedRole } = req.body;

  if (!clerkId || !email) {
    return res.status(400).json({ message: 'clerkId and email are required' });
  }

  try {
    const lowerEmail = email.toLowerCase();

    // 1. Try finding user by clerk_id
    let user = await dbGet('SELECT * FROM users WHERE clerk_id = ?', [clerkId]);

    if (!user) {
      // 2. Try linking by email (seeded/existing user)
      user = await dbGet('SELECT * FROM users WHERE email = ?', [lowerEmail]);
      if (user) {
        await dbRun('UPDATE users SET clerk_id = ? WHERE id = ?', [clerkId, user.id]);
        user.clerk_id = clerkId;
      }
    }

    if (!user) {
      // 3. New user — determine role
      const isAdminLibrarianEmail = lowerEmail === ADMIN_LIBRARIAN_EMAIL;

      // If this is the admin/librarian email and no valid role has been chosen yet,
      // signal the frontend to show the role picker.
      if (isAdminLibrarianEmail && !['admin', 'librarian'].includes(requestedRole)) {
        return res.status(202).json({
          needsRolePick: true,
          message: 'This account requires role selection'
        });
      }

      // Safety: never allow admin/librarian email to be saved as student
      const role = resolveRoleForEmail(lowerEmail, requestedRole);
      if (isAdminLibrarianEmail && !['admin', 'librarian'].includes(role)) {
        return res.status(202).json({
          needsRolePick: true,
          message: 'This account requires role selection'
        });
      }

      const displayName = name || email.split('@')[0];

      const result = await dbRun(
        'INSERT INTO users (name, email, role, status, clerk_id) VALUES (?, ?, ?, ?, ?)',
        [displayName, lowerEmail, role, 'active', clerkId]
      );
      user = await dbGet('SELECT * FROM users WHERE id = ?', [result.id]);
      await logActivity(user.id, 'REGISTER', `Clerk user registered: ${lowerEmail} as ${role}`);
    }

    // Extra guard: if this is the admin/librarian email but was somehow
    // stored as student (e.g. seeded by mistake), force role picker
    if (user.email.toLowerCase() === ADMIN_LIBRARIAN_EMAIL && !['admin', 'librarian'].includes(user.role)) {
      return res.status(202).json({
        needsRolePick: true,
        message: 'This account requires role selection'
      });
    }


    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account is suspended. Contact administration.' });
    }

    // Issue a local JWT for all subsequent API calls
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logActivity(user.id, 'LOGIN', 'Clerk SSO login successful');

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('Clerk Sync Error:', err.message);
    res.status(500).json({ message: 'Authentication sync failed' });
  }
});

/**
 * POST /api/auth/clerk-role-pick
 * Called after srujanhariwal464@gmail.com picks Admin or Librarian.
 * Body: { clerkId, email, name, role: 'admin'|'librarian' }
 */
router.post('/clerk-role-pick', async (req, res) => {
  const { clerkId, email, name, role } = req.body;

  if (!clerkId || !email || !['admin', 'librarian'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role pick request' });
  }

  const lowerEmail = email.toLowerCase();
  if (lowerEmail !== ADMIN_LIBRARIAN_EMAIL) {
    return res.status(403).json({ message: 'Role picking is not allowed for this email' });
  }

  try {
    let user = await dbGet('SELECT * FROM users WHERE clerk_id = ?', [clerkId]);

    if (!user) {
      const displayName = name || email.split('@')[0];
      const result = await dbRun(
        'INSERT INTO users (name, email, role, status, clerk_id) VALUES (?, ?, ?, ?, ?)',
        [displayName, lowerEmail, role, 'active', clerkId]
      );
      user = await dbGet('SELECT * FROM users WHERE id = ?', [result.id]);
      await logActivity(user.id, 'REGISTER', `Admin/Librarian registered as ${role}`);
    } else {
      // Update role if they already exist
      await dbRun('UPDATE users SET role = ? WHERE id = ?', [role, user.id]);
      user.role = role;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('Role Pick Error:', err.message);
    res.status(500).json({ message: 'Role selection failed' });
  }
});



// Register User
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

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

    // Determine target role based on email whitelist:
    // srujanhariwal464@gmail.com → admin or librarian (picked by user)
    // srujanhariwal18@gmail.com  → teacher
    // everyone else              → student or teacher (self-selected)
    const ADMIN_LIBRARIAN_EMAIL = 'srujanhariwal464@gmail.com';
    const TEACHER_EMAIL = 'srujanhariwal18@gmail.com';
    const lowerEmail = email.toLowerCase();

    let targetRole = 'student';
    if (lowerEmail === ADMIN_LIBRARIAN_EMAIL) {
      // Accept admin or librarian only; default to admin
      targetRole = ['admin', 'librarian'].includes(role) ? role : 'admin';
    } else if (lowerEmail === TEACHER_EMAIL) {
      targetRole = 'teacher';
    } else if (role === 'teacher') {
      targetRole = 'teacher';
    }

    // Insert user (default role: student, status: active)
    const { id } = await dbRun(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [name, email, passwordHash, targetRole, 'active']
    );

    await logActivity(id, 'REGISTER', `User registered with email: ${email} as ${targetRole}`);

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

// Update User Profile
router.put('/profile', authenticateJWT, async (req, res) => {
  const { name, role } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }

  try {
    // Only allow changing roles between student and teacher
    let targetRole = req.user.role;
    if (role && ['student', 'teacher'].includes(role) && ['student', 'teacher'].includes(req.user.role)) {
      targetRole = role;
    }

    await dbRun(
      'UPDATE users SET name = ?, role = ? WHERE id = ?',
      [name, targetRole, req.user.id]
    );

    await logActivity(req.user.id, 'UPDATE_PROFILE', `User updated name to "${name}" and role to "${targetRole}"`);

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: req.user.id,
        name,
        email: req.user.email,
        role: targetRole
      }
    });
  } catch (err) {
    console.error('Profile Update Error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Switch role for admin email
router.post('/switch-role', authenticateJWT, async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'librarian'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role selection' });
  }
  const lowerEmail = req.user.email.toLowerCase();
  if (lowerEmail !== 'srujanhariwal464@gmail.com') {
    return res.status(403).json({ message: 'Role switching is not permitted for this email' });
  }
  try {
    await dbRun('UPDATE users SET role = ? WHERE id = ?', [role, req.user.id]);
    await logActivity(req.user.id, 'SWITCH_ROLE', `Switched active role to: ${role}`);
    res.json({ message: 'Role switched successfully', role });
  } catch (err) {
    console.error('Switch Role Error:', err.message);
    res.status(500).json({ message: 'Failed to switch role' });
  }
});

export default router;
