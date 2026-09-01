require('dotenv').config();
const { pool } = require('./db');

async function testDisburse(loanId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const loanQuery = await client.query('SELECT * FROM loans WHERE loan_id = $1 FOR UPDATE', [loanId]);
    if (loanQuery.rows.length === 0) throw new Error('Loan not found');
    const loan = loanQuery.rows[0];

    const amount = parseFloat(loan.loan_amount);
    const rate = parseFloat(loan.interest_rate) / 100;
    const n = parseInt(loan.no_of_installments);
    const today = new Date().toISOString().split('T')[0];

    const centralVaultQuery = await client.query("SELECT vault_id, current_balance FROM cash_vaults WHERE type = 'MAIN' FOR UPDATE");
    if (centralVaultQuery.rows.length === 0) throw new Error('Central Branch Safe not found');
    
    const centralVault = centralVaultQuery.rows[0];
    const newVaultBalance = parseFloat(centralVault.current_balance) - amount;

    if (newVaultBalance < 0) throw new Error('Insufficient funds in Branch Main Safe');

    await client.query('UPDATE cash_vaults SET current_balance = $1 WHERE vault_id = $2', [newVaultBalance, centralVault.vault_id]);

    const lastCashBookQuery = await client.query('SELECT balance_after FROM cash_book ORDER BY transaction_id DESC LIMIT 1 FOR UPDATE');
    const lastBalance = lastCashBookQuery.rows.length > 0 ? parseFloat(lastCashBookQuery.rows[0].balance_after || 0) : 0;
    const newBalance = lastBalance - amount;

    await client.query(
      `INSERT INTO cash_book (type, amount, source, reference_id, balance_after) VALUES ('OUT', $1, 'loan_disbursement', $2, $3)`,
      [amount, loanId, newBalance]
    );

    const holidaysQuery = await client.query("SELECT TO_CHAR(holiday_date, 'YYYY-MM-DD') as date FROM public_holidays");
    const holidaySet = new Set(holidaysQuery.rows.map(row => row.date));

    function isWorkingDay(date, holidaySet) {
      const dateString = date.toISOString().split('T')[0];
      if (holidaySet.has(dateString)) return false;
      return true;
    }

    function getNextWorkingDate(startDate, loanType, holidaySet) {
      let nextDate = new Date(startDate);
      if (loanType === 'daily') {
        do { nextDate.setDate(nextDate.getDate() + 1); } while (!isWorkingDay(nextDate, holidaySet));
      } else if (loanType === 'weekly') {
        do { nextDate.setDate(nextDate.getDate() + 7); } while (!isWorkingDay(nextDate, holidaySet));
      } else if (loanType === 'monthly') {
        do { nextDate.setMonth(nextDate.getMonth() + 1); } while (!isWorkingDay(nextDate, holidaySet));
      }
      return nextDate;
    }

    const { calculateSchedule } = require('./utils/amortization');
    const scheduleResult = calculateSchedule({
      loan_amount: amount,
      interest_rate: loan.interest_rate,
      no_of_installments: n,
      loan_type: loan.loan_type,
      interest_method: loan.interest_method || 'flat',
      issue_date: today,
      holidaySet
    });

    const total_amount = scheduleResult.total_amount;
    const installments = scheduleResult.installments;
    const finalDueDate = scheduleResult.final_due_date;
    console.log('Final due date:', finalDueDate);
    console.log('Generated installments length:', installments.length);

    await client.query('ROLLBACK');
    console.log('Success (dry run)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during dry run:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

testDisburse(24);
