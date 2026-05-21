# Microfinance Management System (MMS) - Test Cases

## 1. Authentication & Authorization

| Test ID | Description | Expected Result | Pass/Fail |
|---|---|---|---|
| AUTH-01 | Login with correct admin credentials. | Returns 200 OK, JWT Token, and User object. | |
| AUTH-02 | Login with incorrect credentials. | Returns 401 Unauthorized. | |
| AUTH-03 | Access `/api/reports` without a token. | Returns 401 Access denied. | |
| AUTH-04 | Access `/api/reports` with a "staff" role token. | Returns 403 Unauthorized role. | |

---

## 2. Customer Management

| Test ID | Description | Expected Result | Pass/Fail |
|---|---|---|---|
| CUST-01 | Create a new customer with valid data. | Returns 201 Created and customer object. | |
| CUST-02 | Create a customer with a duplicate NIC. | Returns 400 Bad Request with "NIC already exists". | |
| CUST-03 | Fetch the list of all customers. | Returns 200 OK and an array of customers. | |

---

## 3. Loan & Installment Calculation Logic

| Test ID | Description | Expected Result | Pass/Fail |
|---|---|---|---|
| LOAN-01 | Issue a Daily Loan (e.g., 10000 at 5%, 10 installments). | Total Amount = 10500. 10 Daily Installments of 1050 are generated. | |
| LOAN-02 | Issue a Monthly Loan (e.g., 50000 at 10%, 12 installments). | Total Amount = 55000. 12 Monthly Installments of 4583.33 are generated. | |
| LOAN-03 | Missing required fields when issuing a loan. | Returns 400 Bad Request. | |
| LOAN-04 | Verify due dates calculation for Weekly loans. | Installment due dates increment exactly by 7 days. | |

---

## 4. Payment Processing

| Test ID | Description | Expected Result | Pass/Fail |
|---|---|---|---|
| PAY-01 | Pay exactly the installment amount. | Installment status updates to `paid`. | |
| PAY-02 | Pay less than the installment amount (partial). | Installment status updates to `partial`. Paid amount increments. | |
| PAY-03 | Pay the final installment of a loan. | Installment status -> `paid`. Loan status -> `completed`. | |
| PAY-04 | Verify Cash Book entry upon payment. | `cash_book` table logs a new 'IN' transaction matching the payment amount. | |

---

## 5. Accounting & Reports

| Test ID | Description | Expected Result | Pass/Fail |
|---|---|---|---|
| ACC-01 | Add a new business expense. | `expenses` table updated, `cash_book` logs an 'OUT' transaction. | |
| ACC-02 | View Daily Collection Report. | Returns sum of payments logged today. | |
| ACC-03 | View Outstanding Loans Report. | Returns loans with (Total Amount - Total Paid Amount) > 0. | |
| ACC-04 | View Profit & Loss Report. | Returns (Total Interest + Other Income) - Expenses. | |
