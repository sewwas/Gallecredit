const { pool } = require('./index');

async function migrateCustomCoding() {
  const client = await pool.connect();
  try {
    console.log('Starting Custom Coding and Safeguards Migration...');
    await client.query('BEGIN');

    // 1. Alter Customers Table
    await client.query(`
      ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS location VARCHAR(100) DEFAULT 'Galle',
      ADD COLUMN IF NOT EXISTS location_code VARCHAR(10) DEFAULT 'GL';
    `);
    console.log('Updated customers table with location columns.');

    // 2. Alter Loans Table
    await client.query(`
      ALTER TABLE loans 
      ADD COLUMN IF NOT EXISTS loan_code VARCHAR(50) UNIQUE;
    `);
    console.log('Updated loans table with loan_code column.');

    // 3. Alter Installments Table
    await client.query(`
      ALTER TABLE installments 
      ADD COLUMN IF NOT EXISTS last_penalized_date DATE;
    `);
    console.log('Updated installments table with last_penalized_date column.');

    // 4. Backfill Customers
    await client.query(`
      UPDATE customers 
      SET location = 'Galle', location_code = 'GL' 
      WHERE location IS NULL OR location_code IS NULL;
    `);
    console.log('Backfilled existing customer locations.');

    // 5. Backfill Loan Codes
    const loansQuery = await client.query('SELECT loan_id, customer_id, loan_type FROM loans ORDER BY loan_id ASC');
    console.log(`Found ${loansQuery.rows.length} loans to backfill.`);

    // To track loan counts per customer dynamically
    const customerLoanCounts = {};

    for (let loan of loansQuery.rows) {
      const { loan_id, customer_id, loan_type } = loan;
      
      // Get customer location code
      const customerQuery = await client.query('SELECT location_code FROM customers WHERE customer_id = $1', [customer_id]);
      const locationCode = customerQuery.rows[0]?.location_code || 'GL';

      // Increment sequence count for this customer
      if (!customerLoanCounts[customer_id]) {
        customerLoanCounts[customer_id] = 0;
      }
      customerLoanCounts[customer_id]++;
      const sequence = customerLoanCounts[customer_id];

      // Code components
      let typePrefix = 'D';
      if (loan_type === 'weekly') typePrefix = 'W';
      else if (loan_type === 'monthly') typePrefix = 'M';

      const customerIdPadded = String(customer_id).padStart(3, '0');
      const loanCode = `${typePrefix}-${locationCode.toUpperCase()}-${customerIdPadded}-${sequence}`;

      // Update loan code
      await client.query('UPDATE loans SET loan_code = $1 WHERE loan_id = $2', [loanCode, loan_id]);
      console.log(`Generated loan code ${loanCode} for Loan ID ${loan_id}`);
    }

    await client.query('COMMIT');
    console.log('Migration Completed Successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration Failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

migrateCustomCoding();
