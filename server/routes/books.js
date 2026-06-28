import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dbAll, dbGet, dbRun, dbTransaction } from '../config/db.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup multer storage for covers and ebooks
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'cover') {
      cb(null, path.join(__dirname, '../uploads/covers'));
    } else if (file.fieldname === 'pdf') {
      cb(null, path.join(__dirname, '../uploads/ebooks'));
    } else {
      cb(new Error('Invalid field name'), null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'cover') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for book covers!'), false);
      }
    } else if (file.fieldname === 'pdf') {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed for e-books!'), false);
      }
    } else {
      cb(null, false);
    }
  }
});

// Autocomplete suggestions
router.get('/autocomplete', async (req, res) => {
  const { query } = req.query;
  if (!query || query.length < 2) {
    return res.json([]);
  }

  try {
    const searchPattern = `%${query}%`;
    const books = await dbAll(
      `SELECT id, title, 'book' as type FROM books WHERE title LIKE ? LIMIT 5`,
      [searchPattern]
    );
    const authors = await dbAll(
      `SELECT id, name as title, 'author' as type FROM authors WHERE name LIKE ? LIMIT 5`,
      [searchPattern]
    );

    res.json([...books, ...authors]);
  } catch (err) {
    console.error('Autocomplete Error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get Categories and Authors list (used in forms)
router.get('/meta', async (req, res) => {
  try {
    const categories = await dbAll('SELECT * FROM categories ORDER BY name ASC');
    const authors = await dbAll('SELECT * FROM authors ORDER BY name ASC');
    res.json({ categories, authors });
  } catch (err) {
    console.error('Metadata retrieval failed:', err.message);
    res.status(500).json({ message: 'Failed to retrieve metadata' });
  }
});

// Create Category (Librarian/Admin only)
router.post('/categories', authenticateJWT, requireRole(['librarian', 'admin']), async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Category name is required' });

  try {
    const existing = await dbGet('SELECT id FROM categories WHERE name = ?', [name]);
    if (existing) return res.status(400).json({ message: 'Category already exists' });

    const { id } = await dbRun('INSERT INTO categories (name, description) VALUES (?, ?)', [name, description]);
    await logActivity(req.user.id, 'ADD_CATEGORY', `Created category: ${name}`);
    res.status(201).json({ id, name, description });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to create category' });
  }
});

// Create Author (Librarian/Admin only)
router.post('/authors', authenticateJWT, requireRole(['librarian', 'admin']), async (req, res) => {
  const { name, biography } = req.body;
  if (!name) return res.status(400).json({ message: 'Author name is required' });

  try {
    const { id } = await dbRun('INSERT INTO authors (name, biography) VALUES (?, ?)', [name, biography]);
    await logActivity(req.user.id, 'ADD_AUTHOR', `Created author: ${name}`);
    res.status(201).json({ id, name, biography });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Failed to create author' });
  }
});

// Search & Paginate Books
router.get('/', async (req, res) => {
  const { search, category, author, status, page = 1, limit = 6 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let sql = `
      SELECT b.*, a.name as author_name, c.name as category_name,
             (SELECT file_path FROM ebooks e WHERE e.book_id = b.id) as ebook_path
      FROM books b
      LEFT JOIN authors a ON b.author_id = a.id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ' AND (b.title LIKE ? OR b.isbn LIKE ? OR a.name LIKE ?)';
      const p = `%${search}%`;
      params.push(p, p, p);
    }
    if (category) {
      sql += ' AND b.category_id = ?';
      params.push(category);
    }
    if (author) {
      sql += ' AND b.author_id = ?';
      params.push(author);
    }
    if (status === 'available') {
      sql += ' AND b.available_copies > 0';
    } else if (status === 'unavailable') {
      sql += ' AND b.available_copies = 0';
    }

    // Get total count for pagination
    const countSql = `SELECT COUNT(*) as count FROM (${sql})`;
    const countResult = await dbGet(countSql, params);
    const totalCount = countResult.count;

    // Apply pagination
    sql += ' ORDER BY b.title ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const books = await dbAll(sql, params);
    res.json({
      books,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error('Books Retrieval Error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get Book Details by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const book = await dbGet(`
      SELECT b.*, a.name as author_name, c.name as category_name,
             (SELECT file_path FROM ebooks e WHERE e.book_id = b.id) as ebook_path
      FROM books b
      LEFT JOIN authors a ON b.author_id = a.id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = ?
    `, [id]);

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Retrieve reviews
    const reviews = await dbAll(`
      SELECT r.*, u.name as user_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.book_id = ?
      ORDER BY r.created_at DESC
    `, [id]);

    res.json({ book, reviews });
  } catch (err) {
    console.error('Book Detail Error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add Book (Librarian/Admin only)
router.post('/', authenticateJWT, requireRole(['librarian', 'admin']), upload.single('cover'), async (req, res) => {
  const { title, isbn, category_id, author_id, publication_year, description, total_copies, location } = req.body;

  if (!title || !isbn || !total_copies) {
    return res.status(400).json({ message: 'Title, ISBN, and total copies are required' });
  }

  try {
    const existing = await dbGet('SELECT id FROM books WHERE isbn = ?', [isbn]);
    if (existing) {
      return res.status(400).json({ message: 'ISBN already exists' });
    }

    const coverPath = req.file 
      ? `/uploads/covers/${req.file.filename}` 
      : (req.body.cover_image && (req.body.cover_image.startsWith('http://') || req.body.cover_image.startsWith('https://'))
        ? req.body.cover_image
        : '/uploads/covers/placeholder.jpg');

    const { id } = await dbRun(`
      INSERT INTO books (title, isbn, category_id, author_id, publication_year, description, cover_image, total_copies, available_copies, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title,
      isbn,
      category_id || null,
      author_id || null,
      publication_year || null,
      description || '',
      coverPath,
      total_copies,
      total_copies, // available copies start at total
      location || ''
    ]);

    await logActivity(req.user.id, 'ADD_BOOK', `Added book: "${title}" (ISBN: ${isbn})`);

    res.status(201).json({ id, message: 'Book added successfully' });
  } catch (err) {
    console.error('Add Book Error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Edit Book (Librarian/Admin only)
router.put('/:id', authenticateJWT, requireRole(['librarian', 'admin']), upload.single('cover'), async (req, res) => {
  const { id } = req.params;
  const { title, isbn, category_id, author_id, publication_year, description, total_copies, location } = req.body;

  try {
    const book = await dbGet('SELECT * FROM books WHERE id = ?', [id]);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Check unique ISBN
    if (isbn && isbn !== book.isbn) {
      const existing = await dbGet('SELECT id FROM books WHERE isbn = ?', [isbn]);
      if (existing) {
        return res.status(400).json({ message: 'ISBN is already in use by another book' });
      }
    }

    let coverPath = book.cover_image;
    if (req.file) {
      coverPath = `/uploads/covers/${req.file.filename}`;
      // Clean up old file if it wasn't the placeholder
      if (book.cover_image && !book.cover_image.endsWith('placeholder.jpg')) {
        const oldPath = path.join(__dirname, '..', book.cover_image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    } else if (req.body.cover_image && (req.body.cover_image.startsWith('http://') || req.body.cover_image.startsWith('https://'))) {
      coverPath = req.body.cover_image;
    }

    // Adjust availability based on total_copies difference
    const diff = parseInt(total_copies) - book.total_copies;
    const newAvailable = Math.max(0, book.available_copies + diff);

    await dbRun(`
      UPDATE books
      SET title = ?, isbn = ?, category_id = ?, author_id = ?, publication_year = ?,
          description = ?, cover_image = ?, total_copies = ?, available_copies = ?, location = ?
      WHERE id = ?
    `, [
      title || book.title,
      isbn || book.isbn,
      category_id || book.category_id,
      author_id || book.author_id,
      publication_year || book.publication_year,
      description || book.description,
      coverPath,
      total_copies || book.total_copies,
      newAvailable,
      location || book.location,
      id
    ]);

    await logActivity(req.user.id, 'EDIT_BOOK', `Updated book: "${title || book.title}" (ID: ${id})`);

    res.json({ message: 'Book updated successfully' });
  } catch (err) {
    console.error('Edit Book Error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete Book (Librarian/Admin only)
router.delete('/:id', authenticateJWT, requireRole(['librarian', 'admin']), async (req, res) => {
  const { id } = req.params;

  try {
    const book = await dbGet('SELECT * FROM books WHERE id = ?', [id]);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Clean up cover image
    if (book.cover_image && !book.cover_image.endsWith('placeholder.jpg')) {
      const coverPath = path.join(__dirname, '..', book.cover_image);
      if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
    }

    // Clean up ebook PDF if exists
    const ebook = await dbGet('SELECT file_path FROM ebooks WHERE book_id = ?', [id]);
    if (ebook) {
      const ebookPath = path.join(__dirname, '..', ebook.file_path);
      if (fs.existsSync(ebookPath)) fs.unlinkSync(ebookPath);
    }

    await dbRun('DELETE FROM books WHERE id = ?', [id]);

    await logActivity(req.user.id, 'DELETE_BOOK', `Deleted book: "${book.title}" (ID: ${id})`);

    res.json({ message: 'Book deleted successfully' });
  } catch (err) {
    console.error('Delete Book Error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Upload Ebook PDF (Librarian/Admin only)
router.post('/:id/ebook', authenticateJWT, requireRole(['librarian', 'admin']), upload.single('pdf'), async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a PDF file' });
  }

  try {
    const book = await dbGet('SELECT id, title FROM books WHERE id = ?', [id]);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const pdfPath = `/uploads/ebooks/${req.file.filename}`;

    // Upsert ebook
    const existing = await dbGet('SELECT id, file_path FROM ebooks WHERE book_id = ?', [id]);
    if (existing) {
      // Delete old ebook file
      const oldPath = path.join(__dirname, '..', existing.file_path);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

      await dbRun('UPDATE ebooks SET file_path = ? WHERE book_id = ?', [pdfPath, id]);
    } else {
      await dbRun('INSERT INTO ebooks (book_id, file_path) VALUES (?, ?)', [id, pdfPath]);
    }

    await logActivity(req.user.id, 'UPLOAD_EBOOK', `Uploaded e-book for "${book.title}"`);

    res.json({ message: 'E-book PDF uploaded successfully' });
  } catch (err) {
    console.error('E-book Upload Error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Download Ebook PDF (Student/Librarian/Admin)
router.get('/:id/ebook/download', authenticateJWT, async (req, res) => {
  const { id } = req.params;

  try {
    const ebook = await dbGet(`
      SELECT e.*, b.title 
      FROM ebooks e
      JOIN books b ON e.book_id = b.id
      WHERE e.book_id = ?
    `, [id]);

    if (!ebook) {
      return res.status(404).json({ message: 'E-book not found for this book' });
    }

    // Increment download count
    await dbRun('UPDATE ebooks SET download_count = download_count + 1 WHERE id = ?', [ebook.id]);

    await logActivity(req.user.id, 'DOWNLOAD_EBOOK', `Downloaded e-book: "${ebook.title}"`);

    const fullFilePath = path.join(__dirname, '..', ebook.file_path);
    res.download(fullFilePath, `${ebook.title.replace(/\s+/g, '_')}.pdf`);
  } catch (err) {
    console.error('E-book Download Error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
