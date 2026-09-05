const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Secure all user routes
router.use(authenticateToken);

// 0. GET /me - Get current user profile (Accessible to all authenticated users)
router.get('/me', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT user_id, name, role, username, is_active FROM users WHERE user_id = $1',
      [req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Rename user_id to id to match what frontend expects
    const user = result.rows[0];
    res.json({ id: user.user_id, ...user });
  } catch (err) {
    console.error('Failed to fetch profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rest of routes: Only admins can manage system users
router.use(authorizeRole('admin'));

// 1. GET / - List all users (excluding password hashes)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT user_id, name, role, username, is_active FROM users ORDER BY user_id ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to retrieve users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. POST / - Create a new user account
router.post('/', async (req, res) => {
  const { name, role, username, password } = req.body;

  // Basic validation
  if (!name || !role || !username || !password) {
    return res.status(400).json({ error: 'All fields (name, role, username, password) are required.' });
  }

  const trimmedName = name.toString().trim();
  const trimmedUsername = username.toString().trim();

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const validRoles = ['admin', 'accountant', 'staff'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role assignment. Allowed values: admin, accountant, staff.' });
  }

  try {
    // Check if username is already taken (case-insensitive)
    const userCheck = await pool.query(
      'SELECT 1 FROM users WHERE LOWER(TRIM(username)) = LOWER($1)',
      [trimmedUsername]
    );
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: `Username '${trimmedUsername}' is already registered.` });
    }

    // Hash the password using bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (name, role, username, password_hash, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING user_id, name, role, username, is_active`,
      [trimmedName, role, trimmedUsername, passwordHash]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to create user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. PUT /:id - Edit an existing user (name, role, username, is_active, password)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, role, username, password, is_active } = req.body;

  if (!name || !role || !username) {
    return res.status(400).json({ error: 'Name, role, and username are required.' });
  }

  const trimmedName = name.toString().trim();
  const trimmedUsername = username.toString().trim();

  const validRoles = ['admin', 'accountant', 'staff'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role assignment. Allowed values: admin, accountant, staff.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Confirm user exists
    const userQuery = await client.query('SELECT * FROM users WHERE user_id = $1', [id]);
    if (userQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    // 2. Prevent deactivating the last remaining admin
    if (is_active === false && role === 'admin') {
      const adminCountQuery = await client.query(
        "SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = TRUE"
      );
      const activeAdmins = parseInt(adminCountQuery.rows[0].count);
      const originalUser = userQuery.rows[0];

      if (originalUser.role === 'admin' && originalUser.is_active === true && activeAdmins <= 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Security Lockout: Cannot deactivate the last remaining active Administrator.' });
      }
    }

    // 3. Prevent username collision (case-insensitive)
    const nameCollision = await client.query(
      'SELECT 1 FROM users WHERE LOWER(TRIM(username)) = LOWER($1) AND user_id != $2',
      [trimmedUsername, id]
    );
    if (nameCollision.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Username '${trimmedUsername}' is already taken by another account.` });
    }

    let result;
    const isActiveVal = is_active !== false; // Convert to boolean safely

    if (password && password.trim() !== '') {
      if (password.length < 6) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }
      // If a password change was supplied, hash it and update everything
      const saltRounds = 10;
      const newHash = await bcrypt.hash(password, saltRounds);

      result = await client.query(
        `UPDATE users 
         SET name = $1, role = $2, username = $3, password_hash = $4, is_active = $5
         WHERE user_id = $6
         RETURNING user_id, name, role, username, is_active`,
        [trimmedName, role, trimmedUsername, newHash, isActiveVal, id]
      );
    } else {
      // Otherwise, update properties without modifying credentials
      result = await client.query(
        `UPDATE users 
         SET name = $1, role = $2, username = $3, is_active = $4
         WHERE user_id = $5
         RETURNING user_id, name, role, username, is_active`,
        [trimmedName, role, trimmedUsername, isActiveVal, id]
      );
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to update user:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// 4. DELETE /:id - Soft-deactivate/toggle user status
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userQuery = await client.query('SELECT role, is_active FROM users WHERE user_id = $1', [id]);
    if (userQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = userQuery.rows[0];

    // Prevent deactivating the last admin
    if (targetUser.role === 'admin' && targetUser.is_active) {
      const adminCountQuery = await client.query(
        "SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = TRUE"
      );
      const activeAdmins = parseInt(adminCountQuery.rows[0].count);
      if (activeAdmins <= 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Security Lockout: Cannot deactivate the last remaining active Administrator.' });
      }
    }

    // Toggle the status
    const newStatus = !targetUser.is_active;
    const result = await client.query(
      'UPDATE users SET is_active = $1 WHERE user_id = $2 RETURNING user_id, name, role, username, is_active',
      [newStatus, id]
    );

    await client.query('COMMIT');
    res.json({ message: `User status successfully toggled to ${newStatus ? 'Active' : 'Deactivated'}`, user: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to toggle user status:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
