require('dotenv').config();
const { pool } = require('./db');

const test = async () => {
  try {
    const res = await pool.query(`
      WITH 
      TotalInterest AS (SELECT COALESCE(SUM(total_amount - loan_amount), 0) as interest FROM loans WHERE DATE(issue_date) >= $1 AND DATE(issue_date) <= $2),
      TotalExpenses AS (SELECT COALESCE(SUM(amount), 0) as expenses FROM expenses WHERE DATE(date) >= $1 AND DATE(date) <= $2),
      OtherIncome AS (SELECT COALESCE(SUM(amount), 0) as income FROM income WHERE DATE(date) >= $1 AND DATE(date) <= $2),
      RealizedInterest AS (
        SELECT COALESCE(SUM(
          p.amount * (l.total_amount - l.loan_amount) / NULLIF(l.total_amount, 0)
        ), 0) as actual_interest
        FROM payments p
        JOIN loans l ON p.loan_id = l.loan_id
        WHERE DATE(payment_date) >= $1 AND DATE(payment_date) <= $2
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
    `, ['2050-01-01', '2050-01-01']);
    console.log(res.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};
test();
