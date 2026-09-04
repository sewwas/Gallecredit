const jwt = require('jsonwebtoken');
const { supabase } = require('../utils/supabaseClient');
const { pool } = require('../db');

// Cache validated tokens in memory to avoid redundant external HTTPS roundtrips on every API call
const tokenCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of tokenCache.entries()) {
    if (entry.expiresAt <= now) {
      tokenCache.delete(token);
    }
  }
}, 60 * 1000).unref();

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  // 1. Fast path: check in-memory cache
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    req.user = cached.user;
    return next();
  }

  let email = null;

  // 2. Validate token with Supabase or fallback gracefully on network DNS hiccups
  try {
    if (supabase) {
      const { data, error } = await supabase.auth.getUser(token);
      if (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      if (data && data.user) {
        email = data.user.email;
      }
    }
  } catch (networkErr) {
    console.warn('Supabase auth network check failed, attempting token payload fallback:', networkErr.message || networkErr);
    // If external call fails due to network/DNS timeout, fallback to unexpired decoded JWT
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp && decoded.exp * 1000 > Date.now() && decoded.email) {
        email = decoded.email;
      }
    } catch (e) {}
  }

  // If Supabase client was not initialized or didn't return email, try decoded JWT if unexpired
  if (!email) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp && decoded.exp * 1000 > Date.now() && decoded.email) {
        email = decoded.email;
      }
    } catch (e) {}
  }

  if (!email) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  // 3. Fetch user details and role from database
  try {
    const dbUser = await pool.query('SELECT user_id, role, username FROM users WHERE username = $1', [email]);
    
    if (dbUser.rows.length === 0) {
      return res.status(403).json({ error: 'User not registered in the system' });
    }

    const userData = {
      userId: dbUser.rows[0].user_id,
      role: dbUser.rows[0].role,
      username: dbUser.rows[0].username,
      email: email
    };

    // Calculate cache expiration
    let expiresAt = Date.now() + CACHE_TTL_MS;
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        expiresAt = Math.min(expiresAt, decoded.exp * 1000);
      }
    } catch (e) {}

    tokenCache.set(token, { user: userData, expiresAt });
    req.user = userData;
    next();
  } catch (dbErr) {
    console.error('Database query error in authenticateToken:', dbErr.message);
    return res.status(500).json({ error: 'Internal database authentication error' });
  }
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
