require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Database connection ──────────────────────────────────────────────────────
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || "expense_tracker",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "",
      }
);

pool.connect((err) => {
  if (err) {
    console.error("Failed to connect to PostgreSQL:", err.message);
    console.error(
      "    Make sure PostgreSQL is running and your .env values are correct."
    );
  } else {
    console.log("Connected to PostgreSQL");
  }
});

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── Helpers ──────────────────────────────────────────────────────────────────
const VALID_CATEGORIES = ["food", "travel", "shopping", "other"];

function validateExpense({ description, amount, category, expense_date }) {
  const errors = [];
  if (!description || description.trim().length === 0)
    errors.push("Description is required.");
  if (amount === undefined || amount === null || isNaN(Number(amount)))
    errors.push("Amount must be a number.");
  if (Number(amount) <= 0) errors.push("Amount must be greater than 0.");
  if (!VALID_CATEGORIES.includes(category))
    errors.push(`Category must be one of: ${VALID_CATEGORIES.join(", ")}.`);
  if (expense_date && isNaN(Date.parse(expense_date)))
    errors.push("Invalid date format.");
  return errors;
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/expenses  — list all, optional ?category= and ?date= filters
app.get("/api/expenses", async (req, res) => {
  try {
    const { category, date } = req.query;
    const values = [];
    const conditions = [];

    if (category && VALID_CATEGORIES.includes(category)) {
      values.push(category);
      conditions.push(`category = $${values.length}`);
    }
    if (date) {
      values.push(date);
      conditions.push(`expense_date = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `
      SELECT id, description, amount, category, TO_CHAR(expense_date, 'YYYY-MM-DD') AS expense_date
      FROM expenses
      ${where}
      ORDER BY expense_date DESC, created_at DESC
    `;
    const { rows } = await pool.query(query, values);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/expenses:", err);
    res.status(500).json({ error: "Failed to fetch expenses." });
  }
});

// GET /api/expenses/summary  — totals per category
app.get("/api/expenses/summary", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT category, COALESCE(SUM(amount), 0)::float AS total
      FROM expenses
      GROUP BY category
      ORDER BY category
    `);
    // Return zero-value rows for categories with no expenses
    const summary = {};
    VALID_CATEGORIES.forEach((c) => (summary[c] = 0));
    rows.forEach((r) => (summary[r.category] = r.total));
    res.json(summary);
  } catch (err) {
    console.error("GET /api/expenses/summary:", err);
    res.status(500).json({ error: "Failed to fetch summary." });
  }
});

// POST /api/expenses  — add a new expense
app.post("/api/expenses", async (req, res) => {
  const { description, amount, category, expense_date } = req.body;
  const errors = validateExpense({ description, amount, category, expense_date });
  if (errors.length) return res.status(400).json({ errors });

  try {
    const { rows } = await pool.query(
      `INSERT INTO expenses (description, amount, category, expense_date)
       VALUES ($1, $2, $3, $4)
       RETURNING id, description, amount, category, TO_CHAR(expense_date, 'YYYY-MM-DD') AS expense_date`,
      [
        description.trim(),
        Number(amount),
        category,
        expense_date || new Date().toISOString().split("T")[0],
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /api/expenses:", err);
    res.status(500).json({ error: "Failed to add expense." });
  }
});

// DELETE /api/expenses/:id  — remove an expense
app.delete("/api/expenses/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID." });

  try {
    const { rowCount } = await pool.query(
      "DELETE FROM expenses WHERE id = $1",
      [id]
    );
    if (rowCount === 0)
      return res.status(404).json({ error: "Expense not found." });
    res.json({ message: "Expense deleted." });
  } catch (err) {
    console.error("DELETE /api/expenses/:id:", err);
    res.status(500).json({ error: "Failed to delete expense." });
  }
});

// Fallback: serve index.html for any non-API route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  Expense Tracker running at http://localhost:${PORT}`);
});
