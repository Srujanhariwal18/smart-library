import jwt from 'jsonwebtoken';
import { dbGet, dbRun } from '../config/db.js';
import { createClerkClient } from '@clerk/backend';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretlibrarykey123!';

const clerkClient = process.env.CLERK_SECRET_KEY 
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY }) 
  : null;

// Middleware to authenticate JWT token (supports Clerk & local fallback)
export const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];

  if (clerkClient) {
    try {
      const verified = await clerkClient.tokens.verifyToken(token);
      const clerkUserId = verified.sub;

      let user = await dbGet('SELECT id, email, role, status FROM users WHERE clerk_id = ?', [clerkUserId]);
      
      if (!user) {
        // Sync user with local DB on first login
        try {
          const clerkUser = await clerkClient.users.getUser(clerkUserId);
          const email = clerkUser.emailAddresses[0]?.emailAddress;
          const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || clerkUser.username || 'Clerk User';
          
          user = await dbGet('SELECT id, email, role, status FROM users WHERE email = ?', [email]);
          
          if (user) {
            await dbRun('UPDATE users SET clerk_id = ? WHERE id = ?', [clerkUserId, user.id]);
            user.clerk_id = clerkUserId;
          } else {
            const role = clerkUser.publicMetadata?.role || 'student';
            const { id } = await dbRun(
              'INSERT INTO users (name, email, role, status, clerk_id) VALUES (?, ?, ?, ?, ?)',
              [name, email, role, 'active', clerkUserId]
            );
            user = { id, email, role, status: 'active', clerk_id: clerkUserId };
          }
        } catch (syncErr) {
          console.error('Clerk Sync Error:', syncErr.message);
          return res.status(500).json({ message: 'User sync failed' });
        }
      }

      if (user.status === 'suspended') {
        return res.status(403).json({ message: 'Your account is suspended. Please contact administration.' });
      }

      req.user = user;
      return next();
    } catch (clerkErr) {
      console.warn('Clerk token verification bypassed or failed:', clerkErr.message);
    }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if the user still exists and is active
    const user = await dbGet('SELECT id, email, role, status FROM users WHERE id = ?', [decoded.id]);
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account is suspended. Please contact administration.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('JWT Verification Error:', err.message);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to check if user has required roles
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};
