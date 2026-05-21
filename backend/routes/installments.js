const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Get installments for a specific loan
router.get('/loan/:loanId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM installments WHERE loan_id = $1 ORDER BY due_date ASC',
      [req.params.loanId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
