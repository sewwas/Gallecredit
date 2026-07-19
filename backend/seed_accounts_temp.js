require('dotenv').config();
const { pool } = require('./db');

async function seed() {
  const accounts = [
    { code: '5101', name: 'Salary', category: 'EXPENSE', parent: '5100' },
    { code: '5102', name: 'Allowance', category: 'EXPENSE', parent: '5100' },
    { code: '5103', name: 'Stamp', category: 'EXPENSE', parent: '5100' },
    { code: '5104', name: 'Fuel', category: 'EXPENSE', parent: '5100' },
    { code: '5105', name: 'Card', category: 'EXPENSE', parent: '5100' },
    { code: '5106', name: 'Photocopy', category: 'EXPENSE', parent: '5100' },
    { code: '5107', name: 'Promissory', category: 'EXPENSE', parent: '5100' },
    { code: '5199', name: 'Other', category: 'EXPENSE', parent: '5100' },
    { code: '3100', name: 'Investor Capital', category: 'EQUITY', parent: '3000' },
    { code: '3200', name: 'Profit Distribution', category: 'EQUITY', parent: '3000' }
  ];

  for (const acc of accounts) {
    try {
      await pool.query(
        'INSERT INTO chart_of_accounts (account_code, account_name, category, parent_code) VALUES ($1, $2, $3, $4) ON CONFLICT (account_code) DO NOTHING',
        [acc.code, acc.name, acc.category, acc.parent]
      );
      console.log(`Seeded account ${acc.code}`);
    } catch (e) {
      console.error(e);
    }
  }
  process.exit(0);
}

seed();
