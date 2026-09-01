const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('./index');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting Interest Schemes Migration...');
    await client.query('BEGIN');

    // 1. Widen interest_rate column to DECIMAL(12,2) to accommodate rupee-based fixed fees
    await client.query(`
      ALTER TABLE loans ALTER COLUMN interest_rate TYPE DECIMAL(12,2);
    `);
    console.log('✅ Altered loans.interest_rate to DECIMAL(12,2)');

    // 2. Drop and update interest_method check constraint
    await client.query(`
      ALTER TABLE loans DROP CONSTRAINT IF EXISTS loans_interest_method_check;
    `);
    await client.query(`
      ALTER TABLE loans ADD CONSTRAINT loans_interest_method_check 
      CHECK (interest_method IN ('flat', 'reducing', 'fixed_daily', 'daily_flat'));
    `);
    console.log("✅ Updated loans_interest_method_check to ('flat', 'reducing', 'fixed_daily', 'daily_flat')");

    await client.query('COMMIT');
    console.log('🎉 Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
