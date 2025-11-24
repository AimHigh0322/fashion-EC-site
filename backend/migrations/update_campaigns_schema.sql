-- Migration: Update campaigns table with new fields
-- Run this migration to add new campaign fields

-- Add new columns to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS target_type ENUM('product', 'category', 'all') DEFAULT 'product' AFTER type,
ADD COLUMN IF NOT EXISTS discount_type ENUM('percent', 'amount', 'freeShipping', 'points') DEFAULT 'percent' AFTER discount_percent,
ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10, 2) DEFAULT NULL AFTER discount_type,
ADD COLUMN IF NOT EXISTS minimum_purchase DECIMAL(10, 2) DEFAULT 0 AFTER discount_value,
ADD COLUMN IF NOT EXISTS usage_limit INT DEFAULT NULL AFTER minimum_purchase,
ADD COLUMN IF NOT EXISTS user_limit INT DEFAULT NULL AFTER usage_limit,
ADD COLUMN IF NOT EXISTS status ENUM('active', 'inactive') DEFAULT 'active' AFTER is_active,
ADD COLUMN IF NOT EXISTS label VARCHAR(255) DEFAULT NULL AFTER description,
ADD COLUMN IF NOT EXISTS current_usage INT DEFAULT 0 AFTER user_limit;

-- Create campaign_targets table for storing target IDs (products/categories)
CREATE TABLE IF NOT EXISTS campaign_targets (
  id VARCHAR(255) PRIMARY KEY,
  campaign_id VARCHAR(255) NOT NULL,
  target_id VARCHAR(255) NOT NULL,
  target_type ENUM('product', 'category') NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_campaign (campaign_id),
  INDEX idx_target (target_id, target_type),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  UNIQUE KEY unique_campaign_target (campaign_id, target_id, target_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create campaign_usage table for tracking campaign usage per user
CREATE TABLE IF NOT EXISTS campaign_usage (
  id VARCHAR(255) PRIMARY KEY,
  campaign_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  usage_count INT DEFAULT 1,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_campaign (campaign_id),
  INDEX idx_user (user_id),
  INDEX idx_campaign_user (campaign_id, user_id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_campaign_user (campaign_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

