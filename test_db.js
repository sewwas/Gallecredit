require('dotenv').config({ path: './backend/.env' });
const { pool } = require('./backend/db');

async function test() {
  try {
    const vaults = await pool.query('SELECT * FROM cash_vaults');
    console.log('Vaults:', vaults.rows);
    const holidays = await pool.query('SELECT * FROM public_holidays');
    console.log('Holidays:', holidays.rows);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

test();
