const jwt = require('jsonwebtoken');
const { supabase } = require('../utils/supabaseClient');
const { pool } = require('../db');

// Cache validated tokens in memory to avoid redundant external HTTPS roundtrips on every API call
const tokenCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const invalidateUserCache = (userId) => {
  if (!userId) return;
  const targetId = Number(userId);
  for (const [token, entry] of tokenCache.entries()) {
    if (Number(entry.user?.userId || entry.user?.user_id) === targetId) {
      tokenCache.delete(token);
    }
  }
};

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

  const secret = process.env.JWT_SECRET || 'supersecretjwtkey_please_change_in_production';

  // 2. Try verifying as local backend-issued JWT
  try {
    const decoded = jwt.verify(token, secret);
    if (decoded && (decoded.userId || decoded.user_id || decoded.username)) {
      const userLookup = decoded.userId || decoded.user_id;
      let dbUser;
      if (userLookup) {
        dbUser = await pool.query(
          'SELECT user_id, role, username, is_active FROM users WHERE user_id = $1',
          [userLookup]
        );
      } else {
        dbUser = await pool.query(
          'SELECT user_id, role, username, is_active FROM users WHERE LOWER(TRIM(username)) = LOWER(TRIM($1))',
          [decoded.username]
        );
      }

      if (dbUser.rows.length === 0) {
        return res.status(403).json({ error: 'User not registered in the system' });
      }

      if (dbUser.rows[0].is_active === false) {
        return res.status(403).json({ error: 'User account has been deactivated' });
      }

      const u = dbUser.rows[0];
      const userData = {
        userId: u.user_id,
        role: u.role,
        username: u.username,
        email: decoded.email || u.username
      };

      const expiresAt = decoded.exp ? decoded.exp * 1000 : Date.now() + CACHE_TTL_MS;
      tokenCache.set(token, { user: userData, expiresAt: Math.min(Date.now() + CACHE_TTL_MS, expiresAt) });
      req.user = userData;
      return next();
    }
  } catch (jwtErr) {
    // If not valid with local secret, fall through to Supabase token verification below
  }

  // 3. Fallback: Validate token with Supabase (for existing sessions or external logins)
  let email = null;
  try {
    if (supabase) {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data && data.user) {
        email = data.user.email;
      }
    }
  } catch (networkErr) {
    console.warn('Supabase auth network check failed, attempting token payload fallback:', networkErr.message || networkErr);
  }

  // If Supabase client was not initialized or didn't return email, try decoded JWT if unexpired
  if (!email) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp && decoded.exp * 1000 > Date.now() && (decoded.email || decoded.username)) {
        email = decoded.email || decoded.username;
      }
    } catch (e) {}
  }

  if (!email) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  // 4. Fetch user details and role from database
  try {
    const dbUser = await pool.query(
      'SELECT user_id, role, username, is_active FROM users WHERE LOWER(TRIM(username)) = LOWER(TRIM($1))',
      [email]
    );
    
    if (dbUser.rows.length === 0) {
      return res.status(403).json({ error: 'User not registered in the system' });
    }

    if (dbUser.rows[0].is_active === false) {
      return res.status(403).json({ error: 'User account has been deactivated' });
    }

    const u = dbUser.rows[0];
    const userData = {
      userId: u.user_id,
      role: u.role,
      username: u.username,
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
    return next();
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

module.exports = { authenticateToken, authorizeRole, invalidateUserCache };
