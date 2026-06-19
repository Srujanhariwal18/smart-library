import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'database.sqlite');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Make sure server/uploads folders exist
const uploadDirs = [
  path.join(__dirname, '../server/uploads'),
  path.join(__dirname, '../server/uploads/covers'),
  path.join(__dirname, '../server/uploads/ebooks')
];

for (const dir of uploadDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

// Connect to SQLite
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error connecting to SQLite:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
  initializeDatabase();
});

async function initializeDatabase() {
  try {
    // Read schema
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');

    // SQLite runs multiple statements using serialized mode or db.exec
    db.serialize(async () => {
      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON;');

      // Run schema statements
      db.exec(schemaSql, async (err) => {
        if (err) {
          console.error('Error executing schema:', err.message);
          db.close();
          process.exit(1);
        }
        console.log('Database tables created successfully.');
        await seedData();
      });
    });
  } catch (err) {
    console.error('Initialization error:', err);
    db.close();
  }
}

async function seedData() {
  console.log('Seeding initial data...');

  try {
    // 1. Seed Users
    const adminPasswordHash = await bcrypt.hash('adminpassword', 10);
    const librarianPasswordHash = await bcrypt.hash('librarianpassword', 10);
    const studentPasswordHash = await bcrypt.hash('studentpassword', 10);

    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (name, email, password_hash, role, status)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertUser.run('System Admin', 'admin@library.com', adminPasswordHash, 'admin', 'active');
    insertUser.run('Jane Doe (Librarian)', 'librarian@library.com', librarianPasswordHash, 'librarian', 'active');
    insertUser.run('John Smith (Student)', 'student@library.com', studentPasswordHash, 'student', 'active');
    insertUser.finalize();
    console.log('Seeded users.');

    // 2. Seed Categories
    const categories = [
      { name: 'Science & Tech', description: 'Books on physics, computer science, and engineering.' },
      { name: 'Literature & Fiction', description: 'Novels, drama, poetry, and stories.' },
      { name: 'History & Geography', description: 'Historical facts, biographies, and geographical studies.' },
      { name: 'Business & Economics', description: 'Finance, economics, marketing, and management.' }
    ];

    const insertCategory = db.prepare(`
      INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)
    `);
    for (const cat of categories) {
      insertCategory.run(cat.name, cat.description);
    }
    insertCategory.finalize();
    console.log('Seeded categories.');

    // 3. Seed Authors
    const authors = [
      { name: 'Stephen Hawking', biography: 'Theoretical physicist, cosmologist, and author.' },
      { name: 'George Orwell', biography: 'English novelist, essayist, journalist, and critic.' },
      { name: 'Yuval Noah Harari', biography: 'Israeli historian, philosopher, and professor.' },
      { name: 'Adam Smith', biography: 'Scottish philosopher and pioneer of political economy.' },
      { name: 'J.K. Rowling', biography: 'British author, best known for the Harry Potter fantasy series.' }
    ];

    const insertAuthor = db.prepare(`
      INSERT OR IGNORE INTO authors (name, biography) VALUES (?, ?)
    `);
    for (const auth of authors) {
      insertAuthor.run(auth.name, auth.biography);
    }
    insertAuthor.finalize();
    console.log('Seeded authors.');

    // 4. Seed Books (We need to get the ids we just inserted. SQLite autoincrements, so we can assume ids 1-4 for categories and 1-5 for authors for a fresh DB)
    const books = [
      {
        title: 'A Brief History of Time',
        isbn: '9780553380163',
        category_id: 1, // Science & Tech
        author_id: 1,    // Stephen Hawking
        publication_year: 1998,
        description: 'A landmark volume in science writing by one of the great minds of our time, Stephen Hawking explores the secrets of the universe.',
        cover_image: '/uploads/covers/brief_history.jpg',
        total_copies: 5,
        available_copies: 5,
        location: 'Rack S-1'
      },
      {
        title: '1984',
        isbn: '9780451524935',
        category_id: 2, // Literature
        author_id: 2,    // George Orwell
        publication_year: 1949,
        description: 'Winston Smith reins in his rebellion against Big Brother, who controls every action and thoughts of all citizens.',
        cover_image: '/uploads/covers/1984.jpg',
        total_copies: 4,
        available_copies: 4,
        location: 'Rack L-3'
      },
      {
        title: 'Sapiens: A Brief History of Humankind',
        isbn: '9780062316097',
        category_id: 3, // History
        author_id: 3,    // Yuval Noah Harari
        publication_year: 2015,
        description: 'Sapiens tackles the biggest questions of history and of the modern world, written in plain and accessible language.',
        cover_image: '/uploads/covers/sapiens.jpg',
        total_copies: 3,
        available_copies: 3,
        location: 'Rack H-2'
      },
      {
        title: 'The Wealth of Nations',
        isbn: '9780553585971',
        category_id: 4, // Business
        author_id: 4,    // Adam Smith
        publication_year: 1776,
        description: 'A foundational work of modern economics, discussing the division of labor, productivity, and free markets.',
        cover_image: '/uploads/covers/wealth_nations.jpg',
        total_copies: 2,
        available_copies: 2,
        location: 'Rack B-1'
      },
      {
        title: 'Harry Potter and the Sorcerer\'s Stone',
        isbn: '9780590353427',
        category_id: 2, // Literature
        author_id: 5,    // J.K. Rowling
        publication_year: 1998,
        description: 'The first novel in the Harry Potter series, following a young wizard who discovers his magical heritage.',
        cover_image: '/uploads/covers/harry_potter.jpg',
        total_copies: 6,
        available_copies: 6,
        location: 'Rack L-1'
      }
    ];

    const insertBook = db.prepare(`
      INSERT OR IGNORE INTO books (title, isbn, category_id, author_id, publication_year, description, cover_image, total_copies, available_copies, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const bk of books) {
      insertBook.run(
        bk.title,
        bk.isbn,
        bk.category_id,
        bk.author_id,
        bk.publication_year,
        bk.description,
        bk.cover_image,
        bk.total_copies,
        bk.available_copies,
        bk.location
      );
    }
    insertBook.finalize();
    console.log('Seeded books.');

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Error seeding database:', err.message);
  } finally {
    db.close();
  }
}
