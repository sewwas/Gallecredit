# Microfinance Management System (MMS) - Database Schema

The database relies on a PostgreSQL relational model. 

## Entity Relationship Diagram (Conceptual)
- **1 Customer** -> **Many Loans**
- **1 Loan** -> **Many Installments**
- **1 Installment** -> **Many Payments**
- **Payments / Expenses / Income** -> **Cash Book**

---

### `users`
System users and authentication.
- `user_id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR 100)
- `role` (VARCHAR 20) - *Check: admin, staff, accountant*
- `username` (VARCHAR 50 UNIQUE)
- `password_hash` (TEXT)

---

### `customers`
Client information.
- `customer_id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR 150 NOT NULL)
- `nic` (VARCHAR 20 UNIQUE)
- `phone` (VARCHAR 20)
- `address` (TEXT)
- `created_at` (TIMESTAMP)

---

### `loans`
Master loan records with full Maker-Checker support.
- `loan_id` (SERIAL PRIMARY KEY)
- `customer_id` (INT FK -> customers)
- `loan_amount` (DECIMAL 12,2 NOT NULL)
- `interest_rate` (DECIMAL 5,2 NOT NULL)
- `loan_type` (VARCHAR 20) - *Check: daily, weekly, monthly*
- `interest_method` (VARCHAR 20) - *Check: flat, reducing*
- `issue_date` (DATE)
- `due_date` (DATE)
- `total_amount` (DECIMAL 12,2) - *(Principal + Interest)*
- `grace_period_days` (INTEGER DEFAULT 3)
- `penalty_rate` (DECIMAL 5,2 DEFAULT 2.0)
- `status` (VARCHAR 20) - *Check: pending_approval, approved, disbursed, rejected, written_off*
- `created_by_id` (INT FK -> users)
- `approved_by_id` (INT FK -> users)
- `disbursed_by_id` (INT FK -> users)
- `no_of_installments` (INTEGER NOT NULL DEFAULT 12)

---

### `installments`
Generated schedule for repayment.
- `installment_id` (SERIAL PRIMARY KEY)
- `loan_id` (INT FK -> loans)
- `due_date` (DATE)
- `amount` (DECIMAL 12,2)
- `paid_amount` (DECIMAL 12,2)
- `status` (VARCHAR 20) - *pending, partial, paid*

---

### `payments`
Actual collection events.
- `payment_id` (SERIAL PRIMARY KEY)
- `loan_id` (INT FK -> loans)
- `installment_id` (INT FK -> installments)
- `amount` (DECIMAL 12,2)
- `payment_date` (TIMESTAMP)
- `collector_id` (INT)
- `method` (VARCHAR 20)

---

### `expenses` & `income`
Accounting records.
- `expense_id` / `income_id` (SERIAL PRIMARY KEY)
- `date` (DATE)
- `category` / `source` (VARCHAR)
- `amount` (DECIMAL 12,2)

---

### `cash_book`
Master ledger.
- `transaction_id` (SERIAL PRIMARY KEY)
- `date` (TIMESTAMP)
- `type` (VARCHAR 10) - *Check: IN, OUT*
- `amount` (DECIMAL 12,2)
- `source` (VARCHAR 50)
- `reference_id` (INT)
