import express from 'express';
import { dbAll, dbGet, dbRun, dbTransaction } from '../config/db.js';
import { authenticateJWT } from '../middleware/auth.js';
import { logActivity, createNotification } from '../utils/logger.js';

const router = express.Router();

// 1. Reserve Book (Student only)
router.post('/reserve', authenticateJWT, async (req, res) => {
  const { bookId } = req.body;
  const userId = req.user.id;

  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Only students can reserve books' });
  }

  if (!bookId) {
    return res.status(400).json({ message: 'Book ID is required' });
  }

  try {
    // 1. Check if book exists
    const book = await dbGet('SELECT title, available_copies FROM books WHERE id = ?', [bookId]);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // 2. Prevent reservation if book is already available (should just borrow it)
    if (book.available_copies > 0) {
      return res.status(400).json({ message: 'Book is currently available for borrowing, no reservation needed.' });
    }

    // 3. Check if user already has an active reservation for this book
    const existingRes = await dbGet(
      'SELECT id FROM reservations WHERE user_id = ? AND book_id = ? AND status = \'pending\'',
      [userId, bookId]
    );
    if (existingRes) {
      return res.status(400).json({ message: 'You already have a pending reservation for this book.' });
    }

    // 4. Check if user currently borrows this book
    const existingBorrow = await dbGet(
      'SELECT id FROM borrows WHERE user_id = ? AND book_id = ? AND status = \'borrowed\'',
      [userId, bookId]
    );
    if (existingBorrow) {
      return res.status(400).json({ message: 'You currently have this book borrowed.' });
    }

    // Transaction to insert reservation and compute waitlist position
    let newPos = 1;
    await dbTransaction(async () => {
      // Get count of pending reservations to determine waitlist position
      const queueCount = await dbGet(
        'SELECT COUNT(*) as count FROM reservations WHERE book_id = ? AND status = \'pending\'',
        [bookId]
      );
      newPos = queueCount.count + 1;

      // Create reservation record
      await dbRun(`
        INSERT INTO reservations (user_id, book_id, reservation_date, status, waitlist_position)
        VALUES (?, ?, datetime('now'), 'pending', ?)
      `, [userId, bookId, newPos]);

      await createNotification(
        userId,
        `You have successfully reserved "${book.title}". Your waitlist position is ${newPos}.`
      );

      await logActivity(userId, 'RESERVE_BOOK', `Reserved book "${book.title}" (ID: ${bookId}) at queue position ${newPos}`);
    });

    res.status(201).json({ message: 'Book reserved successfully', waitlist_position: newPos });
  } catch (err) {
    console.error('Reservation Error:', err.message);
    res.status(500).json({ message: 'Failed to reserve book' });
  }
});

// 2. Cancel Reservation (Student, Librarian, Admin)
router.post('/cancel/:id', authenticateJWT, async (req, res) => {
  const reservationId = req.params.id;

  try {
    const reservation = await dbGet(`
      SELECT r.*, bk.title 
      FROM reservations r
      JOIN books bk ON r.book_id = bk.id
      WHERE r.id = ? AND r.status = 'pending'
    `, [reservationId]);

    if (!reservation) {
      return res.status(404).json({ message: 'Pending reservation not found' });
    }

    // Role check: Student can only cancel their own reservation
    if (req.user.role === 'student' && reservation.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only cancel your own reservations' });
    }

    await dbTransaction(async () => {
      // 1. Update reservation status to cancelled
      await dbRun('UPDATE reservations SET status = \'cancelled\', waitlist_position = 0 WHERE id = ?', [reservationId]);

      // 2. Adjust waitlist positions for other pending reservations of this book
      await dbRun(`
        UPDATE reservations
        SET waitlist_position = waitlist_position - 1
        WHERE book_id = ? AND status = 'pending' AND waitlist_position > ?
      `, [reservation.book_id, reservation.waitlist_position]);

      // 3. Notify user
      await createNotification(
        reservation.user_id,
        `Your reservation for "${reservation.title}" has been cancelled.`
      );

      // 4. Log activity
      await logActivity(req.user.id, 'CANCEL_RESERVATION', `Cancelled reservation for "${reservation.title}" (ID: ${reservation.book_id})`);
    });

    res.json({ message: 'Reservation cancelled successfully' });
  } catch (err) {
    console.error('Cancel Reservation Error:', err.message);
    res.status(500).json({ message: 'Failed to cancel reservation' });
  }
});

// 3. View Reservations (Student view own, Librarian/Admin view all)
router.get('/', authenticateJWT, async (req, res) => {
  try {
    let sql = `
      SELECT r.*, bk.title, bk.cover_image, u.name as user_name, u.email as user_email
      FROM reservations r
      JOIN books bk ON r.book_id = bk.id
      JOIN users u ON r.user_id = u.id
    `;
    const params = [];

    if (req.user.role === 'student') {
      sql += ' WHERE r.user_id = ?';
      params.push(req.user.id);
    }

    sql += ' ORDER BY r.reservation_date DESC';
    const reservations = await dbAll(sql, params);
    res.json(reservations);
  } catch (err) {
    console.error('Get Reservations Error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
