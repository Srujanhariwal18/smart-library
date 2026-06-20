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
    if (user.role !== 'student' && user.role !== 'teacher') {
      return res.status(400).json({ message: 'Books can only be issued to students or teachers' });
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

// 3. Renew Borrowed Book (Librarian/Admin only)
router.post('/renew/:id', authenticateJWT, requireRole(['librarian', 'admin']), async (req, res) => {
  const borrowId = req.params.id;

  try {
    const borrow = await dbGet(`
      SELECT b.*, bk.title, bk.available_copies
      FROM borrows b
      JOIN books bk ON b.book_id = bk.id
      WHERE b.id = ? AND b.status IN ('borrowed', 'overdue')
    `, [borrowId]);

    if (!borrow) {
      return res.status(404).json({ message: 'Active borrow record not found or already overdue' });
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

// 3a. Request to Borrow Book (Teacher only)
router.post('/request-borrow', authenticateJWT, requireRole(['teacher']), async (req, res) => {
  const { bookId } = req.body;

  if (!bookId) {
    return res.status(400).json({ message: 'Book ID is required' });
  }

  try {
    // Check if book exists and has copies available
    const book = await dbGet('SELECT id, title, available_copies FROM books WHERE id = ?', [bookId]);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    if (book.available_copies <= 0) {
      return res.status(400).json({ message: 'No available copies of this book' });
    }

    // Check if user already has a pending or active borrow/request for this book
    const existing = await dbGet(`
      SELECT id FROM borrows 
      WHERE user_id = ? AND book_id = ? AND status IN ('pending_borrow', 'borrowed', 'overdue', 'pending_return', 'pending_renewal')
    `, [req.user.id, bookId]);

    if (existing) {
      return res.status(400).json({ message: 'You already have an active checkout or pending request for this book.' });
    }

    // Create a pending borrow record
    // Use datetime('now') as placeholder due_date until approved
    await dbRun(`
      INSERT INTO borrows (user_id, book_id, borrow_date, due_date, status, fine_amount, renewal_count)
      VALUES (?, ?, datetime('now'), datetime('now'), 'pending_borrow', 0.0, 0)
    `, [req.user.id, bookId]);

    await createNotification(
      req.user.id,
      `Your request to borrow "${book.title}" has been submitted for librarian approval.`
    );

    await logActivity(req.user.id, 'REQUEST_BORROW', `Requested to borrow book "${book.title}" (ID: ${bookId})`);

    res.status(201).json({ message: 'Borrow request submitted successfully' });
  } catch (err) {
    console.error('Request Borrow Error:', err.message);
    res.status(500).json({ message: 'Failed to submit borrow request' });
  }
});

// 3b. Request Renewal (Teacher only)
router.post('/request-renewal/:id', authenticateJWT, requireRole(['teacher']), async (req, res) => {
  const borrowId = req.params.id;

  try {
    const borrow = await dbGet(`
      SELECT b.*, bk.title 
      FROM borrows b
      JOIN books bk ON b.book_id = bk.id
      WHERE b.id = ? AND b.user_id = ? AND b.status IN ('borrowed', 'overdue')
    `, [borrowId, req.user.id]);

    if (!borrow) {
      return res.status(404).json({ message: 'Active borrow record not found' });
    }

    if (borrow.renewal_count >= RENEWAL_LIMIT) {
      return res.status(400).json({ message: `Renewal limit of ${RENEWAL_LIMIT} reached.` });
    }

    // Check reservations
    const hasReservations = await dbGet(`
      SELECT id FROM reservations WHERE book_id = ? AND status = 'pending' LIMIT 1
    `, [borrow.book_id]);

    if (hasReservations) {
      return res.status(400).json({ message: 'This book is reserved by another user and cannot be renewed.' });
    }

    // Update status to pending_renewal
    await dbRun("UPDATE borrows SET status = 'pending_renewal' WHERE id = ?", [borrowId]);

    await createNotification(
      req.user.id,
      `Your renewal request for "${borrow.title}" has been submitted for librarian approval.`
    );

    await logActivity(req.user.id, 'REQUEST_RENEWAL', `Requested renewal for book "${borrow.title}" (Borrow ID: ${borrowId})`);

    res.json({ message: 'Renewal request submitted successfully' });
  } catch (err) {
    console.error('Request Renewal Error:', err.message);
    res.status(500).json({ message: 'Failed to submit renewal request' });
  }
});

// 3c. Request Return (Teacher only)
router.post('/request-return/:id', authenticateJWT, requireRole(['teacher']), async (req, res) => {
  const borrowId = req.params.id;

  try {
    const borrow = await dbGet(`
      SELECT b.*, bk.title 
      FROM borrows b
      JOIN books bk ON b.book_id = bk.id
      WHERE b.id = ? AND b.user_id = ? AND b.status IN ('borrowed', 'overdue')
    `, [borrowId, req.user.id]);

    if (!borrow) {
      return res.status(404).json({ message: 'Active borrow record not found' });
    }

    // Update status to pending_return
    await dbRun("UPDATE borrows SET status = 'pending_return' WHERE id = ?", [borrowId]);

    await createNotification(
      req.user.id,
      `Your return request for "${borrow.title}" has been submitted for librarian verification.`
    );

    await logActivity(req.user.id, 'REQUEST_RETURN', `Requested return for book "${borrow.title}" (Borrow ID: ${borrowId})`);

    res.json({ message: 'Return request submitted successfully' });
  } catch (err) {
    console.error('Request Return Error:', err.message);
    res.status(500).json({ message: 'Failed to submit return request' });
  }
});

// 3d. List all pending circulation requests (Librarian/Admin only)
router.get('/requests', authenticateJWT, requireRole(['librarian', 'admin']), async (req, res) => {
  try {
    const requests = await dbAll(`
      SELECT b.*, bk.title, bk.cover_image, u.name as user_name, u.email as user_email, u.role as user_role
      FROM borrows b
      JOIN books bk ON b.book_id = bk.id
      JOIN users u ON b.user_id = u.id
      WHERE b.status IN ('pending_borrow', 'pending_return', 'pending_renewal')
      ORDER BY b.borrow_date DESC
    `);
    res.json(requests);
  } catch (err) {
    console.error('Fetch Pending Requests Error:', err.message);
    res.status(500).json({ message: 'Failed to retrieve pending requests' });
  }
});

// 3e. Approve pending request (Librarian/Admin only)
router.post('/approve/:id', authenticateJWT, requireRole(['librarian', 'admin']), async (req, res) => {
  const borrowId = req.params.id;

  try {
    const borrow = await dbGet(`
      SELECT b.*, bk.title, bk.available_copies
      FROM borrows b
      JOIN books bk ON b.book_id = bk.id
      WHERE b.id = ?
    `, [borrowId]);

    if (!borrow) {
      return res.status(404).json({ message: 'Circulation request record not found' });
    }

    if (borrow.status === 'pending_borrow') {
      if (borrow.available_copies <= 0) {
        return res.status(400).json({ message: 'No copies available to issue' });
      }

      await dbTransaction(async () => {
        // Decrement available copies
        await dbRun('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', [borrow.book_id]);

        // Calculate due date
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + BORROW_DAYS);
        const dueDateStr = dueDate.toISOString().slice(0, 19).replace('T', ' ');

        // Update status to borrowed
        await dbRun(`
          UPDATE borrows 
          SET status = 'borrowed', borrow_date = datetime('now'), due_date = ?
          WHERE id = ?
        `, [dueDateStr, borrowId]);

        await createNotification(
          borrow.user_id,
          `Your request to borrow "${borrow.title}" has been approved! Due date: ${dueDate.toLocaleDateString()}.`
        );

        await logActivity(req.user.id, 'APPROVE_BORROW', `Approved borrow request for "${borrow.title}" (User ID: ${borrow.user_id})`);
      });

      return res.json({ message: 'Borrow request approved successfully' });
    }

    if (borrow.status === 'pending_return') {
      const now = new Date();
      const dueDate = new Date(borrow.due_date);
      let fineAmount = 0.0;

      if (now > dueDate) {
        const diffTime = Math.abs(now - dueDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        fineAmount = diffDays * FINE_RATE;
      }

      await dbTransaction(async () => {
        // Update borrow record
        await dbRun(`
          UPDATE borrows 
          SET return_date = datetime('now'), status = 'returned', fine_amount = ? 
          WHERE id = ?
        `, [fineAmount, borrowId]);

        // Increment available copies
        await dbRun('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?', [borrow.book_id]);

        // Fulfill reservations
        const nextReservation = await dbGet(`
          SELECT * FROM reservations 
          WHERE book_id = ? AND status = 'pending'
          ORDER BY waitlist_position ASC, reservation_date ASC
          LIMIT 1
        `, [borrow.book_id]);

        if (nextReservation) {
          await dbRun("UPDATE reservations SET status = 'fulfilled' WHERE id = ?", [nextReservation.id]);
          await createNotification(
            nextReservation.user_id,
            `The book "${borrow.title}" you reserved is now available! Please borrow it soon.`
          );
        }

        await createNotification(
          borrow.user_id,
          `Your return for "${borrow.title}" has been approved. ${fineAmount > 0 ? `Overdue fine: $${fineAmount.toFixed(2)}` : 'No fines.'}`
        );

        await logActivity(req.user.id, 'APPROVE_RETURN', `Approved return for "${borrow.title}". Fine: $${fineAmount}`);
      });

      return res.json({ message: 'Return request approved successfully', fineAmount });
    }

    if (borrow.status === 'pending_renewal') {
      const hasReservations = await dbGet(`
        SELECT id FROM reservations WHERE book_id = ? AND status = 'pending' LIMIT 1
      `, [borrow.book_id]);

      if (hasReservations) {
        return res.status(400).json({ message: 'Cannot renew. Book has pending reservations.' });
      }

      const currentDueDate = new Date(borrow.due_date);
      currentDueDate.setDate(currentDueDate.getDate() + BORROW_DAYS);
      const newDueDateStr = currentDueDate.toISOString().slice(0, 19).replace('T', ' ');

      await dbRun(`
        UPDATE borrows 
        SET status = 'borrowed', due_date = ?, renewal_count = renewal_count + 1 
        WHERE id = ?
      `, [newDueDateStr, borrowId]);

      await createNotification(
        borrow.user_id,
        `Your renewal request for "${borrow.title}" has been approved! New due date: ${currentDueDate.toLocaleDateString()}.`
      );

      await logActivity(req.user.id, 'APPROVE_RENEWAL', `Approved renewal for "${borrow.title}"`);

      return res.json({ message: 'Renewal request approved successfully', newDueDate: newDueDateStr });
    }

    res.status(400).json({ message: 'Invalid request status for approval' });
  } catch (err) {
    console.error('Approve Request Error:', err.message);
    res.status(500).json({ message: 'Failed to approve request' });
  }
});

// 3f. Reject pending request (Librarian/Admin only)
router.post('/reject/:id', authenticateJWT, requireRole(['librarian', 'admin']), async (req, res) => {
  const borrowId = req.params.id;

  try {
    const borrow = await dbGet(`
      SELECT b.*, bk.title 
      FROM borrows b
      JOIN books bk ON b.book_id = bk.id
      WHERE b.id = ?
    `, [borrowId]);

    if (!borrow) {
      return res.status(404).json({ message: 'Circulation request record not found' });
    }

    if (borrow.status === 'pending_borrow') {
      await dbRun("UPDATE borrows SET status = 'rejected' WHERE id = ?", [borrowId]);
      await createNotification(borrow.user_id, `Your request to borrow "${borrow.title}" has been rejected.`);
      await logActivity(req.user.id, 'REJECT_BORROW', `Rejected borrow request for "${borrow.title}" (User ID: ${borrow.user_id})`);
      return res.json({ message: 'Borrow request rejected successfully' });
    }

    if (borrow.status === 'pending_return') {
      // Revert status to borrowed or overdue based on current time
      const now = new Date();
      const dueDate = new Date(borrow.due_date);
      const targetStatus = now > dueDate ? 'overdue' : 'borrowed';

      await dbRun('UPDATE borrows SET status = ? WHERE id = ?', [targetStatus, borrowId]);
      await createNotification(borrow.user_id, `Your return request for "${borrow.title}" was rejected by the librarian.`);
      await logActivity(req.user.id, 'REJECT_RETURN', `Rejected return request for "${borrow.title}" (User ID: ${borrow.user_id})`);
      return res.json({ message: 'Return request rejected successfully' });
    }

    if (borrow.status === 'pending_renewal') {
      // Revert status to borrowed or overdue based on current time
      const now = new Date();
      const dueDate = new Date(borrow.due_date);
      const targetStatus = now > dueDate ? 'overdue' : 'borrowed';

      await dbRun('UPDATE borrows SET status = ? WHERE id = ?', [targetStatus, borrowId]);
      await createNotification(borrow.user_id, `Your renewal request for "${borrow.title}" was rejected.`);
      await logActivity(req.user.id, 'REJECT_RENEWAL', `Rejected renewal request for "${borrow.title}" (User ID: ${borrow.user_id})`);
      return res.json({ message: 'Renewal request rejected successfully' });
    }

    res.status(400).json({ message: 'Invalid request status for rejection' });
  } catch (err) {
    console.error('Reject Request Error:', err.message);
    res.status(500).json({ message: 'Failed to reject request' });
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

    if (req.user.role === 'student' || req.user.role === 'teacher') {
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
