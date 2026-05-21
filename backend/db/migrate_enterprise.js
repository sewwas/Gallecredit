const { pool } = require('./index');

async function migrateEnterprise() {
  const client = await pool.connect();
  try {
    console.log('Starting Enterprise Migration...');
    await client.query('BEGIN');

    // 1. Create Holiday Registry Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public_holidays (
          holiday_id SERIAL PRIMARY KEY,
          holiday_date DATE UNIQUE NOT NULL,
          description VARCHAR(255) NOT NULL,
          is_recurring BOOLEAN DEFAULT FALSE
      );
    `);
    console.log('Created public_holidays table.');

    // 2. Create Vault and Cash Drawers Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cash_vaults (
          vault_id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          type VARCHAR(20) CHECK (type IN ('MAIN', 'BRANCH', 'STAFF')),
          assigned_user_id INTEGER,
          current_balance DECIMAL(12,2) DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created cash_vaults table.');

    // 3. Create Double-Entry Chart of Accounts
    await client.query(`
      CREATE TABLE IF NOT EXISTS chart_of_accounts (
          account_code VARCHAR(20) PRIMARY KEY,
          account_name VARCHAR(100) NOT NULL,
          category VARCHAR(20) CHECK (category IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
          parent_code VARCHAR(20)
      );
    `);
    console.log('Created chart_of_accounts table.');

    // 4. Create Journal Entries & Lines
    await client.query(`
      CREATE TABLE IF NOT EXISTS journal_entries (
          journal_id SERIAL PRIMARY KEY,
          transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          reference_source VARCHAR(50),
          reference_id INTEGER,
          description TEXT,
          created_by INTEGER
      );
    `);
    console.log('Created journal_entries table.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS journal_lines (
          line_id SERIAL PRIMARY KEY,
          journal_id INTEGER REFERENCES journal_entries(journal_id) ON DELETE CASCADE,
          account_code VARCHAR(20) REFERENCES chart_of_accounts(account_code),
          debit DECIMAL(12,2) DEFAULT 0.00,
          credit DECIMAL(12,2) DEFAULT 0.00,
          CONSTRAINT check_balanced_line CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
      );
    `);
    console.log('Created journal_lines table.');

    // 5. Create Cash Handover (Reconciliation) Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cash_handovers (
          handover_id SERIAL PRIMARY KEY,
          from_vault_id INTEGER REFERENCES cash_vaults(vault_id) ON DELETE RESTRICT,
          to_vault_id INTEGER REFERENCES cash_vaults(vault_id) ON DELETE RESTRICT,
          amount DECIMAL(12,2) NOT NULL,
          submitted_by_id INTEGER,
          approved_by_id INTEGER,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          resolved_at TIMESTAMP
      );
    `);
    console.log('Created cash_handovers table.');

    // 6. Seed Chart of Accounts
    const accounts = [
      { code: '1000', name: 'Assets', category: 'ASSET', parent: null },
      { code: '1100', name: 'Cash in Hand (Central Branch)', category: 'ASSET', parent: '1000' },
      { code: '1200', name: 'Loan Portfolio Outstanding', category: 'ASSET', parent: '1000' },
      { code: '1300', name: 'Staff Cash Drawers', category: 'ASSET', parent: '1000' },
      { code: '2000', name: 'Liabilities', category: 'LIABILITY', parent: null },
      { code: '3000', name: 'Equity', category: 'EQUITY', parent: null },
      { code: '4000', name: 'Revenue', category: 'REVENUE', parent: null },
      { code: '4100', name: 'Interest Revenue', category: 'REVENUE', parent: '4000' },
      { code: '4200', name: 'Late Penalty Revenue', category: 'REVENUE', parent: '4000' },
      { code: '4300', name: 'Other income (Fees)', category: 'REVENUE', parent: '4000' },
      { code: '5000', name: 'Expenses', category: 'EXPENSE', parent: null },
      { code: '5100', name: 'Operating Expenses', category: 'EXPENSE', parent: '5000' }
    ];

    for (const acc of accounts) {
      await client.query(`
        INSERT INTO chart_of_accounts (account_code, account_name, category, parent_code)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (account_code) DO NOTHING
      `, [acc.code, acc.name, acc.category, acc.parent]);
    }
    console.log('Seeded initial Chart of Accounts.');

    // 7. Seed Branch Main Vault if none exists
    const mainVaultCheck = await client.query("SELECT 1 FROM cash_vaults WHERE type = 'MAIN'");
    if (mainVaultCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO cash_vaults (name, type, current_balance)
        VALUES ('Central Branch Safe', 'MAIN', 1000000.00)
      `);
      console.log('Seeded Branch Main Vault with default cash.');
    }

    await client.query('COMMIT');
    console.log('Enterprise Migration Completed Successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Enterprise Migration Failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

migrateEnterprise();
