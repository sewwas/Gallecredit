const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { dayCloseGuard } = require('../middleware/dayCloseGuard');

router.use(authenticateToken);

// Helper function to check if a date is a working day (skips Sundays & registered holidays)
async function getHolidayDates(client) {
  const holidaysQuery = await client.query("SELECT TO_CHAR(holiday_date, 'YYYY-MM-DD') as date FROM public_holidays");
  return new Set(holidaysQuery.rows.map(row => row.date));
}

function isWorkingDay(date, holidaySet) {
  const dateString = date.toISOString().split('T')[0];
  if (holidaySet.has(dateString)) return false;
  return true;
}

function getNextWorkingDate(startDate, loanType, holidaySet) {
  let nextDate = new Date(startDate);
  if (loanType === 'daily') {
    do {
      nextDate.setDate(nextDate.getDate() + 1);
    } while (!isWorkingDay(nextDate, holidaySet));
  } else if (loanType === 'weekly') {
    do {
      nextDate.setDate(nextDate.getDate() + 7);
    } while (!isWorkingDay(nextDate, holidaySet));
  } else if (loanType === 'monthly') {
    do {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } while (!isWorkingDay(nextDate, holidaySet));
  }
  return nextDate;
}

// Get all loans
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        l.*, 
        c.name as customer_name,
        c.location as customer_location,
        c.location_code as customer_location_code,
        COALESCE(i.total_paid, 0) as total_paid,
        COALESCE(i.total_due, 0) as total_installments_amount
      FROM loans l 
      JOIN customers c ON l.customer_id = c.customer_id
      LEFT JOIN (
        SELECT 
          loan_id, 
          SUM(paid_amount) as total_paid, 
          SUM(amount) as total_due 
        FROM installments 
        GROUP BY loan_id
      ) i ON l.loan_id = i.loan_id
      ORDER BY l.issue_date DESC, l.loan_id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// MAKER: Create a draft loan application (pending_approval)
router.post('/', async (req, res) => {
  const { 
    customer_id, 
    loan_amount, 
    interest_rate, 
    loan_type, 
    interest_method,
    issue_date, 
    no_of_installments, 
    guarantor_name, 
    guarantor_nic, 
    guarantor_phone, 
    guarantor_address,
    grace_period_days,
    penalty_rate
  } = req.body;
  
  if (!customer_id || !loan_amount || !interest_rate || !loan_type || !issue_date || !no_of_installments) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // KYC Verification check
    const customerQuery = await client.query('SELECT kyc_status, location_code FROM customers WHERE customer_id = $1', [customer_id]);
    if (customerQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Customer not found' });
    }
    if (customerQuery.rows[0].kyc_status !== 'verified') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Customer KYC must be verified before loan application' });
    }

    const amount = parseFloat(loan_amount);
    const rate = parseFloat(interest_rate) / 100;
    const n = parseInt(no_of_installments);
    let total_amount = 0;
    let installmentsDraft = [];

    const holidaySet = await getHolidayDates(client);

    // Calculate draft schedule details
    if (interest_method === 'reducing') {
      let emi = 0;
      if (rate === 0) {
        emi = amount / n;
      } else {
        emi = amount * rate * Math.pow(1 + rate, n) / (Math.pow(1 + rate, n) - 1);
      }
      total_amount = emi * n;
      
      let remainingPrincipal = amount;
      let currentDueDate = new Date(issue_date);

      for (let i = 1; i <= n; i++) {
        const interestForPeriod = remainingPrincipal * rate;
        const principalForPeriod = emi - interestForPeriod;
        remainingPrincipal -= principalForPeriod;
        currentDueDate = getNextWorkingDate(currentDueDate, loan_type, holidaySet);

        installmentsDraft.push({
          due_date: currentDueDate.toISOString().split('T')[0],
          amount: emi.toFixed(2)
        });
      }
    } else {
      const totalInterest = amount * rate;
      total_amount = amount + totalInterest;
      const installmentAmount = total_amount / n;
      
      let currentDueDate = new Date(issue_date);
      for (let i = 1; i <= n; i++) {
        currentDueDate = getNextWorkingDate(currentDueDate, loan_type, holidaySet);
        installmentsDraft.push({
          due_date: currentDueDate.toISOString().split('T')[0],
          amount: installmentAmount.toFixed(2)
        });
      }
    }

    // Count loans for this customer to establish sequence
    const countQuery = await client.query('SELECT COUNT(*) FROM loans WHERE customer_id = $1', [customer_id]);
    const loanCount = parseInt(countQuery.rows[0].count, 10);
    const locationCode = customerQuery.rows[0].location_code || 'GL';
    let typePrefix = 'D';
    if (loan_type === 'weekly') typePrefix = 'W';
    else if (loan_type === 'monthly') typePrefix = 'M';
    const customerIdPadded = String(customer_id).padStart(3, '0');
    const loanCode = `${typePrefix}-${locationCode.toUpperCase()}-${customerIdPadded}-${loanCount + 1}`;

    const finalDueDate = installmentsDraft[installmentsDraft.length - 1].due_date;

    // Insert Loan as 'pending_approval' (Maker action)
    const loanResult = await client.query(
      `INSERT INTO loans (
        customer_id, loan_amount, interest_rate, loan_type, interest_method, 
        issue_date, due_date, total_amount, grace_period_days, penalty_rate, 
        status, created_by_id, no_of_installments, loan_code
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending_approval', $11, $12, $13) RETURNING *`,
      [
        customer_id, 
        amount, 
        parseFloat(interest_rate), 
        loan_type, 
        interest_method || 'flat',
        issue_date, 
        finalDueDate, 
        total_amount.toFixed(2),
        grace_period_days || 3,
        penalty_rate || 2.0,
        req.user.userId,
        n,
        loanCode
      ]
    );

    const loanId = loanResult.rows[0].loan_id;

    // Log to Loan Status History
    await client.query(
      `INSERT INTO loan_status_history (loan_id, from_status, to_status, changed_by, notes)
       VALUES ($1, NULL, 'pending_approval', $2, 'Loan application registered by loan officer (Maker).')`,
      [loanId, req.user.userId]
    );

    // Insert Guarantor (if provided)
    if (guarantor_name && guarantor_nic) {
      await client.query(
        'INSERT INTO guarantors (loan_id, name, nic, phone, address) VALUES ($1, $2, $3, $4, $5)',
        [loanId, guarantor_name, guarantor_nic, guarantor_phone, guarantor_address]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(loanResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// CHECKER: Approve loan application
router.post('/:id/approve', async (req, res) => {
  // Only Admin or Accountant roles can check/approve
  if (req.user.role !== 'admin' && req.user.role !== 'accountant') {
    return res.status(403).json({ error: 'Unauthorized role. Checker authorization required.' });
  }

  const { notes } = req.body;
  const loanId = req.params.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const loanQuery = await client.query('SELECT status FROM loans WHERE loan_id = $1 FOR UPDATE', [loanId]);
    if (loanQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Loan not found' });
    }

    const currentStatus = loanQuery.rows[0].status;
    if (currentStatus !== 'pending_approval') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Cannot approve a loan in '${currentStatus}' status` });
    }

    // Update status to approved
    await client.query(
      `UPDATE loans 
       SET status = 'approved', approved_by_id = $1 
       WHERE loan_id = $2`,
      [req.user.userId, loanId]
    );

    // Log status change
    await client.query(
      `INSERT INTO loan_status_history (loan_id, from_status, to_status, changed_by, notes)
       VALUES ($1, 'pending_approval', 'approved', $2, $3)`,
      [loanId, req.user.userId, notes || 'Loan application approved by credit officer (Checker).']
    );

    await client.query('COMMIT');
    res.json({ message: 'Loan application approved successfully', loan_id: loanId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// CHECKER: Reject loan application
router.post('/:id/reject', async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'accountant') {
    return res.status(403).json({ error: 'Unauthorized role. Checker authorization required.' });
  }

  const { notes } = req.body;
  const loanId = req.params.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const loanQuery = await client.query('SELECT status FROM loans WHERE loan_id = $1 FOR UPDATE', [loanId]);
    if (loanQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Loan not found' });
    }

    const currentStatus = loanQuery.rows[0].status;
    if (currentStatus !== 'pending_approval' && currentStatus !== 'approved') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Cannot reject a loan in '${currentStatus}' status` });
    }

    // Update status to rejected
    await client.query(
      `UPDATE loans 
       SET status = 'rejected', approved_by_id = $1 
       WHERE loan_id = $2`,
      [req.user.userId, loanId]
    );

    // Log status change
    await client.query(
      `INSERT INTO loan_status_history (loan_id, from_status, to_status, changed_by, notes)
       VALUES ($1, $2, 'rejected', $3, $4)`,
      [loanId, currentStatus, req.user.userId, notes || 'Loan application rejected (Checker).']
    );

    await client.query('COMMIT');
    res.json({ message: 'Loan application rejected successfully', loan_id: loanId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// CHECKER/CASHIER: Disburse Approved Loan (Subtracts from Branch safe, generates real installments, writes General Ledger)
router.post('/:id/disburse', dayCloseGuard, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'accountant') {
    return res.status(403).json({ error: 'Unauthorized role. Cashier authorization required.' });
  }

  const loanId = req.params.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const loanQuery = await client.query('SELECT * FROM loans WHERE loan_id = $1 FOR UPDATE', [loanId]);
    if (loanQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loanQuery.rows[0];
    if (loan.status !== 'approved') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Only approved loans can be disbursed. Current status: '${loan.status}'` });
    }

    const amount = parseFloat(loan.loan_amount);
    const rate = parseFloat(loan.interest_rate) / 100;
    const n = parseInt(loan.no_of_installments);
    const today = new Date().toISOString().split('T')[0]; // Disbursed today

    // Deduct principal from Branch Main Vault
    const centralVaultQuery = await client.query("SELECT vault_id, current_balance FROM cash_vaults WHERE type = 'MAIN' FOR UPDATE");
    if (centralVaultQuery.rows.length === 0) {
      throw new Error('Central Branch Safe not found');
    }
    const centralVault = centralVaultQuery.rows[0];
    const newVaultBalance = parseFloat(centralVault.current_balance) - amount;

    if (newVaultBalance < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient funds in Branch Main Safe' });
    }

    await client.query(
      'UPDATE cash_vaults SET current_balance = $1 WHERE vault_id = $2',
      [newVaultBalance, centralVault.vault_id]
    );

    // Record Single-Entry Cash Book OUT transaction with running balance
    const lastCashBookQuery = await client.query('SELECT balance_after FROM cash_book ORDER BY transaction_id DESC LIMIT 1 FOR UPDATE');
    const lastBalance = lastCashBookQuery.rows.length > 0 ? parseFloat(lastCashBookQuery.rows[0].balance_after || 0) : 0;
    const newBalance = lastBalance - amount;

    await client.query(
      `INSERT INTO cash_book (type, amount, source, reference_id, balance_after) 
       VALUES ('OUT', $1, 'loan_disbursement', $2, $3)`,
      [amount, loanId, newBalance]
    );

    // Calculate real installments calendar
    const holidaySet = await getHolidayDates(client);
    let total_amount = 0;
    let installments = [];

    if (loan.interest_method === 'reducing') {
      let emi = 0;
      if (rate === 0) {
        emi = amount / n;
      } else {
        emi = amount * rate * Math.pow(1 + rate, n) / (Math.pow(1 + rate, n) - 1);
      }
      total_amount = emi * n;
      
      let remainingPrincipal = amount;
      let currentDueDate = new Date(today);

      for (let i = 1; i <= n; i++) {
        const interestForPeriod = remainingPrincipal * rate;
        const principalForPeriod = emi - interestForPeriod;
        remainingPrincipal -= principalForPeriod;
        currentDueDate = getNextWorkingDate(currentDueDate, loan.loan_type, holidaySet);

        installments.push({
          due_date: currentDueDate.toISOString().split('T')[0],
          amount: emi.toFixed(2)
        });
      }
    } else {
      const totalInterest = amount * rate;
      total_amount = amount + totalInterest;
      const installmentAmount = total_amount / n;
      
      let currentDueDate = new Date(today);
      for (let i = 1; i <= n; i++) {
        currentDueDate = getNextWorkingDate(currentDueDate, loan.loan_type, holidaySet);
        installments.push({
          due_date: currentDueDate.toISOString().split('T')[0],
          amount: installmentAmount.toFixed(2)
        });
      }
    }

    const finalDueDate = installments[installments.length - 1].due_date;

    // Generate real installments
    for (let inst of installments) {
      await client.query(
        `INSERT INTO installments (loan_id, due_date, amount) VALUES ($1, $2, $3)`,
        [loanId, inst.due_date, inst.amount]
      );
    }

    // Update loan details with active dates, status, and payer id
    await client.query(
      `UPDATE loans 
       SET status = 'disbursed', issue_date = $1, due_date = $2, total_amount = $3, disbursed_by_id = $4
       WHERE loan_id = $5`,
      [today, finalDueDate, total_amount.toFixed(2), req.user.userId, loanId]
    );

    // Log status change to history
    await client.query(
      `INSERT INTO loan_status_history (loan_id, from_status, to_status, changed_by, notes)
       VALUES ($1, 'approved', 'disbursed', $2, 'Loan disbursed and capital released to client.')`,
      [loanId, req.user.userId]
    );

    // Double-Entry Ledger Hook
    try {
      const { postJournalEntry } = require('../utils/ledger');
      await postJournalEntry(client, {
        reference_source: 'loan_disbursement',
        reference_id: loanId,
        description: `Disbursed loan #${loanId} of Rs.${amount} (Maker-Checker completed)`,
        created_by: req.user.userId,
        lines: [
          { account_code: '1200', debit: amount, credit: 0 },  // Debit Loan Portfolio Asset
          { account_code: '1100', debit: 0, credit: amount }   // Credit Central Branch Cash Safe
        ]
      });
    } catch (ledgerErr) {
      console.error('Ledger disbursement post failed:', ledgerErr.message);
    }

    await client.query('COMMIT');

    // Send SMS Alert
    try {
      const customerResult = await pool.query('SELECT name, phone FROM customers WHERE customer_id = $1', [loan.customer_id]);
      if (customerResult.rows.length > 0) {
        const { name, phone } = customerResult.rows[0];
        const { sendSMS } = require('../utils/sms');
        await sendSMS(phone, `Hello ${name}, your loan application has been approved and disbursed. Rs.${amount} is credited. First payment is due on ${installments[0].due_date}.`);
      }
    } catch (smsErr) {
      console.error('SMS Notification Error:', smsErr.message);
    }

    res.json({ message: 'Loan disbursed successfully', loan_id: loanId, due_date: finalDueDate });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get a single loan with installments & history status logs
router.get('/:id', async (req, res) => {
  try {
    const loanResult = await pool.query(`
      SELECT l.*, c.name as customer_name 
      FROM loans l 
      JOIN customers c ON l.customer_id = c.customer_id 
      WHERE l.loan_id = $1
    `, [req.params.id]);
    
    if (loanResult.rows.length === 0) return res.status(404).json({ error: 'Loan not found' });

    const installmentsResult = await pool.query(
      'SELECT * FROM installments WHERE loan_id = $1 ORDER BY due_date ASC',
      [req.params.id]
    );

    const historyResult = await pool.query(`
      SELECT h.*, u.name as operator_name 
      FROM loan_status_history h
      LEFT JOIN users u ON h.changed_by = u.user_id
      WHERE h.loan_id = $1 
      ORDER BY h.created_at ASC
    `, [req.params.id]);

    res.json({ 
      ...loanResult.rows[0], 
      installments: installmentsResult.rows,
      history: historyResult.rows 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
