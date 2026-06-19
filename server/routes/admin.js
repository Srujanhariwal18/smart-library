import express from 'express';
import bcrypt from 'bcryptjs';
import { dbAll, dbGet, dbRun, dbTransaction } from '../config/db.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

const router = express.Router();

// Apply admin guard to all routes in this router
router.use(authenticateJWT);
router.use(requireRole(['admin']));

// 1. Live Dashboard Statistics & Chart Data
router.get('/dashboard', async (req, res) => {
  try {
    const totalBooks = await dbGet('SELECT SUM(total_copies) as total FROM books');
    const activeBorrows = await dbGet('SELECT COUNT(*) as count FROM borrows WHERE status IN (\'borrowed\', \'overdue\')');
    const totalFines = await dbGet('SELECT SUM(fine_amount) as total FROM borrows');
    const registeredUsers = await dbGet('SELECT COUNT(*) as count FROM users');

    // Chart: Borrows by Category
    const categoryStats = await dbAll(`
      SELECT c.name as category, COUNT(b.id) as borrow_count
      FROM borrows b
      JOIN books bk ON b.book_id = bk.id
      JOIN categories c ON bk.category_id = c.id
      GROUP BY c.name
    `);

    // Chart: Borrow Status Distribution
    const borrowStatusStats = await dbAll(`
      SELECT status, COUNT(*) as count
      FROM borrows
      GROUP BY status
    `);

    // Chart: Most Popular Books (by borrow count)
    const popularBooks = await dbAll(`
      SELECT bk.title, COUNT(b.id) as borrow_count
      FROM borrows b
      JOIN books bk ON b.book_id = bk.id
      GROUP BY bk.id
      ORDER BY borrow_count DESC
      LIMIT 5
    `);

    // Recent user activities
    const recentLogs = await dbAll(`
      SELECT l.*, u.name as user_name, u.role as user_role
      FROM user_activity_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.timestamp DESC
      LIMIT 5
    `);

    res.json({
      stats: {
        totalBooks: totalBooks.total || 0,
        activeBorrows: activeBorrows.count || 0,
        finesCollected: totalFines.total || 0.0,
        registeredUsers: registeredUsers.count || 0
      },
      charts: {
        categories: categoryStats,
        statusDist: borrowStatusStats,
        popularBooks
      },
      recentLogs
    });
  } catch (err) {
    console.error('Dashboard Stats Error:', err.message);
    res.status(500).json({ message: 'Failed to retrieve dashboard stats' });
  }
});

// 2. User CRUD Operations

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await dbAll('SELECT id, name, email, role, status, created_at FROM users ORDER BY name ASC');
    res.json(users);
  } catch (err) {
    console.error('Get Users Error:', err.message);
    res.status(500).json({ message: 'Failed to get users' });
  }
});

// Create student or librarian
router.post('/users', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (!['student', 'librarian', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role type' });
  }

  try {
    const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const { id } = await dbRun(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [name, email, passwordHash, role, 'active']
    );

    await logActivity(req.user.id, 'CREATE_USER', `Created user: ${name} (${email}) as ${role}`);

    res.status(201).json({ id, name, email, role, status: 'active' });
  } catch (err) {
    console.error('Create User Error:', err.message);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// Edit user status or role
router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, role, status, password } = req.body;

  try {
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check unique email if modified
    if (email && email !== user.email) {
      const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
      if (existing) return res.status(400).json({ message: 'Email is already in use' });
    }

    let passwordHash = user.password_hash;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    await dbRun(`
      UPDATE users 
      SET name = ?, email = ?, role = ?, status = ?, password_hash = ?
      WHERE id = ?
    `, [
      name || user.name,
      email || user.email,
      role || user.role,
      status || user.status,
      passwordHash,
      id
    ]);

    await logActivity(
      req.user.id,
      'EDIT_USER',
      `Updated user ID ${id}: Name=${name || user.name}, Email=${email || user.email}, Role=${role || user.role}, Status=${status || user.status}`
    );

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    console.error('Update User Error:', err.message);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Delete User
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }

  try {
    const user = await dbGet('SELECT name, email FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await dbRun('DELETE FROM users WHERE id = ?', [id]);

    await logActivity(req.user.id, 'DELETE_USER', `Deleted user: ${user.name} (${user.email})`);

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete User Error:', err.message);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// 3. Reports & Activity Logs

// Borrowing Reports (with date filter)
router.get('/reports/borrows', async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    let sql = `
      SELECT b.*, bk.title, bk.isbn, u.name as user_name, u.email as user_email
      FROM borrows b
      JOIN books bk ON b.book_id = bk.id
      JOIN users u ON b.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      sql += ' AND b.borrow_date >= ?';
      params.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      sql += ' AND b.borrow_date <= ?';
      params.push(`${endDate} 23:59:59`);
    }

    sql += ' ORDER BY b.borrow_date DESC';
    const report = await dbAll(sql, params);
    res.json(report);
  } catch (err) {
    console.error('Borrow Report Error:', err.message);
    res.status(500).json({ message: 'Failed to fetch borrowing reports' });
  }
});

// Fine Collection Reports (with date filter)
router.get('/reports/fines', async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    let sql = `
      SELECT b.*, bk.title, u.name as user_name, u.email as user_email
      FROM borrows b
      JOIN books bk ON b.book_id = bk.id
      JOIN users u ON b.user_id = u.id
      WHERE b.fine_amount > 0 AND b.status = 'returned'
    `;
    const params = [];

    if (startDate) {
      sql += ' AND b.return_date >= ?';
      params.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      sql += ' AND b.return_date <= ?';
      params.push(`${endDate} 23:59:59`);
    }

    sql += ' ORDER BY b.return_date DESC';
    const report = await dbAll(sql, params);
    res.json(report);
  } catch (err) {
    console.error('Fines Report Error:', err.message);
    res.status(500).json({ message: 'Failed to fetch fine reports' });
  }
});

// User activity logs
router.get('/logs', async (req, res) => {
  try {
    const logs = await dbAll(`
      SELECT l.*, u.name as user_name, u.email as user_email, u.role as user_role
      FROM user_activity_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.timestamp DESC
      LIMIT 100
    `);
    res.json(logs);
  } catch (err) {
    console.error('Fetch Logs Error:', err.message);
    res.status(500).json({ message: 'Failed to fetch activity logs' });
  }
});

export default router;
