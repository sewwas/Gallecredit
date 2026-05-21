const { pool } = require('./index');

async function migrateUserManagement() {
  const client = await pool.connect();
  try {
    console.log('Starting User Management Migration...');
    await client.query('BEGIN');

    // Add is_active column to users table
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    `);
    console.log('Added is_active column to users table.');

    await client.query('COMMIT');
    console.log('User Management Migration Completed Successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('User Management Migration Failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

migrateUserManagement();
