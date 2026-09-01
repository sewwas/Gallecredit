-- schema.sql (PostgreSQL Syntax for Supabase / MMS Core)

-- 1. Users Table (with active status toggle for User Management)
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'staff', 'accountant')),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    customer_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    nic VARCHAR(20) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    kyc_status VARCHAR(20) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Loans Table (Maker-Checker credit status and audit IDs integrated)
CREATE TABLE IF NOT EXISTS loans (
    loan_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    loan_amount DECIMAL(12,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    loan_type VARCHAR(20) CHECK (loan_type IN ('daily', 'weekly', 'monthly', 'yearly')),
    interest_method VARCHAR(20) DEFAULT 'flat' CHECK (interest_method IN ('flat', 'reducing')),
    issue_date DATE,
    due_date DATE,
    total_amount DECIMAL(12,2),
    grace_period_days INTEGER DEFAULT 3,
    penalty_rate DECIMAL(5,2) DEFAULT 2.0,
    status VARCHAR(20) DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'disbursed', 'rejected', 'written_off', 'completed')),
    created_by_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    approved_by_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    disbursed_by_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    no_of_installments INTEGER NOT NULL DEFAULT 12
);

-- 4. Customer Documents Registry
CREATE TABLE IF NOT EXISTS customer_documents (
    document_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id) ON DELETE CASCADE,
    document_type VARCHAR(50), -- e.g., NIC, Utility Bill, Business License
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Guarantors Table
CREATE TABLE IF NOT EXISTS guarantors (
    guarantor_id SERIAL PRIMARY KEY,
    loan_id INTEGER REFERENCES loans(loan_id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    nic VARCHAR(20),
    phone VARCHAR(20),
    address TEXT
);

-- 6. Installments Calendar
CREATE TABLE IF NOT EXISTS installments (
    installment_id SERIAL PRIMARY KEY,
    loan_id INTEGER REFERENCES loans(loan_id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    principal_amount DECIMAL(12,2) DEFAULT 0.00,
    interest_amount DECIMAL(12,2) DEFAULT 0.00,
    paid_amount DECIMAL(12,2) DEFAULT 0.00,
    penalty_amount DECIMAL(12,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid'))
);

-- 7. Payments Table (Collections tracking)
CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    loan_id INTEGER REFERENCES loans(loan_id) ON DELETE CASCADE,
    installment_id INTEGER REFERENCES installments(installment_id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    collector_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    method VARCHAR(20) DEFAULT 'cash' CHECK (method IN ('cash', 'bank', 'mobile_money'))
);

-- 8. Expenses Log
CREATE TABLE IF NOT EXISTS expenses (
    expense_id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT
);

-- 9. Miscellaneous Income Log
CREATE TABLE IF NOT EXISTS income (
    income_id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    source VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL
);

-- 10. Single-Entry Cash Book (Running liquidity registry)
CREATE TABLE IF NOT EXISTS cash_book (
    transaction_id SERIAL PRIMARY KEY,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(10) CHECK (type IN ('IN', 'OUT')),
    amount DECIMAL(12,2) NOT NULL,
    source VARCHAR(50) NOT NULL, -- e.g., 'loan_disbursement', 'repayment', 'expense'
    reference_id INTEGER,
    balance_after DECIMAL(12,2) NOT NULL
);

-- 11. Audit Logs (System change tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(10) CHECK (action IN ('POST', 'PUT', 'DELETE')),
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    old_value TEXT,
    new_value TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Day Closes Log
CREATE TABLE IF NOT EXISTS day_closes (
    close_id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    closed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_by_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    total_in DECIMAL(12,2) NOT NULL,
    total_out DECIMAL(12,2) NOT NULL,
    closing_balance DECIMAL(12,2) NOT NULL
);

-- 13. Public Holidays Calendar (Sunday & Holiday schedule skips)
CREATE TABLE IF NOT EXISTS public_holidays (
    holiday_id SERIAL PRIMARY KEY,
    holiday_date DATE UNIQUE NOT NULL,
    description VARCHAR(255) NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE
);

-- 14. Cash Vaults & Collector Cash Drawers (Multi-Tier Liquidity)
CREATE TABLE IF NOT EXISTS cash_vaults (
    vault_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('MAIN', 'BRANCH', 'STAFF')),
    assigned_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    current_balance DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Chart of Accounts (General Ledger)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    account_code VARCHAR(20) PRIMARY KEY,
    account_name VARCHAR(100) NOT NULL,
    category VARCHAR(20) CHECK (category IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    parent_code VARCHAR(20)
);

-- 16. Journal Vouchers & Double-Entry Lines
CREATE TABLE IF NOT EXISTS journal_entries (
    journal_id SERIAL PRIMARY KEY,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reference_source VARCHAR(50),
    reference_id INTEGER,
    description TEXT,
    created_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS journal_lines (
    line_id SERIAL PRIMARY KEY,
    journal_id INTEGER NOT NULL REFERENCES journal_entries(journal_id) ON DELETE CASCADE,
    account_code VARCHAR(20) NOT NULL REFERENCES chart_of_accounts(account_code),
    debit DECIMAL(12,2) DEFAULT 0.00,
    credit DECIMAL(12,2) DEFAULT 0.00,
    CONSTRAINT check_balanced_line CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);

-- 17. Cash Handovers
CREATE TABLE IF NOT EXISTS cash_handovers (
    handover_id SERIAL PRIMARY KEY,
    from_vault_id INTEGER NOT NULL REFERENCES cash_vaults(vault_id) ON DELETE RESTRICT,
    to_vault_id INTEGER NOT NULL REFERENCES cash_vaults(vault_id) ON DELETE RESTRICT,
    amount DECIMAL(12,2) NOT NULL,
    submitted_by_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    approved_by_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- 18. Loan Status History (Maker-Checker Compliance Logs)
CREATE TABLE IF NOT EXISTS loan_status_history (
    history_id SERIAL PRIMARY KEY,
    loan_id INTEGER NOT NULL REFERENCES loans(loan_id) ON DELETE CASCADE,
    from_status VARCHAR(20),
    to_status VARCHAR(20) NOT NULL,
    changed_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
