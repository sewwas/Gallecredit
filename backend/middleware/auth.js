const { supabase } = require('../utils/supabaseClient');
const { pool } = require('../db');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  // Validate the token against Supabase (frontend uses Supabase session tokens,
  // not tokens signed with our custom JWT_SECRET, so we must use getUser()).
  const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

  if (error || !supabaseUser) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  const email = supabaseUser.email;

  // Fetch the role from our custom users table since Supabase users don't have roles by default
  const dbUser = await pool.query('SELECT user_id, role, username FROM users WHERE username = $1', [email]);
  
  if (dbUser.rows.length === 0) {
    return res.status(403).json({ error: 'User not registered in the system' });
  }

  req.user = {
    userId: dbUser.rows[0].user_id,
    role: dbUser.rows[0].role,
    username: dbUser.rows[0].username,
    email: email
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
