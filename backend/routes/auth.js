const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { sendOTPEmail } = require('../utils/email');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (user.is_active === false) {
      return res.status(403).json({ error: 'Security alert: Your employee account has been deactivated. Contact an administrator.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const secret = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'supersecretjwtkey_please_change_in_production' : null);
    if (!secret) {
      return res.status(500).json({ error: 'Server configuration error: missing JWT_SECRET' });
    }

    const token = jwt.sign(
      { userId: user.user_id, user_id: user.user_id, role: user.role, username: user.username },
      secret,
      { expiresIn: '8h' }
    );

    res.json({ token, user: { id: user.user_id, username: user.username, role: user.role, name: user.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /send-otp - Generate & send OTP via email
router.post('/send-otp', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username (Email) is required.' });
  }

  try {
    // Check if the user exists
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'No user account found with that username.' });
    }

    if (user.is_active === false) {
      return res.status(403).json({ error: 'This account is deactivated.' });
    }

    // Generate a secure 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save OTP to DB
    await pool.query(
      'UPDATE users SET reset_otp = $1, reset_otp_expires_at = $2 WHERE username = $3',
      [otp, expiresAt, username]
    );

    // Send email
    const emailResult = await sendOTPEmail(username, otp);

    res.json({
      message: 'A secure 6-digit recovery code has been sent to your email address.',
      devOtp: (process.env.NODE_ENV !== 'production' && emailResult.development) ? otp : null
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /reset-password - Reset password using OTP
router.post('/reset-password', async (req, res) => {
  const { username, otp, newPassword } = req.body;

  if (!username || !otp || !newPassword) {
    return res.status(400).json({ error: 'Username, OTP, and newPassword are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  try {
    // Check user & verify OTP
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'No user account found.' });
    }

    if (user.is_active === false) {
      return res.status(403).json({ error: 'This account is deactivated.' });
    }

    if (!user.reset_otp || user.reset_otp !== otp.toString().trim()) {
      return res.status(400).json({ error: 'Invalid verification OTP code. Please try again.' });
    }

    const expiresAt = new Date(user.reset_otp_expires_at);
    if (expiresAt < new Date()) {
      return res.status(400).json({ error: 'The verification OTP code has expired. Please request a new code.' });
    }

    // Hash the new password
    const saltRounds = 10;
    const newHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear OTP
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_otp = NULL, reset_otp_expires_at = NULL WHERE username = $2',
      [newHash, username]
    );

    res.json({ message: 'Password reset successful! You can now log in with your new password.' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;


