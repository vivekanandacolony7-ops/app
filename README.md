# Sri Vivekananda Mutually Aided Co-Operative House Building Society Management System

## Project Overview
This is a comprehensive web-based management system designed for the **Sri Vivekananda Mutually Aided Co-Operative House Building Society Ltd., Bapatla**. The application streamlines the management of housing society records, including house ownership details, payment tracking, receipt generation, and financial reporting.

## Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (using Mongoose ODM)
- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3 (Responsive)
- **Authentication:** JWT (JSON Web Tokens), Bcrypt.js
- **PDF Generation:** jsPDF, jspdf-autotable (Client-side)
- **Security:** Helmet, Express Rate Limit, XSS-Clean, Mongo Sanitize, HPP

## Core Features

### 1. Authentication & Security
- **Secure Login:** JWT-based authentication with session management.
- **Role-Based Access:** Admin-protected routes and API endpoints.
- **Security Measures:** 
  - Rate limiting (Brute-force protection)
  - XSS (Cross-Site Scripting) protection
  - NoSQL Injection prevention
  - Secure HTTP headers (Helmet)
  - Password Hashing (Bcrypt)

### 2. Dashboard
- **Real-time Statistics:** Displays total houses, paid/unpaid counts, and total collection for the current year.
- **Visual Indicators:** Progress bars for collection status.
- **Recent Activity:** Quick view of the latest 5 transactions.
- **State Persistence:** Remembers the active tab/section across page refreshes.

### 3. House Management
- **CRUD Operations:** Add, Edit, Delete, and View house details.
- **Search:** Real-time filtering by House Number or Owner Name.
- **Status Tracking:** Visual indicators for Payment Status (Paid/Unpaid) for the selected year.

### 4. Payment Management
- **Transaction Recording:** Record Maintenance charges, Temple Fund contributions, etc.
- **Payment Modes:** Support for Cash, Bank Transfer, Cheque, etc., with reference numbers.
- **Duplicate Check:** Auto-detection of duplicate payments for the same house/year/type.
- **Receipt Generation:** Automatic generation of professional PDF receipts using `jsPDF`.
- **History:** Searchable payment history with date and year filters.

### 5. Reporting
- **Financial Reports:** Generate lists of Paid and Unpaid members for any given year.
- **PDF Export:** Download detailed reports for offline use or printing.
- **Dynamic Filtering:** Filter reports by payment type (Maintenance, Temple Fund, etc.).

### 6. User Management (Settings)
- **Admin Control:** Create and Delete system users (Admins).
- **Self-Service:** Secure "Change Password" functionality for logged-in users.

## Project Structure
```
/app
├── models/             # Mongoose Schemas (User, House, Payment)
├── routes/             # Express API Routes (Auth, Houses, Payments, Reports)
├── middleware/         # Auth verification & Security middleware
├── public/             # Static Assets (Frontend)
│   ├── css/            # Stylesheets
│   ├── js/             # Main Application Logic (app.js)
│   └── *.html          # Dashboard and Login views
├── server.js           # Entry point & Server configuration
└── .env                # Environment variables (Port, Mongo URI, Secrets)
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/register` - Create new user
- `PUT /api/auth/change-password` - Update password
- `GET /api/auth/users` - List all users
- `DELETE /api/auth/users/:id` - Delete a user

### Houses
- `GET /api/houses` - Get all houses (with payment status)
- `POST /api/houses` - Add new house
- `PUT /api/houses/:id` - Update house details
- `DELETE /api/houses/:id` - Delete house

### Payments
- `GET /api/payments` - Get payment history
- `POST /api/payments` - Record new payment
- `DELETE /api/payments/:id` - Delete payment entry

### Reports
- `GET /api/reports/:year` - Get Paid/Unpaid stats and lists

## Setup & Run
1. **Install Dependencies:** `npm install`
2. **Environment:** Configure `.env` with `MONGO_URI` and `JWT_SECRET`.
3. **Start Server:** `npm start` (Runs on Port 5000 by default).
