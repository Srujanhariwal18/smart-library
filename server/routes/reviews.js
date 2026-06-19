import express from 'express';
import { dbAll, dbGet, dbRun } from '../config/db.js';
import { authenticateJWT } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

const router = express.Router();

// 1. Submit or Edit Review (Student only)
router.post('/books/:bookId/review', authenticateJWT, async (req, res) => {
  const { bookId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user.id;

  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Only students can rate and review books' });
  }

  const numericRating = parseInt(rating);
  if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
  }

  try {
    const book = await dbGet('SELECT title FROM books WHERE id = ?', [bookId]);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Check if review already exists
    const existingReview = await dbGet(
      'SELECT id FROM reviews WHERE user_id = ? AND book_id = ?',
      [userId, bookId]
    );

    if (existingReview) {
      // Update review
      await dbRun(
        'UPDATE reviews SET rating = ?, comment = ?, created_at = datetime(\'now\') WHERE id = ?',
        [numericRating, comment || '', existingReview.id]
      );
      await logActivity(userId, 'UPDATE_REVIEW', `Updated review for "${book.title}" (Rating: ${numericRating})`);
      res.json({ message: 'Review updated successfully' });
    } else {
      // Insert review
      await dbRun(
        'INSERT INTO reviews (user_id, book_id, rating, comment) VALUES (?, ?, ?, ?)',
        [userId, bookId, numericRating, comment || '']
      );
      await logActivity(userId, 'ADD_REVIEW', `Reviewed book "${book.title}" (Rating: ${numericRating})`);
      res.status(201).json({ message: 'Review added successfully' });
    }
  } catch (err) {
    console.error('Review submission error:', err.message);
    res.status(500).json({ message: 'Failed to submit review' });
  }
});

// 2. Toggle Wishlist Item (Student only)
router.post('/wishlist/toggle', authenticateJWT, async (req, res) => {
  const { bookId } = req.body;
  const userId = req.user.id;

  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Only students can have wishlists' });
  }

  if (!bookId) {
    return res.status(400).json({ message: 'Book ID is required' });
  }

  try {
    const book = await dbGet('SELECT title FROM books WHERE id = ?', [bookId]);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const existing = await dbGet('SELECT id FROM wishlists WHERE user_id = ? AND book_id = ?', [userId, bookId]);

    if (existing) {
      // Remove from wishlist
      await dbRun('DELETE FROM wishlists WHERE id = ?', [existing.id]);
      await logActivity(userId, 'REMOVE_WISHLIST', `Removed "${book.title}" from wishlist`);
      res.json({ message: 'Removed from wishlist', inWishlist: false });
    } else {
      // Add to wishlist
      await dbRun('INSERT INTO wishlists (user_id, book_id) VALUES (?, ?)', [userId, bookId]);
      await logActivity(userId, 'ADD_WISHLIST', `Added "${book.title}" to wishlist`);
      res.json({ message: 'Added to wishlist', inWishlist: true });
    }
  } catch (err) {
    console.error('Wishlist toggle error:', err.message);
    res.status(500).json({ message: 'Failed to update wishlist' });
  }
});

// 3. Get Wishlist Items (Student only)
router.get('/wishlist', authenticateJWT, async (req, res) => {
  const userId = req.user.id;

  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Only students can view wishlists' });
  }

  try {
    const items = await dbAll(`
      SELECT w.id as wishlist_id, b.*, a.name as author_name, c.name as category_name
      FROM wishlists w
      JOIN books b ON w.book_id = b.id
      LEFT JOIN authors a ON b.author_id = a.id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE w.user_id = ?
      ORDER BY w.id DESC
    `, [userId]);

    res.json(items);
  } catch (err) {
    console.error('Fetch wishlist error:', err.message);
    res.status(500).json({ message: 'Failed to fetch wishlist' });
  }
});

export default router;
