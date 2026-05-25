const { supabase } = require('../utils/supabaseClient');
const { pool } = require('../db');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // We mock the 'user' object to match what the old code expected
    var user = { email: decoded.email };
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token: ' + err.message });
  }


  // Fetch the role from our custom users table since Supabase users don't have roles by default
  const dbUser = await pool.query('SELECT user_id, role, username FROM users WHERE username = $1', [user.email]);
  
  if (dbUser.rows.length === 0) {
    return res.status(403).json({ error: 'User not registered in the system' });
  }

  req.user = {
    userId: dbUser.rows[0].user_id,
    role: dbUser.rows[0].role,
    username: dbUser.rows[0].username,
    email: user.email
  };
  
  next();
};

const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized role' });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRole };
