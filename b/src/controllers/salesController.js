const pool = require("../db/db");

// 日別集計
async function getDailySales(req, res) {
  try {
    const { start_date, end_date, product_id, category_id } = req.query;

    let query = `
      SELECT 
        DATE(o.createdAt) as date,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_sales,
        COALESCE(AVG(o.total_amount), 0) as avg_order_amount,
        COUNT(DISTINCT oi.product_id) as unique_products_sold,
        COALESCE(SUM(oi.quantity), 0) as total_items_sold
      FROM orders o
      INNER JOIN order_items oi ON o.id = oi.order_id
      WHERE o.payment_status = 'paid'
    `;

    const params = [];

    if (start_date) {
      query += ` AND DATE(o.createdAt) >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(o.createdAt) <= ?`;
      params.push(end_date);
    }

    if (product_id) {
      query += ` AND oi.product_id = ?`;
      params.push(product_id);
    }

    if (category_id) {
      query += ` AND oi.product_id IN (
        SELECT product_id FROM product_categories WHERE category_id = ?
      )`;
      params.push(category_id);
    }

    query += ` GROUP BY DATE(o.createdAt) ORDER BY date DESC`;

    const [results] = await pool.query(query, params);

    // Convert to numbers
    const formattedResults = results.map((row) => ({
      date: row.date,
      order_count: parseInt(row.order_count) || 0,
      total_sales: parseFloat(row.total_sales) || 0,
      avg_order_amount: parseFloat(row.avg_order_amount) || 0,
      unique_products_sold: parseInt(row.unique_products_sold) || 0,
      total_items_sold: parseInt(row.total_items_sold) || 0,
    }));

    res.json({ success: true, data: formattedResults });
  } catch (error) {
    console.error("Daily sales error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// 月別集計
async function getMonthlySales(req, res) {
  try {
    const { start_month, end_month, product_id, category_id } = req.query;

    let query = `
      SELECT 
        DATE_FORMAT(o.createdAt, '%Y-%m') as month,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_sales,
        COALESCE(AVG(o.total_amount), 0) as avg_order_amount,
        COUNT(DISTINCT oi.product_id) as unique_products_sold,
        COALESCE(SUM(oi.quantity), 0) as total_items_sold
      FROM orders o
      INNER JOIN order_items oi ON o.id = oi.order_id
      WHERE o.payment_status = 'paid'
    `;

    const params = [];

    if (start_month) {
      query += ` AND DATE_FORMAT(o.createdAt, '%Y-%m') >= ?`;
      params.push(start_month);
    }

    if (end_month) {
      query += ` AND DATE_FORMAT(o.createdAt, '%Y-%m') <= ?`;
      params.push(end_month);
    }

    if (product_id) {
      query += ` AND oi.product_id = ?`;
      params.push(product_id);
    }

    if (category_id) {
      query += ` AND oi.product_id IN (
        SELECT product_id FROM product_categories WHERE category_id = ?
      )`;
      params.push(category_id);
    }

    query += ` GROUP BY DATE_FORMAT(o.createdAt, '%Y-%m') ORDER BY month DESC`;

    const [results] = await pool.query(query, params);

    // Convert to numbers
    const formattedResults = results.map((row) => ({
      month: row.month,
      order_count: parseInt(row.order_count) || 0,
      total_sales: parseFloat(row.total_sales) || 0,
      avg_order_amount: parseFloat(row.avg_order_amount) || 0,
      unique_products_sold: parseInt(row.unique_products_sold) || 0,
      total_items_sold: parseInt(row.total_items_sold) || 0,
    }));

    res.json({ success: true, data: formattedResults });
  } catch (error) {
    console.error("Monthly sales error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// 商品別集計
async function getProductSales(req, res) {
  try {
    const { start_date, end_date, limit = 50 } = req.query;

    let query = `
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.category_names,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(oi.quantity), 0) as total_quantity_sold,
        COALESCE(SUM(oi.total), 0) as total_sales,
        COALESCE(AVG(oi.price), 0) as avg_price,
        COALESCE(MIN(oi.price), 0) as min_price,
        COALESCE(MAX(oi.price), 0) as max_price
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      INNER JOIN products p ON oi.product_id = p.id
      WHERE o.payment_status = 'paid'
    `;

    const params = [];

    if (start_date) {
      query += ` AND DATE(o.createdAt) >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(o.createdAt) <= ?`;
      params.push(end_date);
    }

    query += ` 
      GROUP BY p.id, p.sku, p.name, p.category_names
      ORDER BY total_sales DESC
      LIMIT ?
    `;
    params.push(parseInt(limit));

    const [results] = await pool.query(query, params);

    // Convert to numbers
    const formattedResults = results.map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      category_names: row.category_names,
      order_count: parseInt(row.order_count) || 0,
      total_quantity_sold: parseInt(row.total_quantity_sold) || 0,
      total_sales: parseFloat(row.total_sales) || 0,
      avg_price: parseFloat(row.avg_price) || 0,
      min_price: parseFloat(row.min_price) || 0,
      max_price: parseFloat(row.max_price) || 0,
    }));

    res.json({ success: true, data: formattedResults });
  } catch (error) {
    console.error("Product sales error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// カテゴリ別集計
async function getCategorySales(req, res) {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT 
        c.id,
        c.name,
        c.slug,
        COUNT(DISTINCT o.id) as order_count,
        COUNT(DISTINCT oi.product_id) as unique_products,
        COALESCE(SUM(oi.quantity), 0) as total_quantity_sold,
        COALESCE(SUM(oi.total), 0) as total_sales,
        COALESCE(AVG(oi.total), 0) as avg_order_value
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      INNER JOIN product_categories pc ON oi.product_id = pc.product_id
      INNER JOIN categories c ON pc.category_id = c.id
      WHERE o.payment_status = 'paid'
    `;

    const params = [];

    if (start_date) {
      query += ` AND DATE(o.createdAt) >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(o.createdAt) <= ?`;
      params.push(end_date);
    }

    query += ` 
      GROUP BY c.id, c.name, c.slug
      ORDER BY total_sales DESC
    `;

    const [results] = await pool.query(query, params);

    // Convert to numbers
    const formattedResults = results.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      order_count: parseInt(row.order_count) || 0,
      unique_products: parseInt(row.unique_products) || 0,
      total_quantity_sold: parseInt(row.total_quantity_sold) || 0,
      total_sales: parseFloat(row.total_sales) || 0,
      avg_order_value: parseFloat(row.avg_order_value) || 0,
    }));

    res.json({ success: true, data: formattedResults });
  } catch (error) {
    console.error("Category sales error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getDailySales,
  getMonthlySales,
  getProductSales,
  getCategorySales,
};

