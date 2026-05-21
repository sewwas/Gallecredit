const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Get guarantors for a loan
router.get('/loan/:loanId', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM guarantors WHERE loan_id = $1', [req.params.loanId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add guarantor
router.post('/', async (req, res) => {
  const { loan_id, name, nic, phone, address } = req.body;
  if (!loan_id || !name || !nic) return res.status(400).json({ error: 'Missing required fields' });
  
  try {
    const result = await pool.query(
      'INSERT INTO guarantors (loan_id, name, nic, phone, address) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [loan_id, name, nic, phone, address]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
