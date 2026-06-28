-- Allow admin email to have flexible role
-- Remove unique role constraint if any
UPDATE users 
SET role = 'admin' 
WHERE email = 'srujanhariwal464@gmail.com';

-- Make sure teacher is set correctly  
UPDATE users
SET role = 'teacher'
WHERE email = 'srujanhariwal18@gmail.com';

-- Verify
SELECT email, role FROM users;
