const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Vercel Cron Endpoint for Late Penalties
router.get('/penalties', async (req, res) => {
  // Check cron secret if provided in environment
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('Running daily penalty cron job via API...');
  try {
    const client = await pool.connect();
    // Find active loans and overdue installments that haven't been penalized today
    const overdues = await client.query(`
      SELECT i.installment_id, i.amount, i.paid_amount, l.penalty_rate 
      FROM installments i 
      JOIN loans l ON i.loan_id = l.loan_id
      WHERE i.status != 'paid' 
      AND i.due_date < CURRENT_DATE - (l.grace_period_days || ' days')::INTERVAL
      AND (i.last_penalized_date IS NULL OR i.last_penalized_date < CURRENT_DATE)
    `);
    
    for (let inst of overdues.rows) {
      const remaining = inst.amount - inst.paid_amount;
      const penalty = remaining * (inst.penalty_rate / 100);
      await client.query(
        'UPDATE installments SET penalty_amount = penalty_amount + $1, last_penalized_date = CURRENT_DATE WHERE installment_id = $2',
        [penalty, inst.installment_id]
      );
      console.log(`Applied Rs.${penalty} penalty to installment ${inst.installment_id}`);
    }
    client.release();
    res.json({ message: 'Penalty cron executed successfully', processed: overdues.rows.length });
  } catch (err) {
    console.error('Penalty cron error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
