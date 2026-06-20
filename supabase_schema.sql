-- SUPABASE SMART LIBRARY SCHEMA & SEED DATA
-- Copy and run this script in the SQL Editor of your Supabase Dashboard.

-- 1. DROP EXISTING TABLES (Optional, for fresh start)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS user_activity_logs CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS wishlists CASCADE;
DROP TABLE IF EXISTS ebooks CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS borrows CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS authors CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. CREATE TABLES

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('student', 'teacher', 'librarian', 'admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
    clerk_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories Table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

-- Authors Table
CREATE TABLE authors (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    biography TEXT
);

-- Books Table
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    isbn TEXT UNIQUE NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    author_id INTEGER REFERENCES authors(id) ON DELETE SET NULL,
    publication_year INTEGER,
    description TEXT,
    cover_image TEXT,
    total_copies INTEGER NOT NULL DEFAULT 1 CHECK(total_copies >= 0),
    available_copies INTEGER NOT NULL DEFAULT 1 CHECK(available_copies >= 0 AND available_copies <= total_copies),
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Borrows Table
CREATE TABLE borrows (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    borrow_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    return_date TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'borrowed' CHECK(status IN ('borrowed', 'returned', 'overdue')),
    fine_amount REAL DEFAULT 0.0 CHECK(fine_amount >= 0),
    renewal_count INTEGER DEFAULT 0 CHECK(renewal_count >= 0)
);

-- Reservations Table
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    reservation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'fulfilled', 'cancelled', 'expired')),
    waitlist_position INTEGER DEFAULT 1
);

-- Ebooks Table
CREATE TABLE ebooks (
    id SERIAL PRIMARY KEY,
    book_id INTEGER UNIQUE REFERENCES books(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    download_count INTEGER DEFAULT 0
);

-- Wishlists Table
CREATE TABLE wishlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    UNIQUE(user_id, book_id)
);

-- Reviews Table
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, book_id)
);

-- User Activity Logs Table
CREATE TABLE user_activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0 CHECK(is_read IN (0, 1)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. SEED DATA

-- Seed Users
INSERT INTO users (name, email, role, status) VALUES 
('System Admin', 'admin@library.com', 'admin', 'active'),
('Jane Doe (Librarian)', 'librarian@library.com', 'librarian', 'active'),
('John Smith (Student)', 'student@library.com', 'student', 'active');

-- Seed Categories
INSERT INTO categories (name, description) VALUES 
('Science & Tech', 'Books on physics, computer science, and engineering.'),
('Literature & Fiction', 'Novels, drama, poetry, and stories.'),
('History & Geography', 'Historical facts, biographies, and geographical studies.'),
('Business & Economics', 'Finance, economics, marketing, and management.');

-- Seed Authors
INSERT INTO authors (name, biography) VALUES 
('Stephen Hawking', 'Theoretical physicist, cosmologist, and author.'),
('George Orwell', 'English novelist, essayist, journalist, and critic.'),
('Yuval Noah Harari', 'Israeli historian, philosopher, and professor.'),
('Adam Smith', 'Scottish philosopher and pioneer of political economy.'),
('J.K. Rowling', 'British author, best known for the Harry Potter fantasy series.');

-- Seed Books
INSERT INTO books (title, isbn, category_id, author_id, publication_year, description, cover_image, total_copies, available_copies, location) VALUES 
('A Brief History of Time', '9780553380163', 1, 1, 1998, 'A landmark volume in science writing by one of the great minds of our time, Stephen Hawking explores the secrets of the universe.', '/uploads/covers/brief_history.jpg', 5, 5, 'Rack S-1'),
('1984', '9780451524935', 2, 2, 1949, 'Winston Smith reins in his rebellion against Big Brother, who controls every action and thoughts of all citizens.', '/uploads/covers/1984.jpg', 4, 4, 'Rack L-3'),
('Sapiens: A Brief History of Humankind', '9780062316097', 3, 3, 2015, 'Sapiens tackles the biggest questions of history and of the modern world, written in plain and accessible language.', '/uploads/covers/sapiens.jpg', 3, 3, 'Rack H-2'),
('The Wealth of Nations', '9780553585971', 4, 4, 1776, 'A foundational work of modern economics, discussing the division of labor, productivity, and free markets.', '/uploads/covers/wealth_nations.jpg', 2, 2, 'Rack B-1'),
('Harry Potter and the Sorcerer''s Stone', '9780590353427', 2, 5, 1998, 'The first novel in the Harry Potter series, following a young wizard who discovers his magical heritage.', '/uploads/covers/harry_potter.jpg', 6, 6, 'Rack L-1');
