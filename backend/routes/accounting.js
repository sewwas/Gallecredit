const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.use(authenticateToken);
router.use(authorizeRole('admin', 'accountant'));

// GET /status/:date/report - Full day summary audit log
router.get('/status/:date/report', async (req, res) => {
  const { date } = req.params;
  try {
    const status = await pool.query('SELECT d.*, u.username as closed_by_name FROM day_closes d LEFT JOIN users u ON d.closed_by_id = u.user_id WHERE date = $1', [date]);
    if (status.rows.length === 0) {
      return res.status(404).json({ error: 'This day is not closed yet' });
    }

    const cashbook = await pool.query('SELECT * FROM cash_book WHERE DATE(date) = $1 ORDER BY date ASC', [date]);

    // Fetch journal entries with users
    const journals = await pool.query(`
      SELECT j.*, u.username as created_by_name 
      FROM journal_entries j
      LEFT JOIN users u ON j.created_by = u.user_id
      WHERE DATE(j.transaction_date) = $1
      ORDER BY j.transaction_date ASC
    `, [date]);

    const journalIds = journals.rows.map(j => j.journal_id);
    let lines = [];
    if (journalIds.length > 0) {
      const linesQuery = await pool.query(`
        SELECT l.*, c.account_name 
        FROM journal_lines l
        JOIN chart_of_accounts c ON l.account_code = c.account_code
        WHERE l.journal_id = ANY($1)
      `, [journalIds]);
      lines = linesQuery.rows;
    }

    const journalsWithLines = journals.rows.map(j => ({
      ...j,
      lines: lines.filter(l => l.journal_id === j.journal_id)
    }));

    res.json({
      dayStatus: status.rows[0],
      cashbook: cashbook.rows,
      journals: journalsWithLines
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

// POST /capital/inflow - Record capital injected by investors/owners
router.post('/capital/inflow', async (req, res) => {
  const { date, source, amount, description } = req.body;
  const numAmount = parseFloat(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Valid positive amount is required' });
  }

  const userId = req.user ? (req.user.user_id || req.user.userId) : null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Lock and update Central Branch Safe (type = 'MAIN')
    let mainVaultQuery = await client.query("SELECT vault_id, current_balance FROM cash_vaults WHERE type = 'MAIN' LIMIT 1 FOR UPDATE");
    if (mainVaultQuery.rows.length === 0) {
      const createRes = await client.query(
        "INSERT INTO cash_vaults (name, type, current_balance) VALUES ('Central Branch Safe', 'MAIN', 0.00) RETURNING vault_id, current_balance"
      );
      mainVaultQuery = createRes;
    }
    const mainVaultId = mainVaultQuery.rows[0].vault_id;

    await client.query(
      "UPDATE cash_vaults SET current_balance = current_balance + $1 WHERE vault_id = $2",
      [numAmount, mainVaultId]
    );

    // 2. Update cash_book with running balance calculation
    const lastCashBookQuery = await client.query('SELECT balance_after FROM cash_book ORDER BY transaction_id DESC LIMIT 1 FOR UPDATE');
    const lastBalance = lastCashBookQuery.rows.length > 0 ? parseFloat(lastCashBookQuery.rows[0].balance_after || 0) : 0;
    const newBalance = lastBalance + numAmount;

    const cashBookRes = await client.query(
      `INSERT INTO cash_book (date, type, amount, source, reference_id, balance_after) 
       VALUES ($1, 'IN', $2, $3, $4, $5) RETURNING transaction_id`,
      [date ? new Date(date) : new Date(), numAmount, source ? `capital_inflow: ${source}` : 'capital_inflow', mainVaultId, newBalance]
    );

    // 3. Post Double-Entry Journal Entry
    try {
      const { postJournalEntry } = require('../utils/ledger');
      await postJournalEntry(client, {
        reference_source: 'capital_inflow',
        reference_id: cashBookRes.rows[0]?.transaction_id || mainVaultId,
        description: description || `Capital Inflow from ${source || 'Investor/Owner'}`,
        created_by: userId,
        lines: [
          { account_code: '1100', debit: numAmount, credit: 0 },  // Debit Branch Safe Cash
          { account_code: '3000', debit: 0, credit: numAmount }   // Credit Equity
        ]
      });
    } catch (ledgerErr) {
      console.error('Ledger capital inflow post failed:', ledgerErr.message);
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Capital Inflow recorded successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Capital inflow failed:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  } finally {
    client.release();
  }
});

// POST /capital/distribution - Record profit/capital distributed to owners
router.post('/capital/distribution', async (req, res) => {
  const { date, destination, amount, description } = req.body;
  const numAmount = parseFloat(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Valid positive amount is required' });
  }

  const userId = req.user ? (req.user.user_id || req.user.userId) : null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Lock and check Central Branch Safe (type = 'MAIN')
    const mainVaultQuery = await client.query("SELECT vault_id, current_balance FROM cash_vaults WHERE type = 'MAIN' LIMIT 1 FOR UPDATE");
    if (mainVaultQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Central branch safe vault not found' });
    }
    const mainVault = mainVaultQuery.rows[0];
    if (parseFloat(mainVault.current_balance || 0) < numAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient funds in Central Branch Safe' });
    }

    await client.query(
      "UPDATE cash_vaults SET current_balance = current_balance - $1 WHERE vault_id = $2",
      [numAmount, mainVault.vault_id]
    );

    // 2. Update cash_book with running balance calculation
    const lastCashBookQuery = await client.query('SELECT balance_after FROM cash_book ORDER BY transaction_id DESC LIMIT 1 FOR UPDATE');
    const lastBalance = lastCashBookQuery.rows.length > 0 ? parseFloat(lastCashBookQuery.rows[0].balance_after || 0) : 0;
    const newBalance = lastBalance - numAmount;

    const cashBookRes = await client.query(
      `INSERT INTO cash_book (date, type, amount, source, reference_id, balance_after) 
       VALUES ($1, 'OUT', $2, $3, $4, $5) RETURNING transaction_id`,
      [date ? new Date(date) : new Date(), numAmount, destination ? `profit_distribution: ${destination}` : 'profit_distribution', mainVault.vault_id, newBalance]
    );

    // 3. Post Double-Entry Journal Entry
    try {
      const { postJournalEntry } = require('../utils/ledger');
      await postJournalEntry(client, {
        reference_source: 'capital_distribution',
        reference_id: cashBookRes.rows[0]?.transaction_id || mainVault.vault_id,
        description: description || `Profit/Capital Distribution to ${destination || 'Stakeholders'}`,
        created_by: userId,
        lines: [
          { account_code: '3000', debit: numAmount, credit: 0 },  // Debit Equity
          { account_code: '1100', debit: 0, credit: numAmount }   // Credit Branch Safe Cash
        ]
      });
    } catch (ledgerErr) {
      console.error('Ledger profit distribution post failed:', ledgerErr.message);
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Profit Distribution recorded successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Capital distribution failed:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  } finally {
    client.release();
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

    const journalsMap = new Map();
    result.rows.forEach(row => {
      if (!journalsMap.has(row.journal_id)) {
        journalsMap.set(row.journal_id, {
          journal_id: row.journal_id,
          transaction_date: row.transaction_date,
          reference_source: row.reference_source,
          reference_id: row.reference_id,
          description: row.description,
          operator_name: row.operator_name,
          lines: []
        });
      }
      journalsMap.get(row.journal_id).lines.push({
        line_id: row.line_id,
        account_code: row.account_code,
        account_name: row.account_name,
        debit: parseFloat(row.debit),
        credit: parseFloat(row.credit)
      });
    });

    res.json(Array.from(journalsMap.values()));
  } catch (err) {
    console.error('Failed to fetch journal lines:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
