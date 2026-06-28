-- ============================================================
-- SMART LIBRARY — NEW FEATURES MIGRATION
-- Run this AFTER the main supabase_schema.sql
-- Do NOT modify supabase_schema.sql itself.
-- ============================================================

-- Feature 5: Exam Papers table
CREATE TABLE IF NOT EXISTS exam_papers (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    branch TEXT NOT NULL,
    year INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Feature 11: Announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    message TEXT NOT NULL,
    target_role TEXT NOT NULL CHECK(target_role IN ('student', 'teacher', 'librarian', 'admin', 'all')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Feature 12: Add preferences JSONB column to users (idempotent via DO block)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'preferences'
    ) THEN
        ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}';
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exam_papers_branch ON exam_papers(branch);
CREATE INDEX IF NOT EXISTS idx_exam_papers_subject ON exam_papers(subject);
CREATE INDEX IF NOT EXISTS idx_exam_papers_year ON exam_papers(year);
CREATE INDEX IF NOT EXISTS idx_announcements_role ON announcements(target_role);
CREATE INDEX IF NOT EXISTS idx_announcements_expires ON announcements(expires_at);
