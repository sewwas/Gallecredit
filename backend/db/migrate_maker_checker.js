const { pool } = require('./index');

async function migrateMakerChecker() {
  const client = await pool.connect();
  try {
    console.log('Starting Maker-Checker & Audit Schema Migration...');
    await client.query('BEGIN');

    // 1. Add status and maker-checker columns to loans table
    await client.query(`
      ALTER TABLE loans 
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'disbursed', 'rejected', 'written_off')),
      ADD COLUMN IF NOT EXISTS created_by_id INTEGER,
      ADD COLUMN IF NOT EXISTS approved_by_id INTEGER,
      ADD COLUMN IF NOT EXISTS disbursed_by_id INTEGER;
    `);
    console.log('Added status and maker-checker audit columns to loans table.');

    // 2. Create Loan Status History table for audit tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS loan_status_history (
          history_id SERIAL PRIMARY KEY,
          loan_id INTEGER REFERENCES loans(loan_id) ON DELETE CASCADE,
          from_status VARCHAR(20),
          to_status VARCHAR(20) NOT NULL,
          changed_by INTEGER,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created loan_status_history table.');

    // 3. Backward compatibility: update any existing loans without status to 'disbursed'
    await client.query(`
      UPDATE loans SET status = 'disbursed' WHERE status IS NULL;
    `);
    console.log('Updated existing active loans to disbursed status.');

    await client.query('COMMIT');
    console.log('Maker-Checker Migration Completed Successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Maker-Checker Migration Failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

migrateMakerChecker();
