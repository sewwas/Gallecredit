const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.use(authenticateToken);
router.use(authorizeRole('admin', 'accountant'));

router.get('/', async (req, res) => {
  try {
    // We calculate a running balance in SQL or fetch ordered data. 
    // For simplicity, we just fetch ordered by date desc.
    const result = await pool.query('SELECT * FROM cash_book ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
