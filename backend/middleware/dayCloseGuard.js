const { pool } = require('../db');

/**
 * Day Close Guard Middleware
 * Prevents modifications to transactions if the date is already closed.
 */
const dayCloseGuard = async (req, res, next) => {
  // Extract date from request body or params
  // For Payments, Expenses, and Income, the date is typically in req.body.date
  // If not provided, assume CURRENT_DATE
  const targetDate = req.body.date || new Date().toISOString().split('T')[0];

  try {
    const result = await pool.query('SELECT 1 FROM day_closes WHERE date = $1', [targetDate]);
    
    if (result.rows.length > 0) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: `Transactions for ${targetDate} are locked because the day has been closed.` 
      });
    }
    
    next();
  } catch (err) {
    console.error('Day Close Guard Error:', err);
    next(); // Fail open for safety, or next(err) for strictness
  }
};

module.exports = { dayCloseGuard };
