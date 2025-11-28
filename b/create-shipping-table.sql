-- Create shipping_addresses table
CREATE TABLE IF NOT EXISTS shipping_addresses (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  prefecture VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  phone VARCHAR(50) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_default (user_id, is_default),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

