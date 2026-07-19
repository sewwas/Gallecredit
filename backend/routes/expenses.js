const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { dayCloseGuard } = require('../middleware/dayCloseGuard');

const expenseCategoryMap = {
  'Salary': '5101',
  'Allowance': '5102',
  'Stamp': '5103',
  'Fuel': '5104',
  'Card': '5105',
  'Photocopy': '5106',
  'Promissory': '5107',
  'Other': '5199'
};

router.use(authenticateToken);
router.use(authorizeRole('admin', 'accountant'));

// GET /api/expenses/summary
router.get('/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT category, SUM(amount) as total_amount
      FROM expenses
      GROUP BY category
      ORDER BY total_amount DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching expense summary:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'date';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const allowedSortColumns = ['date', 'category', 'amount'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'date';

    let queryStr = 'FROM expenses WHERE 1=1';
    const queryParams = [];
    
    if (search) {
      queryParams.push(`%${search}%`);
      queryStr += ` AND (category ILIKE $${queryParams.length} OR description ILIKE $${queryParams.length})`;
    }

    const countQuery = `SELECT COUNT(*) ${queryStr}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    queryParams.push(limit, offset);
    const dataQuery = `SELECT * ${queryStr} ORDER BY ${safeSortBy} ${sortOrder} LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;
    
    const result = await pool.query(dataQuery, queryParams);
    
    res.json({
      data: result.rows,
      total,
      page,
      limit
    });
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', dayCloseGuard, async (req, res) => {
  const { date, category, amount, description } = req.body;
  
  if (!date || !category || !amount) {
    return res.status(400).json({ error: 'Date, category, and amount are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const expenseAmount = parseFloat(amount);
    
    // Insert expense
    const result = await client.query(
      'INSERT INTO expenses (date, category, amount, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [date, category, expenseAmount, description]
    );
    
    // Update cash book with running balance calculation
    const lastCashBookQuery = await client.query('SELECT balance_after FROM cash_book ORDER BY transaction_id DESC LIMIT 1 FOR UPDATE');
    const lastBalance = lastCashBookQuery.rows.length > 0 ? parseFloat(lastCashBookQuery.rows[0].balance_after || 0) : 0;
    const newBalance = lastBalance - expenseAmount;

    await client.query(
      `INSERT INTO cash_book (type, amount, source, reference_id, balance_after) 
       VALUES ('OUT', $1, 'expense', $2, $3)`,
      [expenseAmount, result.rows[0].expense_id, newBalance]
    );

    // Double-Entry Ledger Hook
    try {
      const { postJournalEntry } = require('../utils/ledger');
      await postJournalEntry(client, {
        reference_source: 'expense',
        reference_id: result.rows[0].expense_id,
        description: `Operational expense: ${category} - ${description || 'No description'}`,
        created_by: req.user.userId,
        lines: [
          { account_code: expenseCategoryMap[category] || '5100', debit: expenseAmount, credit: 0 },
          { account_code: '1100', debit: 0, credit: expenseAmount }
        ]
      });
    } catch (ledgerErr) {
      console.error('Ledger expense post failed:', ledgerErr.message);
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
