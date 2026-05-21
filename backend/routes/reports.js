const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.use(authenticateToken);
// Only allow admin and accountant to view reports
router.use(authorizeRole('admin', 'accountant'));

// Daily Collection Report
router.get('/daily-collection', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT SUM(amount) as total_collection 
      FROM payments 
      WHERE DATE(payment_date) = CURRENT_DATE
    `);
    res.json({ total_collection: result.rows[0].total_collection || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Outstanding Loans Report
router.get('/outstanding', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.loan_id, c.name, l.total_amount, 
             COALESCE((SELECT SUM(paid_amount) FROM installments WHERE loan_id = l.loan_id), 0) as total_paid,
             (l.total_amount - COALESCE((SELECT SUM(paid_amount) FROM installments WHERE loan_id = l.loan_id), 0)) as outstanding_balance
      FROM loans l
      JOIN customers c ON l.customer_id = c.customer_id
      WHERE l.status = 'active'
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Profit Loss Report (Simplified: Interest - Expenses)
router.get('/profit-loss', async (req, res) => {
  try {
    const result = await pool.query(`
      WITH 
      TotalInterest AS (
        SELECT SUM(l.total_amount - l.loan_amount) as interest FROM loans l
      ),
      TotalExpenses AS (
        SELECT SUM(amount) as expenses FROM expenses
      ),
      OtherIncome AS (
        SELECT SUM(amount) as income FROM income
      )
      SELECT 
        COALESCE((SELECT interest FROM TotalInterest), 0) as expected_interest,
        COALESCE((SELECT expenses FROM TotalExpenses), 0) as total_expenses,
        COALESCE((SELECT income FROM OtherIncome), 0) as other_income,
        (COALESCE((SELECT interest FROM TotalInterest), 0) + COALESCE((SELECT income FROM OtherIncome), 0) - COALESCE((SELECT expenses FROM TotalExpenses), 0)) as projected_profit
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Collection Trends (Last 7 days)
router.get('/collection-trends', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DATE(payment_date) as date, SUM(amount) as amount
      FROM payments
      WHERE payment_date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(payment_date)
      ORDER BY DATE(payment_date) ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Loan Type Distribution
router.get('/loan-distribution', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT loan_type as name, COUNT(*) as value
      FROM loans
      GROUP BY loan_type
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
