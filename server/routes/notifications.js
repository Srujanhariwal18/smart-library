import express from 'express';
import { dbAll, dbRun } from '../config/db.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

// Get current user's notifications
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const notifications = await dbAll(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(notifications);
  } catch (err) {
    console.error('Failed to get notifications:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Mark single notification as read
router.put('/:id/read', authenticateJWT, async (req, res) => {
  try {
    const result = await dbRun(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Failed to update notification:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Mark all as read
router.put('/read-all', authenticateJWT, async (req, res) => {
  try {
    await dbRun(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Failed to update notifications:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
