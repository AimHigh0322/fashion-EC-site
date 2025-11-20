-- SQL Queries to Check Database Changes After Product Return/Refund
-- ================================================================

-- 1. Check Order Payment Status (should be 'refunded')
-- -----------------------------------------------------
SELECT 
    id,
    order_number,
    payment_status,
    status,
    total_amount,
    payment_method,
    updatedAt
FROM orders
WHERE id = 'YOUR_ORDER_ID_HERE'
   OR order_number = 'YOUR_ORDER_NUMBER_HERE';

-- 2. Check All Refunded Orders
-- -----------------------------
SELECT 
    id,
    order_number,
    payment_status,
    status,
    total_amount,
    createdAt,
    updatedAt
FROM orders
WHERE payment_status = 'refunded'
ORDER BY updatedAt DESC;

-- 3. Check Product Stock Changes (Before and After Refund)
-- --------------------------------------------------------
-- Check current stock for products in a refunded order
SELECT 
    p.id,
    p.name,
    p.sku,
    p.stock_quantity,
    oi.quantity as refunded_quantity,
    o.order_number,
    o.payment_status
FROM products p
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.id = 'YOUR_ORDER_ID_HERE'
   OR o.order_number = 'YOUR_ORDER_NUMBER_HERE';

-- 4. Check Stock History for Refunded Products
-- ---------------------------------------------
-- View stock history entries created during refund
SELECT 
    sh.id,
    sh.product_id,
    p.name as product_name,
    p.sku,
    sh.change_type,
    sh.quantity_change,
    sh.quantity_before,
    sh.quantity_after,
    sh.reference_id as order_id,
    sh.reference_type,
    sh.notes,
    sh.createdAt,
    u.username as created_by_name
FROM stock_history sh
JOIN products p ON sh.product_id = p.id
LEFT JOIN users u ON sh.created_by = u.id
WHERE sh.reference_id = 'YOUR_ORDER_ID_HERE'
  AND sh.change_type = 'refund'
ORDER BY sh.createdAt DESC;

-- 5. Check All Refund Stock History (Recent Refunds)
-- ---------------------------------------------------
SELECT 
    sh.id,
    sh.product_id,
    p.name as product_name,
    p.sku,
    sh.change_type,
    sh.quantity_change,
    sh.quantity_before,
    sh.quantity_after,
    sh.reference_id as order_id,
    o.order_number,
    sh.notes,
    sh.createdAt,
    u.username as created_by_name
FROM stock_history sh
JOIN products p ON sh.product_id = p.id
LEFT JOIN orders o ON sh.reference_id = o.id
LEFT JOIN users u ON sh.created_by = u.id
WHERE sh.change_type = 'refund'
ORDER BY sh.createdAt DESC
LIMIT 50;

-- 6. Verify Stock Restoration for Specific Order
-- -----------------------------------------------
-- This query shows if stock was properly restored
SELECT 
    o.id as order_id,
    o.order_number,
    o.payment_status,
    oi.product_id,
    p.name as product_name,
    p.stock_quantity as current_stock,
    oi.quantity as refunded_quantity,
    sh.quantity_change as stock_restored,
    sh.quantity_before as stock_before_refund,
    sh.quantity_after as stock_after_refund,
    sh.createdAt as refund_date
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
LEFT JOIN stock_history sh ON sh.reference_id = o.id 
    AND sh.product_id = p.id 
    AND sh.change_type = 'refund'
WHERE o.id = 'YOUR_ORDER_ID_HERE'
   OR o.order_number = 'YOUR_ORDER_NUMBER_HERE';

-- 7. Summary: Total Refunds and Stock Restored
-- ---------------------------------------------
SELECT 
    COUNT(DISTINCT o.id) as total_refunded_orders,
    COUNT(DISTINCT oi.product_id) as unique_products_refunded,
    SUM(oi.quantity) as total_items_refunded,
    SUM(oi.quantity * oi.price) as total_amount_refunded
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.payment_status = 'refunded'
  AND o.updatedAt >= datetime('now', '-7 days'); -- Last 7 days

-- 8. Check if Stock History Exists for Refund (Verification)
-- -----------------------------------------------------------
-- This helps verify that stock history logging is working
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'Stock history logged ✓'
        ELSE 'Stock history NOT logged ✗'
    END as status,
    COUNT(*) as history_entries
FROM stock_history
WHERE reference_id = 'YOUR_ORDER_ID_HERE'
  AND change_type = 'refund';

