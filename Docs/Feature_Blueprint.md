# Microfinance Management System (MMS) - Full Feature Blueprint

This blueprint outlines the entire architecture, current feature set, user roles, and the roadmap for the Microfinance Management System (MMS).

---

## 1. System Architecture
- **Frontend Layer**: React.js (Vite), styled with Tailwind CSS for a premium, responsive, glassmorphism UI.
- **Backend API Layer**: Node.js & Express.js handling business logic and RESTful endpoints.
- **Database Layer**: PostgreSQL for robust, ACID-compliant financial data storage.
- **Authentication**: Stateless JWT (JSON Web Tokens) with Role-Based Access Control (RBAC).

---

## 2. User Roles & Permissions

| Role | Permissions | Access Areas |
|---|---|---|
| **Admin** | Full system control. Can view all reports, manage users, and approve system-wide changes. | Dashboard, Customers, Loans, Payments, Accounting, Reports |
| **Accountant** | Manages cash book, records external expenses/income, and analyzes financial reports. | Dashboard, Customers, Loans, Payments, Accounting, Reports |
| **Staff (Collector)** | Field officers who register customers, issue standard loans, and record daily collections. | Dashboard, Customers, Loans, Payments |

*(Note: In the current v1 build, Admin and Accountant share similar broad permissions, while Staff is restricted from the Accounting and Reports tabs).*

---

## 3. Core Modules (Currently Implemented)

### 👥 Customer Management
- **Registration**: Capture Name, unique NIC, Phone, and Address.
- **Tracking**: Associate multiple loans with a single customer profile.
- **Prevention**: Enforce unique NIC validation to prevent duplicate customer profiles.

### 💰 Loan Management
- **Dynamic Issuance**: Define Principal, Interest Rate (Flat Rate), Loan Type (Daily, Weekly, Monthly), and Duration (No. of installments).
- **Auto-Calculation Engine**: Automatically calculates the total payable amount (Principal + Interest).
- **Schedule Generation**: Automatically splits the total amount into equal installments and assigns precise calendar due dates based on the loan type.
- **Status Tracking**: Loans dynamically shift from `active` to `completed` once all linked installments are paid off.

### 🧾 Installment & Payment Collection
- **Smart Selection**: Collectors select a customer's active loan and choose a specific pending installment.
- **Partial/Full Payments**: The system supports partial payments. If a payment is less than the installment due, the installment status becomes `partial`. If fully met, it becomes `paid`.
- **Method Tracking**: Record whether payments were made via Cash, Bank Transfer, or Card.

### 🏦 Accounting Module
- **Master Cash Book**: A chronological ledger automatically logging all loan payments as `IN` transactions.
- **Manual Expenses**: Accountants can log operational expenses (e.g., Office Supplies, Fuel) which log as `OUT` transactions.
- **Other Income**: Accountants can log non-loan income (e.g., consultation fees) which log as `IN` transactions.

### 📊 Financial Reporting
- **Daily Collections**: Real-time aggregation of all payments made on the current date.
- **Outstanding Analysis**: A ledger of all active loans detailing the original Total Amount, Total Amount Paid to date, and the Remaining Balance.
- **Profit & Loss**: Aggregation of Expected Interest + Other Income minus Total Expenses to project operational profitability.

---

## 4. Phase 2: Enterprise Upgrades & Strategic Roadmap

To scale MMS from a web application into an enterprise-grade financial ecosystem, the following features are mapped for future development based on industry standard best practices:

### 🛡️ Advanced Risk Management & Compliance
- **KYC & Document Management**: Allow the uploading of scanned documents (NIC, utility bills, business registration). Add a validation workflow where an Admin must approve KYC documents before a loan can be issued.
- **Guarantor Tracking**: Most microfinance loans require 1 or 2 guarantors. The database will link guarantor profiles (including their KYC) to the main loan.
- **Dynamic Credit Scoring**: Implement an algorithm that calculates a customer's credit score based on their historical repayment behavior.
- **NPA (Non-Performing Asset) Classification**: Automatically categorize loans based on industry standards (e.g., Standard, Sub-Standard, Doubtful, Loss). 

### 🧮 Enterprise Accounting System (Double-Entry)
- **Chart of Accounts & General Ledger**: Move to a double-entry system (Debits and Credits) with a formalized Chart of Accounts (Assets, Liabilities, Equity, Revenue, Expenses).
- **Automated Journal Entries**: When a loan is issued, automatically debit the "Loan Portfolio" asset account and credit the "Cash" account.
- **Day-End / Month-End Processing**: Introduce a "Day Close" functionality where the Accountant locks the day's transactions.

### 📈 Product Flexibility & Operational Efficiency
- **Grace Periods & Automated Penalties**: Configure a "grace period" (e.g., 3 days). If a payment is not received, a background cron job calculates and appends the penalty to the balance.
- **Reducing Balance Interest**: Implement the "Reducing Balance" calculation method where interest is calculated only on the remaining principal.
- **Savings & Deposits**: Allow customers to maintain a savings account with the institution, offering micro-savings products.

### 📱 Omnichannel Customer Experience
- **Automated WhatsApp/SMS Alerts**: Send an SMS when a loan is disbursed, a reminder 2 days before an installment is due, and a digital receipt upon payment.
- **Customer Self-Service Portal**: A lightweight mobile-responsive web portal where customers can log in to view their active loans and remaining balance.

### 🌐 Technology & Architecture Scaling
- **Offline-First Field App**: A React Native or Flutter mobile app with an embedded database. Collectors can record payments offline and automatically sync to the server when they return to Wi-Fi.
- **Bluetooth Printer Integration**: Instantly print thermal receipts for customers upon field collection.
- **GPS Tracking**: Log the GPS coordinates of field staff when payments are collected.
- **Audit Logging Middleware**: Implement a strict audit trail that records every database mutation.
