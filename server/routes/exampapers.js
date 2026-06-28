import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbAll, dbGet, dbRun } from '../config/db.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer storage for paper PDFs
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/papers');
    import('fs').then(fs => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    });
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
  }
});
const upload = multer({ storage, fileFilter: (req, file, cb) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('Only PDF files are allowed'), false);
}});

// GET /api/exam-papers — List all papers
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const papers = await dbAll('SELECT * FROM exam_papers ORDER BY created_at DESC');
    res.json(papers);
  } catch (err) {
    console.error('Exam Papers GET Error:', err.message);
    res.status(500).json({ message: 'Failed to fetch exam papers' });
  }
});

// POST /api/exam-papers — Upload new paper (librarian/admin only)
router.post('/', authenticateJWT, requireRole(['librarian', 'admin']), upload.single('paper'), async (req, res) => {
  const { title, subject, branch, year } = req.body;

  if (!title || !subject || !branch || !year) {
    return res.status(400).json({ message: 'Title, subject, branch, and year are required' });
  }

  try {
    const fileUrl = req.file
      ? `/uploads/papers/${req.file.filename}`
      : null;

    if (!fileUrl) {
      return res.status(400).json({ message: 'PDF file is required' });
    }

    const result = await dbRun(
      'INSERT INTO exam_papers (title, subject, branch, year, file_url, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
      [title, subject, branch, parseInt(year), fileUrl, req.user.id]
    );

    await logActivity(req.user.id, 'UPLOAD_EXAM_PAPER', `Uploaded exam paper: "${title}" (${branch} - ${subject} ${year})`);

    res.status(201).json({ id: result.id, message: 'Exam paper uploaded successfully' });
  } catch (err) {
    console.error('Exam Paper Upload Error:', err.message);
    res.status(500).json({ message: 'Failed to upload exam paper' });
  }
});

// DELETE /api/exam-papers/:id (librarian/admin only)
router.delete('/:id', authenticateJWT, requireRole(['librarian', 'admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const paper = await dbGet('SELECT * FROM exam_papers WHERE id = ?', [id]);
    if (!paper) return res.status(404).json({ message: 'Exam paper not found' });

    await dbRun('DELETE FROM exam_papers WHERE id = ?', [id]);
    await logActivity(req.user.id, 'DELETE_EXAM_PAPER', `Deleted exam paper: "${paper.title}" (ID: ${id})`);
    res.json({ message: 'Exam paper deleted successfully' });
  } catch (err) {
    console.error('Exam Paper Delete Error:', err.message);
    res.status(500).json({ message: 'Failed to delete exam paper' });
  }
});

export default router;
