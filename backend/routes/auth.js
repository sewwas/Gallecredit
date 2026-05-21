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

module.exports = router;
