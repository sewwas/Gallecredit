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

module.exports = router;
