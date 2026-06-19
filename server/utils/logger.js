import { dbRun } from '../config/db.js';

/**
 * Log user activity into the database.
 * @param {number|null} userId - ID of the user performing the action, or null if system/unauthenticated
 * @param {string} action - Brief description of action (e.g. 'LOGIN', 'BORROW_BOOK')
 * @param {string} details - Detailed information about the action
 */
export const logActivity = async (userId, action, details) => {
  try {
    await dbRun(
      'INSERT INTO user_activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, action, details]
    );
  } catch (err) {
    console.error('Failed to log user activity:', err.message);
  }
};

/**
 * Create an in-app notification for a user.
 * @param {number} userId - ID of the user to receive the notification
 * @param {string} message - Notification text
 */
export const createNotification = async (userId, message) => {
  try {
    await dbRun(
      'INSERT INTO notifications (user_id, message, is_read) VALUES (?, ?, 0)',
      [userId, message]
    );
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};
