import express from 'express';
import { dbAll, dbGet, dbRun } from '../config/db.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

const router = express.Router();

// GET /api/announcements — Active announcements for the current user (banner)
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const announcements = await dbAll(`
      SELECT * FROM announcements
      WHERE (expires_at IS NULL OR expires_at > ?)
      ORDER BY created_at DESC
    `, [now]);
    res.json(announcements);
  } catch (err) {
    console.error('Announcements GET Error:', err.message);
    res.status(500).json({ message: 'Failed to fetch announcements' });
  }
});

// GET /api/announcements/all — All announcements for admin management
router.get('/all', authenticateJWT, requireRole(['admin']), async (req, res) => {
  try {
    const announcements = await dbAll('SELECT * FROM announcements ORDER BY created_at DESC');
    res.json(announcements);
  } catch (err) {
    console.error('All Announcements GET Error:', err.message);
    res.status(500).json({ message: 'Failed to fetch announcements' });
  }
});

// POST /api/announcements — Create announcement (admin only)
router.post('/', authenticateJWT, requireRole(['admin']), async (req, res) => {
  const { message, target_role, expires_at } = req.body;

  if (!message || !target_role) {
    return res.status(400).json({ message: 'Message and target role are required' });
  }

  try {
    const result = await dbRun(
      'INSERT INTO announcements (message, target_role, expires_at, created_by) VALUES (?, ?, ?, ?)',
      [message, target_role, expires_at || null, req.user.id]
    );

    await logActivity(req.user.id, 'CREATE_ANNOUNCEMENT', `Created announcement targeting "${target_role}": "${message.substring(0, 50)}..."`);

    const created = await dbGet('SELECT * FROM announcements WHERE id = ?', [result.id]);
    res.status(201).json(created);
  } catch (err) {
    console.error('Create Announcement Error:', err.message);
    res.status(500).json({ message: 'Failed to create announcement' });
  }
});

// DELETE /api/announcements/:id (admin only)
router.delete('/:id', authenticateJWT, requireRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const ann = await dbGet('SELECT id FROM announcements WHERE id = ?', [id]);
    if (!ann) return res.status(404).json({ message: 'Announcement not found' });

    await dbRun('DELETE FROM announcements WHERE id = ?', [id]);
    await logActivity(req.user.id, 'DELETE_ANNOUNCEMENT', `Deleted announcement ID ${id}`);
    res.json({ message: 'Announcement deleted successfully' });
  } catch (err) {
    console.error('Delete Announcement Error:', err.message);
    res.status(500).json({ message: 'Failed to delete announcement' });
  }
});

export default router;
