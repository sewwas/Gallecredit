require('dotenv').config();
const { pool } = require('./db');

(async () => {
  try {
    const customerId = 1;
    const loansQuery = await pool.query(`
      SELECT 
        l.loan_id, l.loan_code, l.loan_amount, l.total_amount, l.issue_date, l.due_date, 
        l.status, l.loan_type, l.interest_rate,
        COALESCE((SELECT SUM(paid_amount) FROM installments WHERE loan_id = l.loan_id), 0) as total_paid,
        (l.total_amount - COALESCE((SELECT SUM(paid_amount) FROM installments WHERE loan_id = l.loan_id), 0)) as outstanding_balance
      FROM loans l
      WHERE l.customer_id = $1
      ORDER BY l.issue_date DESC, l.loan_id DESC
    `, [customerId]);
    console.log('Loans OK:', loansQuery.rows.length);
    
    for (let loan of loansQuery.rows) {
      if (loan.status === 'disbursed') {
        const overdueInstQuery = await pool.query(`
          SELECT amount, paid_amount, due_date
          FROM installments
          WHERE loan_id = $1 AND status != 'paid' AND due_date <= CURRENT_DATE
        `, [loan.loan_id]);
        console.log('Overdue Insts OK');
      }
    }
    console.log('All OK');
  } catch(e) { console.error('DB Error:', e); } finally { pool.end(); }
})();
