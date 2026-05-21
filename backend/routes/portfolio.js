const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.use(authenticateToken);
router.use(authorizeRole('admin', 'accountant'));

router.get('/aging', async (req, res) => {
  try {
    // 1. Fetch overdue installments per loan
    const result = await pool.query(`
      WITH loan_overdue AS (
          SELECT 
              i.loan_id,
              MAX(CURRENT_DATE - i.due_date) as max_overdue_days,
              SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.status != 'paid' THEN (i.amount - i.paid_amount) ELSE 0 END) as total_overdue_amount
          FROM installments i
          GROUP BY i.loan_id
      ),
      loan_summary AS (
          SELECT 
              l.loan_id,
              l.customer_id,
              c.name as customer_name,
              l.loan_amount,
              l.total_amount,
              (
                SELECT COALESCE(SUM(i.amount - i.paid_amount), 0)
                FROM installments i
                WHERE i.loan_id = l.loan_id
              ) as outstanding_balance,
              COALESCE(o.max_overdue_days, 0) as overdue_days,
              COALESCE(o.total_overdue_amount, 0) as overdue_amount
          FROM loans l
          JOIN customers c ON l.customer_id = c.customer_id
          LEFT JOIN loan_overdue o ON l.loan_id = o.loan_id
          WHERE l.status = 'disbursed'
      )
      SELECT 
          *,
          CASE 
              WHEN overdue_days = 0 THEN 'Performing'
              WHEN overdue_days <= 30 THEN 'PAR 1-30'
              WHEN overdue_days <= 90 THEN 'PAR 31-90'
              ELSE 'PAR 90+'
          END as asset_category,
          CASE 
              WHEN overdue_days = 0 THEN outstanding_balance * 0.01
              WHEN overdue_days <= 30 THEN outstanding_balance * 0.05
              WHEN overdue_days <= 90 THEN outstanding_balance * 0.20
              ELSE outstanding_balance * 1.00
          END as required_provision
      FROM loan_summary
      ORDER BY overdue_days DESC, outstanding_balance DESC
    `);

    const loans = result.rows;

    // 2. Aggregate stats
    let totalPortfolio = 0;
    let totalOverdue = 0;
    let par1_30 = 0;
    let par31_90 = 0;
    let par90Plus = 0;
    let totalProvision = 0;

    loans.forEach(loan => {
      const balance = parseFloat(loan.outstanding_balance);
      totalPortfolio += balance;
      totalOverdue += parseFloat(loan.overdue_amount);
      totalProvision += parseFloat(loan.required_provision);

      if (loan.overdue_days > 90) {
        par90Plus += balance;
      } else if (loan.overdue_days > 30) {
        par31_90 += balance;
      } else if (loan.overdue_days > 0) {
        par1_30 += balance;
      }
    });

    res.json({
      summary: {
        total_outstanding_portfolio: totalPortfolio,
        total_overdue_amount: totalOverdue,
        par_1_30: par1_30,
        par_31_90: par31_90,
        par_90_plus: par90Plus,
        par_total_risk: par1_30 + par31_90 + par90Plus,
        par_ratio: totalPortfolio > 0 ? (((par1_30 + par31_90 + par90Plus) / totalPortfolio) * 100) : 0,
        total_provision_required: totalProvision
      },
      loans
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
