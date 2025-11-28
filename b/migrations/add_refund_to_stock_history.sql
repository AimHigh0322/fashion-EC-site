-- Migration: Add 'refund' to stock_history change_type ENUM
-- This allows distinguishing between returns and refunds in stock history

-- Note: MySQL ENUM modification requires ALTER TABLE
-- If the table already has data, this will work fine

ALTER TABLE stock_history 
MODIFY COLUMN change_type ENUM('order', 'restock', 'adjustment', 'cancel', 'return', 'refund') NOT NULL;

