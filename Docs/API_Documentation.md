# Microfinance Management System (MMS) - API Documentation

## Base URL
`http://localhost:5000/api`

## Authentication

All endpoints (except login) require a Bearer token in the Authorization header.
`Authorization: Bearer <token>`

---

## 1. Auth

### Login
`POST /auth/login`
- **Description**: Authenticate a user and receive a JWT token.
- **Body**:
  ```json
  {
    "username": "admin",
    "password": "password"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "token": "eyJhbGciOiJIUzI1...",
    "user": { "id": 1, "username": "admin", "role": "admin", "name": "System Admin" }
  }
  ```

---

## 2. Customers

### Get All Customers
`GET /customers`
- **Description**: Returns a list of all customers.
- **Response** (200 OK): Array of customer objects.

### Create Customer
`POST /customers`
- **Body**:
  ```json
  {
    "name": "John Doe",
    "nic": "199012345678",
    "phone": "0771234567",
    "address": "123 Main St, Colombo"
  }
  ```
- **Response** (201 Created): The created customer object.

---

## 3. Loans

### Get All Loans
`GET /loans`
- **Description**: Returns all active and completed loans.
- **Response** (200 OK): Array of loan objects with nested `customer_name`.

### Issue Loan
`POST /loans`
- **Description**: Creates a loan and automatically generates the installment schedule.
- **Body**:
  ```json
  {
    "customer_id": 1,
    "loan_amount": 10000,
    "interest_rate": 5,
    "loan_type": "monthly",
    "issue_date": "2023-10-01",
    "no_of_installments": 12
  }
  ```
- **Response** (201 Created): The created loan object.

### Get Loan Details & Installments
`GET /loans/:id`
- **Description**: Returns loan details including the full installment schedule.
- **Response** (200 OK): Loan object containing an `installments` array.

---

## 4. Payments

### Record Payment
`POST /payments`
- **Description**: Records a payment, updates installment and loan statuses, and writes to the cash book.
- **Body**:
  ```json
  {
    "loan_id": 1,
    "installment_id": 1,
    "amount": 1000,
    "method": "cash"
  }
  ```
- **Response** (201 Created): The recorded payment object.

---

## 5. Accounting & Reports (Admin/Accountant Only)

### Get Cash Book
`GET /cashbook`
- **Description**: Returns chronological cash book ledger entries.

### Add Expense
`POST /expenses`
- **Body**:
  ```json
  {
    "date": "2023-10-01",
    "category": "Office",
    "amount": 500,
    "description": "Stationery"
  }
  ```

### Add Other Income
`POST /income`
- **Body**:
  ```json
  {
    "date": "2023-10-01",
    "source": "Consultation",
    "amount": 2000
  }
  ```

### Financial Reports
- `GET /reports/daily-collection`: Total payments collected today.
- `GET /reports/outstanding`: List of loans with outstanding balances.
- `GET /reports/profit-loss`: Calculated profit/loss statement.
