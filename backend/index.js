const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');

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
const cronRoutes = require('./routes/cron');
const { pool } = require('./db');

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in production.');
  process.exit(1);
}

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://gallecredit.vercel.app',
  'https://gallecredit-frontend.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
const path = require('path');
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
app.use('/api/cron', cronRoutes);



const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
