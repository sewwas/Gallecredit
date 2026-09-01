const { pool } = require('./index');

async function migrate() {
  try {
    console.log('Running migration...');
    
    // Add interest_method to loans
    await pool.query(`
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS interest_method VARCHAR(20) DEFAULT 'flat' CHECK (interest_method IN ('flat', 'reducing'));
    `);
    console.log('Added interest_method to loans.');

    // Create customer_documents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_documents (
          document_id SERIAL PRIMARY KEY,
          customer_id INTEGER REFERENCES customers(customer_id) ON DELETE CASCADE,
          document_type VARCHAR(50),
          file_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created customer_documents table.');

    // Add principal_amount and interest_amount to installments table
    await pool.query(`
      ALTER TABLE installments ADD COLUMN IF NOT EXISTS principal_amount DECIMAL(12,2) DEFAULT 0.00;
      ALTER TABLE installments ADD COLUMN IF NOT EXISTS interest_amount DECIMAL(12,2) DEFAULT 0.00;
    `);
    console.log('Added principal_amount and interest_amount to installments table.');

    // Update loan_type check constraint to include yearly
    await pool.query(`
      ALTER TABLE loans DROP CONSTRAINT IF EXISTS loans_loan_type_check;
      ALTER TABLE loans ADD CONSTRAINT loans_loan_type_check CHECK (loan_type IN ('daily', 'weekly', 'monthly', 'yearly'));
    `);
    console.log('Updated loan_type check constraint.');

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

migrate();
