import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { dbAll, dbRun } from '../config/db.js';

let transporter;

// Create mail transporter (auto-generate Ethereal account if no env credentials)
async function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
    console.log('Nodemailer SMTP Transporter configured using env credentials.');
  } else {
    // Generate Ethereal mock SMTP account
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('--------------------------------------------------');
      console.log('Nodemailer: Mock Ethereal Email Account Created!');
      console.log(`User: ${testAccount.user}`);
      console.log(`Pass: ${testAccount.pass}`);
      console.log('--------------------------------------------------');
    } catch (err) {
      console.error('Failed to create Nodemailer test account:', err.message);
    }
  }

  return transporter;
}

// Check for due dates and send emails
export async function sendDueReminders() {
  console.log('Running daily due date check and reminder service...');
  try {
    const mailClient = await getTransporter();
    if (!mailClient) return;

    // Get active borrows due in next 24-48 hours, or already overdue
    // status is 'borrowed', and due_date <= now + 2 days
    const borrows = await dbAll(`
      SELECT b.*, bk.title, u.name as user_name, u.email as user_email
      FROM borrows b
      JOIN books bk ON b.book_id = bk.id
      JOIN users u ON b.user_id = u.id
      WHERE b.status = 'borrowed' AND datetime(b.due_date) <= datetime('now', '+2 days')
    `);

    console.log(`Found ${borrows.length} borrows requiring reminders.`);

    for (const b of borrows) {
      const dueDate = new Date(b.due_date);
      const today = new Date();
      const isOverdue = today > dueDate;
      
      let subject = '';
      let htmlContent = '';

      if (isOverdue) {
        // Mark as overdue in DB if it was still status 'borrowed'
        await dbRun('UPDATE borrows SET status = \'overdue\' WHERE id = ?', [b.id]);
        
        subject = `⚠️ OVERDUE LIBRARY BOOK ALERT: ${b.title}`;
        htmlContent = `
          <h3>Hello ${b.user_name},</h3>
          <p>This is a notification that the book <strong>"${b.title}"</strong> was due on <strong>${dueDate.toLocaleDateString()}</strong> and is now overdue.</p>
          <p>Please return it to the library as soon as possible. Overdue books are subject to a daily fine of 5 credits.</p>
          <br>
          <p>Best regards,<br>Smart College Library System</p>
        `;
      } else {
        subject = `🔔 Reminder: Library Book Due Soon - ${b.title}`;
        htmlContent = `
          <h3>Hello ${b.user_name},</h3>
          <p>This is a friendly reminder that the book <strong>"${b.title}"</strong> is due back to the library on <strong>${dueDate.toLocaleDateString()}</strong>.</p>
          <p>If you need more time, you can renew the borrow online through your student portal (subject to renewal limits and queue availability).</p>
          <br>
          <p>Best regards,<br>Smart College Library System</p>
        `;
      }

      const info = await mailClient.sendMail({
        from: '"Smart College Library" <no-reply@smartlibrary.edu>',
        to: b.user_email,
        subject,
        html: htmlContent
      });

      console.log(`Email sent to ${b.user_email} for book "${b.title}".`);
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`Email Preview URL: ${previewUrl}`);
      }
    }
  } catch (err) {
    console.error('Error in sendDueReminders job:', err.message);
  }
}

// Schedule cron job to run daily at 00:00 (Midnight)
export const initCronScheduler = () => {
  // For easy testing, let's run it once at server startup as well
  sendDueReminders();

  // Run daily
  cron.schedule('0 0 * * *', () => {
    sendDueReminders();
  });
  console.log('Daily cron scheduler for overdue emails initialized.');
};
