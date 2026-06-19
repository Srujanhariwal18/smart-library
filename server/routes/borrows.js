import express from 'express';
import { dbAll, dbGet, dbRun, dbTransaction } from '../config/db.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { logActivity, createNotification } from '../utils/logger.js';

const router = express.Router();
const FINE_RATE = parseFloat(process.env.FINE_RATE_PER_DAY) || 5.0;
const RENEWAL_LIMIT = parseInt(process.env.RENEWAL_LIMIT) || 2;
const BORROW_DAYS = parseInt(process.env.BORROW_DAYS_LIMIT) || 14;

// 1. Issue Book (Librarian/Admin only)
router.post('/issue', authenticateJWT, requireRole(['librarian', 'admin']), async (req, res) => {
  const { email, bookId } = req.body;

  if (!email || !bookId) {
    return res.status(400).json({ message: 'Student email and Book ID are required' });
  }

  try {
    // Check if user exists and is active
    const user = await dbGet('SELECT id, role, status FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(404).json({ message: 'User with this email not found' });
    }
    if (user.role !== 'student') {
      return res.status(400).json({ message: 'Books can only be issued to students' });
    }
    if (user.status === 'suspended') {
      return res.status(400).json({ message: 'Cannot issue books to a suspended user' });
    }

    // Check if book exists and has copies available
    const book = await dbGet('SELECT id, title, available_copies, total_copies FROM books WHERE id = ?', [bookId]);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    if (book.available_copies <= 0) {
      return res.status(400).json({ message: 'No available copies of this book' });
    }

    // Process borrowing inside transaction
    await dbTransaction(async () => {
      // 1. Decrease book available copies
      await dbRun('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', [bookId]);

      // 2. Calculate due date
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + BORROW_DAYS);
      const dueDateStr = dueDate.toISOString().slice(0, 19).replace('T', ' ');

      // 3. Create borrow record
      await dbRun(`
        INSERT INTO borrows (user_id, book_id, borrow_date, due_date, status, fine_amount, renewal_count)
        VALUES (?, ?, datetime('now'), ?, 'borrowed', 0.0, 0)
      `, [user.id, book.id, dueDateStr]);

      // 4. Send notification
      await createNotification(
        user.id,
        `Book "${book.title}" has been issued to you. Please return it by ${dueDate.toLocaleDateString()}.`
      );

      // 5. Log activity
      await logActivity(req.user.id, 'ISSUE_BOOK', `Issued book "${book.title}" (ID: ${bookId}) to user (ID: ${user.id})`);
    });

    res.status(201).json({ message: 'Book issued successfully' });
  } catch (err) {
    console.error('Issue Book Error:', err.message);
    res.status(500).json({ message: 'Failed to issue book' });
  }
});

// 2. Return Book (Librarian/Admin only)
router.post('/return/:id', authenticateJWT, requireRole(['librarian', 'admin']), async (req, res) => {
  const borrowId = req.params.id;

  try {
    const borrow = await dbGet(`
      SELECT b.*, bk.title, bk.available_copies, bk.total_copies
      FROM borrows b
      JOIN books bk ON b.book_id = bk.id
      WHERE b.id = ? AND b.status IN ('borrowed', 'overdue')
    `, [borrowId]);

    if (!borrow) {
      return res.status(404).json({ message: 'Active borrow record not found' });
    }

    // Calculate fine if overdue
    const now = new Date();
    const dueDate = new Date(borrow.due_date);
    let fineAmount = 0.0;
    
    if (now > dueDate) {
      const diffTime = Math.abs(now - dueDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      fineAmount = diffDays * FINE_RATE;
    }

    await dbTransaction(async () => {
      // 1. Update borrow record
      await dbRun(`
        UPDATE borrows 
        SET return_date = datetime('now'), status = 'returned', fine_amount = ? 
        WHERE id = ?
      `, [fineAmount, borrowId]);

      // 2. Increase book available copies
      await dbRun('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?', [borrow.book_id]);

      // 3. Check for any pending reservations for this book
      const nextReservation = await dbGet(`
        SELECT * FROM reservations 
        WHERE book_id = ? AND status = 'pending'
        ORDER BY waitlist_position ASC, reservation_date ASC
        LIMIT 1
      `, [borrow.book_id]);

      if (nextReservation) {
        // Auto-fulfill or change reservation status to allow booking
        // The library holds the book for the first reservant
        await dbRun('UPDATE reservations SET status = \'fulfilled\' WHERE id = ?', [nextReservation.id]);
        
        // Notify the student
        await createNotification(
          nextReservation.user_id,
          `The book "${borrow.title}" you reserved is now available! Your reservation has been fulfilled. Please borrow it soon.`
        );
      }

      // 4. Notify student returning the book
      await createNotification(
        borrow.user_id,
        `Book "${borrow.title}" returned successfully. ${fineAmount > 0 ? `Fine issued: $${fineAmount.toFixed(2)}` : 'No fines.'}`
      );

      // 5. Log activity
      await logActivity(req.user.id, 'RETURN_BOOK', `Returned book "${borrow.title}" (ID: ${borrow.book_id}) for user (ID: ${borrow.user_id}). Fine: $${fineAmount}`);
    });

    res.json({ message: 'Book returned successfully', fineAmount });
  } catch (err) {
    console.error('Return Book Error:', err.message);
    res.status(500).json({ message: 'Failed to return book' });
  }
});

// 3. Renew Borrowed Book (Student or Librarian)
router.post('/renew/:id', authenticateJWT, async (req, res) => {
  const borrowId = req.params.id;

  try {
    const borrow = await dbGet(`
      SELECT b.*, bk.title, bk.available_copies
      FROM borrows b
      JOIN books bk ON b.book_id = bk.id
      WHERE b.id = ? AND b.status = 'borrowed'
    `, [borrowId]);

    if (!borrow) {
      return res.status(404).json({ message: 'Active borrow record not found or already overdue' });
    }

    // Role guard: Students can only renew their own books
    if (req.user.role === 'student' && borrow.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only renew your own borrowed books' });
    }

    // Enforce renewal limit
    if (borrow.renewal_count >= RENEWAL_LIMIT) {
      return res.status(400).json({ message: `Renewal limit of ${RENEWAL_LIMIT} reached for this book.` });
    }

    // Conflict Handling: If there is a pending reservation on this book, don't allow renewal
    const hasReservations = await dbGet(`
      SELECT id FROM reservations WHERE book_id = ? AND status = 'pending' LIMIT 1
    `, [borrow.book_id]);

    if (hasReservations) {
      return res.status(400).json({ 
        message: 'This book has been reserved by another student and cannot be renewed.' 
      });
    }

    // Extend due date (14 days from the current due date)
    const currentDueDate = new Date(borrow.due_date);
    currentDueDate.setDate(currentDueDate.getDate() + BORROW_DAYS);
    const newDueDateStr = currentDueDate.toISOString().slice(0, 19).replace('T', ' ');

    await dbRun(`
      UPDATE borrows
      SET due_date = ?, renewal_count = renewal_count + 1
      WHERE id = ?
    `, [newDueDateStr, borrowId]);

    await createNotification(
      borrow.user_id,
      `Your borrow for "${borrow.title}" has been renewed. New due date: ${currentDueDate.toLocaleDateString()}.`
    );

    await logActivity(req.user.id, 'RENEW_BOOK', `Renewed book "${borrow.title}" (Borrow ID: ${borrowId})`);

    res.json({ message: 'Book renewed successfully', newDueDate: newDueDateStr });
  } catch (err) {
    console.error('Renew Book Error:', err.message);
    res.status(500).json({ message: 'Failed to renew book' });
  }
});

// 4. Borrowing History (Own for student, All for librarian/admin)
router.get('/history', authenticateJWT, async (req, res) => {
  try {
    let sql = `
      SELECT b.*, bk.title, bk.cover_image, u.name as user_name, u.email as user_email
      FROM borrows b
      JOIN books bk ON b.book_id = bk.id
      JOIN users u ON b.user_id = u.id
    `;
    const params = [];

    if (req.user.role === 'student') {
      sql += ' WHERE b.user_id = ?';
      params.push(req.user.id);
    }

    sql += ' ORDER BY b.borrow_date DESC';
    const history = await dbAll(sql, params);

    res.json(history);
  } catch (err) {
    console.error('Borrow History Error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
