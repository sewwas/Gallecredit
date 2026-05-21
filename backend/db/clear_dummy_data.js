const { pool } = require('./index');

async function clearDummyData() {
  const client = await pool.connect();
  try {
    console.log('Starting dummy data removal transaction...');
    await client.query('BEGIN');

    // 1. Truncate all transaction and business tables (cascade takes care of dependencies)
    await client.query('TRUNCATE TABLE payments, installments, loans, guarantors, customer_documents, customers, expenses, income, cash_book, audit_logs, day_closes, cash_handovers, loan_status_history, journal_lines, journal_entries CASCADE');
    console.log('Truncated business, transaction, and audit logs.');

    // 2. Delete test users (keep only the main administrator)
    const usersResult = await client.query(`
      DELETE FROM users 
      WHERE username != 'gallecredit@gmail.com'
    `);
    console.log(`Removed all secondary test users.`);

    // 3. Reset cash vaults (keep only the main branch vault and reset staff drawers)
    await client.query(`
      DELETE FROM cash_vaults 
      WHERE type != 'MAIN'
    `);
    
    await client.query(`
      UPDATE cash_vaults 
      SET current_balance = 1000000.00
      WHERE type = 'MAIN'
    `);
    console.log('Reset cash vaults: Purged staff drawers and set Main Safe to default.');

    await client.query('COMMIT');
    console.log('Database dummy data purged successfully. Environment is 100% clean!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to purge dummy data:', err);
  } finally {
    client.release();
    pool.end();
  }
}

clearDummyData();
