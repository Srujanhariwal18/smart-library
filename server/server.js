import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routers
import authRouter from './routes/auth.js';
import booksRouter from './routes/books.js';
import borrowsRouter from './routes/borrows.js';
import reservationsRouter from './routes/reservations.js';
import reviewsRouter from './routes/reviews.js';
import notificationsRouter from './routes/notifications.js';
import adminRouter from './routes/admin.js';
import exampapersRouter from './routes/exampapers.js';
import announcementsRouter from './routes/announcements.js';

// Import cron scheduler
import { initCronScheduler } from './cron/reminders.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded covers and ebooks as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve a default placeholder image if it doesn't exist
const placeholderPath = path.join(__dirname, 'uploads/covers/placeholder.jpg');
if (!fs.existsSync(placeholderPath)) {
  // Ensure directory exists
  fs.mkdirSync(path.dirname(placeholderPath), { recursive: true });
  // Create a simple blank placeholder or write a dummy text file
  fs.writeFileSync(placeholderPath, '');
}

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/books', booksRouter);
app.use('/api/borrows', borrowsRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api', reviewsRouter); // mounts /wishlist and /books/:id/review
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/exam-papers', exampapersRouter);
app.use('/api/announcements', announcementsRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Express Error Handler:', err.stack || err.message || err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error'
  });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Smart Library backend running on port ${PORT}`);
  
  // Start cron scheduler for email reminders
  initCronScheduler();
});
