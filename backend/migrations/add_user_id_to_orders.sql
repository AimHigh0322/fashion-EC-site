-- Migration: Add user_id column to orders table
-- This allows direct access to user_id without JOINing with customers table

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) NULL AFTER customer_id;

CREATE INDEX IF NOT EXISTS idx_user_id ON orders(user_id);

