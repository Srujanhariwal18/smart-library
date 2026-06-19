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
