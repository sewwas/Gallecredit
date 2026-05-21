const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { dayCloseGuard } = require('../middleware/dayCloseGuard');

router.use(authenticateToken);
router.use(authorizeRole('admin', 'accountant'));

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM income ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', dayCloseGuard, async (req, res) => {
  const { date, source, amount } = req.body;
  
  if (!date || !source || !amount) {
    return res.status(400).json({ error: 'Date, source, and amount are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const incomeAmount = parseFloat(amount);
    
    // Insert income
    const result = await client.query(
      'INSERT INTO income (date, source, amount) VALUES ($1, $2, $3) RETURNING *',
      [date, source, incomeAmount]
    );
    
    // Update cash book with running balance calculation
    const lastCashBookQuery = await client.query('SELECT balance_after FROM cash_book ORDER BY transaction_id DESC LIMIT 1 FOR UPDATE');
    const lastBalance = lastCashBookQuery.rows.length > 0 ? parseFloat(lastCashBookQuery.rows[0].balance_after || 0) : 0;
    const newBalance = lastBalance + incomeAmount;

    await client.query(
      `INSERT INTO cash_book (type, amount, source, reference_id, balance_after) 
       VALUES ('IN', $1, 'other_income', $2, $3)`,
      [incomeAmount, result.rows[0].income_id, newBalance]
    );

    // Double-Entry Ledger Hook
    try {
      const { postJournalEntry } = require('../utils/ledger');
      await postJournalEntry(client, {
        reference_source: 'other_income',
        reference_id: result.rows[0].income_id,
        description: `Other income source: ${source}`,
        created_by: req.user.userId,
        lines: [
          { account_code: '1100', debit: incomeAmount, credit: 0 },  // Debit Central Branch Cash Safe
          { account_code: '4300', debit: 0, credit: incomeAmount }   // Credit Other income (Fees)
        ]
      });
    } catch (ledgerErr) {
      console.error('Ledger income post failed:', ledgerErr.message);
    }

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
