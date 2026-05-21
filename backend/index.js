const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const loanRoutes = require('./routes/loans');
const installmentRoutes = require('./routes/installments');
const paymentRoutes = require('./routes/payments');
const reportRoutes = require('./routes/reports');
const expenseRoutes = require('./routes/expenses');
const incomeRoutes = require('./routes/income');
const cashbookRoutes = require('./routes/cashbook');
const guarantorRoutes = require('./routes/guarantors');
const accountingRoutes = require('./routes/accounting');
const vaultRoutes = require('./routes/vaults');
const holidayRoutes = require('./routes/holidays');
const portfolioRoutes = require('./routes/portfolio');
const userRoutes = require('./routes/users');
const cron = require('node-cron');
const { pool } = require('./db');

const app = express();

app.use(cors());
app.use(express.json());
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const { auditLog } = require('./middleware/audit');
app.use(auditLog);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/installments', installmentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/cashbook', cashbookRoutes);
app.use('/api/guarantors', guarantorRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/vaults', vaultRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/users', userRoutes);

// --- Phase 2: Cron Job for Late Penalties ---
// Runs every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily penalty cron job...');
  try {
    const client = await pool.connect();
    // Find active loans and overdue installments that haven't been penalized today
    const overdues = await client.query(`
      SELECT i.installment_id, i.amount, i.paid_amount, l.penalty_rate 
      FROM installments i 
      JOIN loans l ON i.loan_id = l.loan_id
      WHERE i.status != 'paid' 
      AND i.due_date < CURRENT_DATE - (l.grace_period_days || ' days')::INTERVAL
    `);
    
    for (let inst of overdues.rows) {
      const remaining = inst.amount - inst.paid_amount;
      const penalty = remaining * (inst.penalty_rate / 100);
      await client.query(
        'UPDATE installments SET penalty_amount = penalty_amount + $1 WHERE installment_id = $2',
        [penalty, inst.installment_id]
      );
      console.log(`Applied Rs.${penalty} penalty to installment ${inst.installment_id}`);
    }
  } catch (err) {
    console.error('Penalty cron error:', err);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
