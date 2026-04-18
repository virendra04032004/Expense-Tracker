-- Run this file once to set up your database
-- psql -U your_user -d your_database -f schema.sql

CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    category VARCHAR(50) NOT NULL CHECK (category IN ('food', 'travel', 'shopping', 'other')),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optional: seed some sample data
-- INSERT INTO expenses (description, amount, category, expense_date) VALUES
-- ('Lunch at cafe', 12.50, 'food', CURRENT_DATE),
-- ('Bus ticket', 3.00, 'travel', CURRENT_DATE),
-- ('T-shirt', 25.00, 'shopping', CURRENT_DATE);
