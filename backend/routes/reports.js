const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { auditReportView } = require('../middleware/audit');

router.use(authenticateToken);
// Only allow admin and accountant to view reports
router.use(authorizeRole('admin', 'accountant'));

// Daily Collection Report
router.get('/daily-collection', auditReportView('daily_collection'), async (req, res) => {
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
router.get('/outstanding', auditReportView('outstanding_loans'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.loan_id, c.name, l.total_amount, 
             COALESCE(i.total_paid, 0) as total_paid,
             (l.total_amount - COALESCE(i.total_paid, 0)) as outstanding_balance
      FROM loans l
      JOIN customers c ON l.customer_id = c.customer_id
      LEFT JOIN (
          SELECT loan_id, SUM(paid_amount) as total_paid 
          FROM installments 
          GROUP BY loan_id
      ) i ON l.loan_id = i.loan_id
      WHERE l.status = 'disbursed'
      AND (l.total_amount - COALESCE(i.total_paid, 0)) > 0
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Profit Loss Report (Simplified: Interest - Expenses)
router.get('/profit-loss', auditReportView('profit_loss'), async (req, res) => {
  try {
    const result = await pool.query(`
      WITH 
      TotalInterest AS (SELECT COALESCE(SUM(total_amount - loan_amount), 0) as interest FROM loans),
      TotalExpenses AS (SELECT COALESCE(SUM(amount), 0) as expenses FROM expenses),
      OtherIncome AS (SELECT COALESCE(SUM(amount), 0) as income FROM income)
      SELECT 
        i.interest as expected_interest,
        e.expenses as total_expenses,
        o.income as other_income,
        (i.interest + o.income - e.expenses) as projected_profit
      FROM TotalInterest i
      CROSS JOIN TotalExpenses e
      CROSS JOIN OtherIncome o
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Collection Trends (Last 7 days)
router.get('/collection-trends', auditReportView('collection_trends'), async (req, res) => {
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
router.get('/loan-distribution', auditReportView('loan_distribution'), async (req, res) => {
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
