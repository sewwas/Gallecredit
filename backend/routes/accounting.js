const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.use(authenticateToken);
router.use(authorizeRole('admin', 'accountant'));

// Get Day Close Status and Summary
router.get('/status/:date', async (req, res) => {
  const { date } = req.params;
  try {
    const status = await pool.query('SELECT * FROM day_closes WHERE date = $1', [date]);
    
    // Get summary for the day regardless of status
    const summary = await pool.query(`
      SELECT 
        SUM(CASE WHEN type = 'IN' THEN amount ELSE 0 END) as total_in,
        SUM(CASE WHEN type = 'OUT' THEN amount ELSE 0 END) as total_out
      FROM cash_book 
      WHERE DATE(date) = $1
    `, [date]);

    res.json({
      isClosed: status.rows.length > 0,
      closeData: status.rows[0] || null,
      summary: {
        total_in: summary.rows[0].total_in || 0,
        total_out: summary.rows[0].total_out || 0,
        balance: (summary.rows[0].total_in || 0) - (summary.rows[0].total_out || 0)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Close a day
router.post('/close', async (req, res) => {
  const { date, total_in, total_out, balance } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  try {
    const closedBy = req.user ? (req.user.user_id || req.user.userId) : null;
    const result = await pool.query(
      'INSERT INTO day_closes (date, closed_by_id, total_in, total_out, closing_balance) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [date, closedBy, total_in, total_out, balance]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'This day is already closed' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /accounts - List Chart of Accounts
router.get('/accounts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM chart_of_accounts ORDER BY account_code ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch accounts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /journals - List all journal entries with their balanced ledger lines
router.get('/journals', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
          je.journal_id,
          je.transaction_date,
          je.reference_source,
          je.reference_id,
          je.description,
          u.name as operator_name,
          jl.line_id,
          jl.account_code,
          coa.account_name,
          jl.debit,
          jl.credit
      FROM journal_entries je
      LEFT JOIN users u ON je.created_by = u.user_id
      JOIN journal_lines jl ON je.journal_id = jl.journal_id
      JOIN chart_of_accounts coa ON jl.account_code = coa.account_code
      ORDER BY je.transaction_date DESC, je.journal_id DESC, jl.line_id ASC
    `);

    const journalsMap = {};
    result.rows.forEach(row => {
      if (!journalsMap[row.journal_id]) {
        journalsMap[row.journal_id] = {
          journal_id: row.journal_id,
          transaction_date: row.transaction_date,
          reference_source: row.reference_source,
          reference_id: row.reference_id,
          description: row.description,
          operator_name: row.operator_name,
          lines: []
        };
      }
      journalsMap[row.journal_id].lines.push({
        line_id: row.line_id,
        account_code: row.account_code,
        account_name: row.account_name,
        debit: parseFloat(row.debit),
        credit: parseFloat(row.credit)
      });
    });

    res.json(Object.values(journalsMap));
  } catch (err) {
    console.error('Failed to fetch journal lines:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
