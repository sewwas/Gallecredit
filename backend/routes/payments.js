const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { dayCloseGuard } = require('../middleware/dayCloseGuard');

router.use(authenticateToken);

router.post('/', dayCloseGuard, async (req, res) => {
  const { loan_id, installment_id, amount, method } = req.body;
  const collector_id = req.user.userId;

  const parsedLoanId = parseInt(loan_id, 10);
  const parsedInstallmentId = parseInt(installment_id, 10);
  const paymentAmount = parseFloat(amount);

  if (isNaN(parsedLoanId) || isNaN(parsedInstallmentId) || isNaN(paymentAmount) || paymentAmount <= 0) {
    return res.status(400).json({ error: 'Valid loan_id, installment_id, and positive payment amount are required' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Get and Lock installment
    const installmentQuery = await client.query('SELECT * FROM installments WHERE installment_id = $1 FOR UPDATE', [parsedInstallmentId]);
    const installment = installmentQuery.rows[0];

    if (!installment) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Installment not found' });
    }

    if (installment.status === 'paid') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This installment has already been fully paid' });
    }

    let remainingToAllocate = paymentAmount;
    const paymentRecords = [];

    const selectedRemaining = parseFloat(installment.amount) - parseFloat(installment.paid_amount);

    if (remainingToAllocate <= selectedRemaining) {
      // Standard flow: fully or partially pays the selected installment
      const newPaidAmount = parseFloat(installment.paid_amount) + remainingToAllocate;
      let newStatus = 'pending';
      if (newPaidAmount >= parseFloat(installment.amount)) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partial';
      }

      await client.query(
        'UPDATE installments SET paid_amount = $1, status = $2 WHERE installment_id = $3',
        [newPaidAmount, newStatus, parsedInstallmentId]
      );

      const payRes = await client.query(
        `INSERT INTO payments (loan_id, installment_id, amount, collector_id, method) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [parsedLoanId, parsedInstallmentId, remainingToAllocate, collector_id, method]
      );
      paymentRecords.push(payRes.rows[0]);
      remainingToAllocate = 0;
    } else {
      // Rollover flow: selected installment is fully paid, excess rolls over to next pending installments
      await client.query(
        "UPDATE installments SET paid_amount = amount, status = 'paid' WHERE installment_id = $1",
        [parsedInstallmentId]
      );

      const payRes = await client.query(
        `INSERT INTO payments (loan_id, installment_id, amount, collector_id, method) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [parsedLoanId, parsedInstallmentId, selectedRemaining, collector_id, method]
      );
      paymentRecords.push(payRes.rows[0]);
      remainingToAllocate -= selectedRemaining;

      // Fetch subsequent unpaid installments for this loan sorted by due date
      const nextInstallmentsQuery = await client.query(
        "SELECT * FROM installments WHERE loan_id = $1 AND status != 'paid' AND installment_id != $2 ORDER BY due_date ASC, installment_id ASC FOR UPDATE",
        [parsedLoanId, parsedInstallmentId]
      );

      let lastInstId = parsedInstallmentId;

      for (let nextInst of nextInstallmentsQuery.rows) {
        if (remainingToAllocate <= 0) break;
        
        lastInstId = nextInst.installment_id;
        const nextRemaining = parseFloat(nextInst.amount) - parseFloat(nextInst.paid_amount);

        if (remainingToAllocate <= nextRemaining) {
          const nextPaid = parseFloat(nextInst.paid_amount) + remainingToAllocate;
          const nextStatus = nextPaid >= parseFloat(nextInst.amount) ? 'paid' : 'partial';

          await client.query(
            'UPDATE installments SET paid_amount = $1, status = $2 WHERE installment_id = $3',
            [nextPaid, nextStatus, nextInst.installment_id]
          );

          const innerPay = await client.query(
            `INSERT INTO payments (loan_id, installment_id, amount, collector_id, method) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [parsedLoanId, nextInst.installment_id, remainingToAllocate, collector_id, method]
          );
          paymentRecords.push(innerPay.rows[0]);
          remainingToAllocate = 0;
        } else {
          await client.query(
            "UPDATE installments SET paid_amount = amount, status = 'paid' WHERE installment_id = $1",
            [nextInst.installment_id]
          );

          const innerPay = await client.query(
            `INSERT INTO payments (loan_id, installment_id, amount, collector_id, method) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [parsedLoanId, nextInst.installment_id, nextRemaining, collector_id, method]
          );
          paymentRecords.push(innerPay.rows[0]);
          remainingToAllocate -= nextRemaining;
        }
      }

      // If there's still excess left, apply it as overpayment to the last installment
      if (remainingToAllocate > 0) {
        const lastInstQuery = await client.query('SELECT paid_amount FROM installments WHERE installment_id = $1', [lastInstId]);
        const currentPaid = parseFloat(lastInstQuery.rows[0].paid_amount);
        const finalPaid = currentPaid + remainingToAllocate;

        await client.query(
          'UPDATE installments SET paid_amount = $1 WHERE installment_id = $2',
          [finalPaid, lastInstId]
        );

        const excessPay = await client.query(
          `INSERT INTO payments (loan_id, installment_id, amount, collector_id, method) 
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [parsedLoanId, lastInstId, remainingToAllocate, collector_id, method]
        );
        paymentRecords.push(excessPay.rows[0]);
      }
    }

    // 2. Find/Lock and Update Collector Personal Cash Drawer
    let collectorVaultQuery = await client.query(
      "SELECT * FROM cash_vaults WHERE assigned_user_id = $1 AND type = 'STAFF' FOR UPDATE",
      [collector_id]
    );
    if (collectorVaultQuery.rows.length === 0) {
      // Auto-create if it doesn't exist
      const insertRes = await client.query(
        "INSERT INTO cash_vaults (name, type, assigned_user_id, current_balance) VALUES ($1, 'STAFF', $2, 0.00) RETURNING *",
        [`Collector User #${collector_id} Drawer`, collector_id]
      );
      collectorVaultQuery = insertRes;
    }
    const collectorVault = collectorVaultQuery.rows[0];
    const newVaultBalance = parseFloat(collectorVault.current_balance) + paymentAmount;

    await client.query(
      'UPDATE cash_vaults SET current_balance = $1 WHERE vault_id = $2',
      [newVaultBalance, collectorVault.vault_id]
    );

    // 3. Update Cash Book with running balance calculation
    const lastCashBookQuery = await client.query('SELECT balance_after FROM cash_book ORDER BY transaction_id DESC LIMIT 1 FOR UPDATE');
    const lastBalance = lastCashBookQuery.rows.length > 0 ? parseFloat(lastCashBookQuery.rows[0].balance_after || 0) : 0;
    const newBalance = lastBalance + paymentAmount;

    await client.query(
      `INSERT INTO cash_book (type, amount, source, reference_id, balance_after) 
       VALUES ('IN', $1, 'loan_payment', $2, $3)`,
      [paymentAmount, paymentRecords[0].payment_id, newBalance]
    );

    // 4. Update overall loan status if all installments are paid
    const allInstallments = await client.query('SELECT status FROM installments WHERE loan_id = $1', [parsedLoanId]);
    const allPaid = allInstallments.rows.every(inst => inst.status === 'paid');
    if (allPaid) {
      await client.query("UPDATE loans SET status = 'completed' WHERE loan_id = $1", [parsedLoanId]);
    }

    // 5. Post Double-Entry Journal Entry
    try {
      const { postJournalEntry } = require('../utils/ledger');
      await postJournalEntry(client, {
        reference_source: 'loan_payment',
        reference_id: paymentRecords[0].payment_id,
        description: `Collected payment of Rs.${paymentAmount} for loan #${parsedLoanId}`,
        created_by: collector_id,
        lines: [
          { account_code: '1300', debit: paymentAmount, credit: 0 },  // Debit Staff Drawers
          { account_code: '1200', debit: 0, credit: paymentAmount }   // Credit Loan Portfolio
        ]
      });
    } catch (ledgerErr) {
      console.error('Ledger entry failed:', ledgerErr.message);
    }

    await client.query('COMMIT');
    
    // --- Phase 2: Real SMS Alert ---
    try {
      const customerResult = await client.query(`
        SELECT c.name, c.phone 
        FROM customers c 
        JOIN loans l ON c.customer_id = l.customer_id 
        WHERE l.loan_id = $1
      `, [parsedLoanId]);
      
      if (customerResult.rows.length > 0) {
        const { name, phone } = customerResult.rows[0];
        
        // Calculate remaining debt outstanding on installments
        const remainingLoanQuery = await client.query(
          'SELECT SUM(amount - paid_amount) as remaining_debt FROM installments WHERE loan_id = $1',
          [parsedLoanId]
        );
        const remainingDebt = Math.max(0, parseFloat(remainingLoanQuery.rows[0].remaining_debt || 0));

        const { sendSMS, sendWhatsApp } = require('../utils/sms');
        const msg = `Receipt: Hello ${name}, we received Rs.${paymentAmount} for Loan #${loan_id}. Remaining balance: Rs.${remainingDebt.toFixed(2)}. Thank you!`;
        await sendSMS(phone, msg);
        await sendWhatsApp(phone, msg);
      }
    } catch (smsErr) {
      console.error('SMS Notification Error:', smsErr.message);
    }

    res.status(201).json({
      ...paymentRecords[0],
      total_amount: paymentAmount,
      allocations: paymentRecords
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/payments/collector-route
// Returns active loans with current/next pending installment for mobile field sheet
router.get('/collector-route', async (req, res) => {
  try {
    const { collector_id, location } = req.query;

    let filterClause = "WHERE l.status = 'disbursed'";
    const params = [];

    if (collector_id && collector_id !== 'all') {
      params.push(parseInt(collector_id, 10));
      filterClause += ` AND (l.created_by_id = $${params.length} OR l.disbursed_by_id = $${params.length})`;
    }

    if (location && location !== 'all') {
      params.push(location);
      filterClause += ` AND c.location = $${params.length}`;
    }

    const query = `
      WITH next_installment AS (
        SELECT DISTINCT ON (loan_id)
          installment_id,
          loan_id,
          due_date,
          amount,
          paid_amount,
          (amount - paid_amount) as remaining_installment,
          status,
          CASE 
            WHEN due_date < CURRENT_DATE THEN 'overdue'
            WHEN due_date = CURRENT_DATE THEN 'due_today'
            ELSE 'upcoming'
          END as due_urgency
        FROM installments
        WHERE status != 'paid'
        ORDER BY loan_id, due_date ASC, installment_id ASC
      ),
      loan_summary AS (
        SELECT 
          loan_id,
          SUM(amount) as total_loan_due,
          SUM(paid_amount) as total_loan_paid,
          SUM(amount - paid_amount) as total_remaining_balance
        FROM installments
        GROUP BY loan_id
      ),
      today_collections AS (
        SELECT 
          loan_id,
          SUM(amount) as paid_today
        FROM payments
        WHERE DATE(payment_date) = CURRENT_DATE
        GROUP BY loan_id
      )
      SELECT 
        l.loan_id,
        l.loan_code,
        l.loan_amount,
        l.loan_type,
        l.status as loan_status,
        c.customer_id,
        c.name as customer_name,
        c.phone as customer_phone,
        c.nic as customer_nic,
        c.address as customer_address,
        c.location as customer_location,
        c.location_code as customer_location_code,
        ni.installment_id,
        ni.due_date as installment_due_date,
        ni.amount as installment_amount,
        ni.paid_amount as installment_paid_amount,
        ni.remaining_installment,
        ni.status as installment_status,
        COALESCE(ni.due_urgency, 'completed') as due_urgency,
        COALESCE(ls.total_remaining_balance, 0) as total_remaining_balance,
        COALESCE(tc.paid_today, 0) as paid_today,
        u.name as collector_name,
        l.created_by_id as collector_id
      FROM loans l
      JOIN customers c ON l.customer_id = c.customer_id
      LEFT JOIN next_installment ni ON l.loan_id = ni.loan_id
      LEFT JOIN loan_summary ls ON l.loan_id = ls.loan_id
      LEFT JOIN today_collections tc ON l.loan_id = tc.loan_id
      LEFT JOIN users u ON l.created_by_id = u.user_id
      ${filterClause}
      ORDER BY 
        CASE 
          WHEN COALESCE(tc.paid_today, 0) > 0 THEN 3
          WHEN ni.due_urgency = 'overdue' THEN 1
          WHEN ni.due_urgency = 'due_today' THEN 2
          ELSE 4
        END,
        ni.due_date ASC NULLS LAST,
        c.name ASC
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching collector route:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

