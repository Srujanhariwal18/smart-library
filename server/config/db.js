import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB file is located in the database/ directory
const DB_PATH = path.resolve(__dirname, '../../database/database.sqlite');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error connecting to SQLite Database:', err.message);
  } else {
    console.log('Connected to the SQLite database at:', DB_PATH);
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON;', (err) => {
      if (err) console.error('Failed to enable foreign keys:', err.message);
    });
    // Add clerk_id column if it doesn't exist
    db.run('ALTER TABLE users ADD COLUMN clerk_id TEXT UNIQUE;', (err) => {
      if (err) {
        if (!err.message.includes('duplicate column name') && !err.message.includes('already exists')) {
          console.error('Failed to migrate users table for clerk_id:', err.message);
        }
      } else {
        console.log('Database users table migrated with clerk_id successfully.');
      }
    });
    // Add preferences column if it doesn't exist
    db.run('ALTER TABLE users ADD COLUMN preferences TEXT;', (err) => {
      if (err) {
        if (!err.message.includes('duplicate column name') && !err.message.includes('already exists')) {
          console.error('Failed to migrate users table for preferences:', err.message);
        }
      } else {
        console.log('Database users table migrated with preferences successfully.');
      }
    });
    // Create new tables if they don't exist (migrations)
    db.run(`
      CREATE TABLE IF NOT EXISTS exam_papers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        subject TEXT NOT NULL,
        branch TEXT NOT NULL,
        year INTEGER NOT NULL,
        file_url TEXT NOT NULL,
        uploaded_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
      );
    `, (err) => {
      if (err) console.error('Failed to migrate/create exam_papers table:', err.message);
      else console.log('SQLite exam_papers table verified/created.');
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        target_role TEXT NOT NULL CHECK(target_role IN ('student', 'teacher', 'librarian', 'admin', 'all')),
        expires_at DATETIME,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      );
    `, (err) => {
      if (err) console.error('Failed to migrate/create announcements table:', err.message);
      else console.log('SQLite announcements table verified/created.');
    });
  }
});

// Helper for db.get (promisified)
export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Helper for db.all (promisified)
export const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Helper for db.run (promisified)
export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

// Helper for running queries in a serialized transaction
export const dbTransaction = (actions) => {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        await dbRun('BEGIN TRANSACTION');
        const result = await actions();
        await dbRun('COMMIT');
        resolve(result);
      } catch (err) {
        await dbRun('ROLLBACK');
        reject(err);
      }
    });
  });
};

export default db;
