const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

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

    const token = jwt.sign(
      { userId: user.user_id, user_id: user.user_id, role: user.role, username: user.username },
      process.env.JWT_SECRET || 'supersecretjwtkey_please_change_in_production',
      { expiresIn: '8h' }
    );

    res.json({ token, user: { id: user.user_id, username: user.username, role: user.role, name: user.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /reset-password - Reset password using a recovery key
router.post('/reset-password', async (req, res) => {
  const { username, newPassword, recoveryKey } = req.body;

  if (!username || !newPassword || !recoveryKey) {
    return res.status(400).json({ error: 'All fields (username, newPassword, recoveryKey) are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  // Validate the recovery key
  const expectedKey = process.env.RECOVERY_KEY || 'CreditGalleReset2025';
  if (recoveryKey !== expectedKey) {
    return res.status(400).json({ error: 'Invalid security recovery key.' });
  }

  try {
    // Check if the user exists
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'No user account found with that username.' });
    }

    if (user.is_active === false) {
      return res.status(403).json({ error: 'This account is deactivated and cannot be reset.' });
    }

    // Hash the new password
    const saltRounds = 10;
    const newHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password in DB
    await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [newHash, username]);

    res.json({ message: 'Password reset successful! You can now log in with your new password.' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

