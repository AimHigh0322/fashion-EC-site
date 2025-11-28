const pool = require("../db/db");

async function getDashboardStats(req, res) {
  try {
    // Get total sales (sum of all completed orders)
    const [salesResult] = await pool.query(
      `SELECT 
        COALESCE(SUM(total_amount), 0) as total_sales,
        COUNT(*) as total_orders
       FROM orders 
       WHERE payment_status = 'paid'`
    );

    // Get total products count
    const [productsResult] = await pool.query(
      `SELECT COUNT(*) as total_products FROM products`
    );

    // Get total customers count (users with role 'user')
    const [customersResult] = await pool.query(
      `SELECT COUNT(*) as total_customers FROM users WHERE role = 'user'`
    );

    // Get sales comparison (current month vs previous month)
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [currentMonthSales] = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as sales 
       FROM orders 
       WHERE payment_status = 'paid' 
       AND createdAt >= ?`,
      [currentMonthStart]
    );

    const [previousMonthSales] = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as sales 
       FROM orders 
       WHERE payment_status = 'paid' 
       AND createdAt >= ? AND createdAt < ?`,
      [previousMonthStart, currentMonthStart]
    );

    // Calculate sales change percentage
    const currentSales = parseFloat(currentMonthSales[0]?.sales || 0);
    const previousSales = parseFloat(previousMonthSales[0]?.sales || 0);
    const salesChange = previousSales > 0 
      ? ((currentSales - previousSales) / previousSales * 100).toFixed(1)
      : currentSales > 0 ? "100.0" : "0.0";

    // Get orders comparison
    const [currentMonthOrders] = await pool.query(
      `SELECT COUNT(*) as count 
       FROM orders 
       WHERE createdAt >= ?`,
      [currentMonthStart]
    );

    const [previousMonthOrders] = await pool.query(
      `SELECT COUNT(*) as count 
       FROM orders 
       WHERE createdAt >= ? AND createdAt < ?`,
      [previousMonthStart, currentMonthStart]
    );

    const currentOrders = parseInt(currentMonthOrders[0]?.count || 0);
    const previousOrders = parseInt(previousMonthOrders[0]?.count || 0);
    const ordersChange = previousOrders > 0
      ? ((currentOrders - previousOrders) / previousOrders * 100).toFixed(1)
      : currentOrders > 0 ? "100.0" : "0.0";

    // Get products comparison (new products this month vs last month)
    const [currentMonthProducts] = await pool.query(
      `SELECT COUNT(*) as count 
       FROM products 
       WHERE createdAt >= ?`,
      [currentMonthStart]
    );

    const [previousMonthProducts] = await pool.query(
      `SELECT COUNT(*) as count 
       FROM products 
       WHERE createdAt >= ? AND createdAt < ?`,
      [previousMonthStart, currentMonthStart]
    );

    const currentProducts = parseInt(currentMonthProducts[0]?.count || 0);
    const previousProducts = parseInt(previousMonthProducts[0]?.count || 0);
    const productsChange = previousProducts > 0
      ? ((currentProducts - previousProducts) / previousProducts * 100).toFixed(1)
      : currentProducts > 0 ? "100.0" : "0.0";

    // Get customers comparison
    const [currentMonthCustomers] = await pool.query(
      `SELECT COUNT(*) as count 
       FROM users 
       WHERE role = 'user' AND createdAt >= ?`,
      [currentMonthStart]
    );

    const [previousMonthCustomers] = await pool.query(
      `SELECT COUNT(*) as count 
       FROM users 
       WHERE role = 'user' AND createdAt >= ? AND createdAt < ?`,
      [previousMonthStart, currentMonthStart]
    );

    const currentCustomers = parseInt(currentMonthCustomers[0]?.count || 0);
    const previousCustomers = parseInt(previousMonthCustomers[0]?.count || 0);
    const customersChange = previousCustomers > 0
      ? ((currentCustomers - previousCustomers) / previousCustomers * 100).toFixed(1)
      : currentCustomers > 0 ? "100.0" : "0.0";

    res.json({
      success: true,
      data: {
        totalSales: parseFloat(salesResult[0]?.total_sales || 0),
        totalOrders: parseInt(salesResult[0]?.total_orders || 0),
        totalProducts: parseInt(productsResult[0]?.total_products || 0),
        totalCustomers: parseInt(customersResult[0]?.total_customers || 0),
        salesChange: parseFloat(salesChange),
        ordersChange: parseFloat(ordersChange),
        productsChange: parseFloat(productsChange),
        customersChange: parseFloat(customersChange),
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "ダッシュボード統計の取得に失敗しました",
      error: error.message,
    });
  }
}

async function getRecentOrders(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const [orders] = await pool.query(
      `SELECT 
        o.id,
        o.order_number,
        o.status,
        o.total_amount,
        o.payment_status,
        o.createdAt,
        c.first_name,
        c.last_name,
        c.email,
        u.username
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.createdAt DESC
       LIMIT ?`,
      [limit]
    );

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      customer: order.username || 
                (order.first_name && order.last_name 
                  ? `${order.first_name} ${order.last_name}` 
                  : order.email || "ゲスト"),
      amount: parseFloat(order.total_amount || 0),
      status: order.status,
      paymentStatus: order.payment_status,
      createdAt: order.createdAt,
    }));

    res.json({
      success: true,
      data: formattedOrders,
    });
  } catch (error) {
    console.error("Recent orders error:", error);
    res.status(500).json({
      success: false,
      message: "最近の注文の取得に失敗しました",
      error: error.message,
    });
  }
}

module.exports = {
  getDashboardStats,
  getRecentOrders,
};

