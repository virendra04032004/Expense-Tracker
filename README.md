# Expense Tracker

A full-stack expense tracker with Node.js/Express backend, PostgreSQL database, and a styled frontend with Chart.js charts.

---

## Project Structure

```
expense-tracker/
├── server.js          ← Express backend + REST API
├── schema.sql         ← PostgreSQL table definition
├── package.json       ← Node.js dependencies
├── .env.example       ← Environment variable template
└── public/
    ├── index.html
    ├── style.css   ← Frontend 
``` └── script.js

---

## ⚙️ Setup Instructions

### 1. Install Node.js dependencies
```bash
npm install
```

### 2. Set up PostgreSQL

Make sure PostgreSQL is installed and running. Then create a database:
```bash
psql -U postgres
```
```sql
CREATE DATABASE expense_tracker;
\q
```

Run the schema to create the table:
```bash
psql -U virendra -d Expense-Tracker -f schema.sql
```

### 3. Configure environment variables
```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL credentials:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Expense-Tracker
DB_USER=virendra
DB_PASSWORD=Viren@123
PORT=3000
```

### 4. Start the server
```bash
# Production
npm start

# Development (auto-restarts on file changes)
npm run dev
```

### 5. Open the app
Visit: **http://localhost:3000**

---

##  API Endpoints

| Method | Route                   | Description                     |
|--------|-------                  |-------------                    |
| GET    | `/api/expenses`         | List all expenses (supports `?category=` and `?date=` filters) |
| GET    | `/api/expenses/summary` | Category totals                 |
| POST   | `/api/expenses`         | Add a new expense               |
| DELETE | `/api/expenses/:id`     | Delete an expense               |

### POST body example
```json
{
  "description": "Lunch",
  "amount": 12.50,
  "category": "food",
  "expense_date": "2024-01-15"
}
```

Valid categories: `food`, `travel`, `shopping`, `other`

---

##  Features

-  Add expenses with description, amount, category, and date
-  Category badges (Food , Travel , Shopping , Other )
-  Filter expenses by category and/or date
-  Summary cards with per-category totals + grand total
-  Doughnut chart — spending breakdown by category
-  Bar chart — daily spending over the last 7 days
-  Delete any expense with confirmation
-  Toast notifications for feedback
-  Custom "Kirang Haerang" font styling throughout
