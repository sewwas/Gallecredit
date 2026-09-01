const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { auditReportView } = require('../middleware/audit');

router.use(authenticateToken);
// Only allow admin and accountant to view reports
router.use(authorizeRole('admin', 'accountant'));

// Daily Collection Report (or Total Collection for period)
router.get('/daily-collection', auditReportView('daily_collection'), async (req, res) => {
  const { startDate, endDate } = req.query;
  let query = `SELECT SUM(amount) as total_collection FROM payments WHERE DATE(payment_date) = CURRENT_DATE`;
  const params = [];
  
  if (startDate && endDate) {
    query = `SELECT SUM(amount) as total_collection FROM payments WHERE DATE(payment_date) >= $1 AND DATE(payment_date) <= $2`;
    params.push(startDate, endDate);
  }

  try {
    const result = await pool.query(query, params);
    res.json({ total_collection: result.rows[0].total_collection || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Outstanding Loans Report
router.get('/outstanding', auditReportView('outstanding_loans'), async (req, res) => {
  const { startDate, endDate } = req.query;
  let dateFilter = '';
  const params = [];

  if (startDate && endDate) {
    dateFilter = 'AND DATE(l.issue_date) >= $1 AND DATE(l.issue_date) <= $2';
    params.push(startDate, endDate);
  }

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
      ${dateFilter}
    `, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Profit Loss Report (With Actual Net Profit and Projected Profit)
router.get('/profit-loss', auditReportView('profit_loss'), async (req, res) => {
  const { startDate, endDate } = req.query;
  const params = [];
  let dateConditionLoans = '';
  let dateConditionExpenses = '';
  let dateConditionIncome = '';
  let dateConditionPayments = '';

  if (startDate && endDate) {
    params.push(startDate, endDate);
    dateConditionLoans = 'WHERE DATE(issue_date) >= $1 AND DATE(issue_date) <= $2';
    dateConditionExpenses = 'WHERE DATE(date) >= $1 AND DATE(date) <= $2';
    dateConditionIncome = 'WHERE DATE(date) >= $1 AND DATE(date) <= $2';
    dateConditionPayments = 'WHERE DATE(payment_date) >= $1 AND DATE(payment_date) <= $2';
  }

  try {
    const result = await pool.query(`
      WITH 
      TotalInterest AS (SELECT COALESCE(SUM(total_amount - loan_amount), 0) as interest FROM loans ${dateConditionLoans}),
      TotalExpenses AS (SELECT COALESCE(SUM(amount), 0) as expenses FROM expenses ${dateConditionExpenses}),
      OtherIncome AS (SELECT COALESCE(SUM(amount), 0) as income FROM income ${dateConditionIncome}),
      RealizedInterest AS (
        SELECT COALESCE(SUM(
          p.amount * (l.total_amount - l.loan_amount) / NULLIF(l.total_amount, 0)
        ), 0) as actual_interest
        FROM payments p
        JOIN loans l ON p.loan_id = l.loan_id
        ${dateConditionPayments}
      )
      SELECT 
        i.interest as expected_interest,
        e.expenses as total_expenses,
        o.income as other_income,
        ri.actual_interest as realized_interest,
        (i.interest + o.income - e.expenses) as projected_profit,
        (ri.actual_interest + o.income - e.expenses) as actual_net_profit
      FROM TotalInterest i
      CROSS JOIN TotalExpenses e
      CROSS JOIN OtherIncome o
      CROSS JOIN RealizedInterest ri
    `, params);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Collection Trends
router.get('/collection-trends', auditReportView('collection_trends'), async (req, res) => {
  const { startDate, endDate } = req.query;
  let query = `
      SELECT DATE(payment_date) as date, SUM(amount) as amount
      FROM payments
      WHERE payment_date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(payment_date)
      ORDER BY DATE(payment_date) ASC
  `;
  const params = [];

  if (startDate && endDate) {
    query = `
      SELECT DATE(payment_date) as date, SUM(amount) as amount
      FROM payments
      WHERE DATE(payment_date) >= $1 AND DATE(payment_date) <= $2
      GROUP BY DATE(payment_date)
      ORDER BY DATE(payment_date) ASC
    `;
    params.push(startDate, endDate);
  }

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Loan Type Distribution
router.get('/loan-distribution', auditReportView('loan_distribution'), async (req, res) => {
  const { startDate, endDate } = req.query;
  let query = `SELECT loan_type as name, COUNT(*) as value FROM loans GROUP BY loan_type`;
  const params = [];

  if (startDate && endDate) {
    query = `SELECT loan_type as name, COUNT(*) as value FROM loans WHERE DATE(issue_date) >= $1 AND DATE(issue_date) <= $2 GROUP BY loan_type`;
    params.push(startDate, endDate);
  }

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

