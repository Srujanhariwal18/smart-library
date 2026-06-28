-- Allow admin email to have flexible role
-- Remove unique role constraint if any
UPDATE users 
SET role = 'admin' 
WHERE email = 'your_admin_email@gmail.com';

-- Make sure teacher is set correctly  
UPDATE users
SET role = 'teacher'
WHERE email = 'your_teacher_email@gmail.com';

-- Verify
SELECT email, role FROM users;
