// migrate_installments.js
// Adds missing principal_amount and interest_amount columns to the installments table.

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Checking installments table columns...');

    const { rows } = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'installments'
      ORDER BY ordinal_position;
    `);

    const existingCols = rows.map(r => r.column_name);
    console.log('Existing columns:', existingCols.join(', '));

    const migrations = [];

    if (!existingCols.includes('principal_amount')) {
      migrations.push(
        `ALTER TABLE installments ADD COLUMN principal_amount DECIMAL(12,2) DEFAULT 0.00`
      );
    }

    if (!existingCols.includes('interest_amount')) {
      migrations.push(
        `ALTER TABLE installments ADD COLUMN interest_amount DECIMAL(12,2) DEFAULT 0.00`
      );
    }

    if (migrations.length === 0) {
      console.log('✅ No migration needed — both columns already exist.');
      return;
    }

    for (const sql of migrations) {
      console.log(`Running: ${sql}`);
      await client.query(sql);
      console.log('✅ Done.');
    }

    console.log('\n✅ Migration complete! Installments table is now up to date.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
