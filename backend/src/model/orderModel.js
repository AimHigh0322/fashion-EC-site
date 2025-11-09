const pool = require("../db/db");
const { v4: uuidv4 } = require("uuid");

function generateOrderNumber() {
  return "ORD-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
}

async function createOrder(orderData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const orderId = uuidv4();
    const orderNumber = generateOrderNumber();

    // Create or get customer
    let customerId = orderData.customer_id;
    if (!customerId && orderData.customer) {
      const [existing] = await connection.query(
        "SELECT id FROM customers WHERE email = ?",
        [orderData.customer.email]
      );
      if (existing.length > 0) {
        customerId = existing[0].id;
      } else {
        customerId = uuidv4();
        await connection.query(
          `INSERT INTO customers (id, email, first_name, last_name, phone, address, city, postal_code, country)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            customerId,
            orderData.customer.email,
            orderData.customer.first_name || null,
            orderData.customer.last_name || null,
            orderData.customer.phone || null,
            orderData.customer.address || null,
            orderData.customer.city || null,
            orderData.customer.postal_code || null,
            orderData.customer.country || null,
          ]
        );
      }
    }

    // Create order
    await connection.query(
      `INSERT INTO orders (id, order_number, customer_id, status, total_amount, shipping_cost, tax_amount, payment_status, payment_method, shipping_address, billing_address, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        orderNumber,
        customerId,
        orderData.status || "pending",
        orderData.total_amount,
        orderData.shipping_cost || 0,
        orderData.tax_amount || 0,
        orderData.payment_status || "pending",
        orderData.payment_method || null,
        JSON.stringify(orderData.shipping_address || {}),
        JSON.stringify(orderData.billing_address || {}),
        orderData.notes || null,
      ]
    );

    // Create order items
    for (const item of orderData.items || []) {
      await connection.query(
        `INSERT INTO order_items (id, order_id, product_id, sku, product_name, quantity, price, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          orderId,
          item.product_id,
          item.sku,
          item.product_name,
          item.quantity,
          item.price,
          item.price * item.quantity,
        ]
      );
    }

    await connection.commit();
    return { id: orderId, order_number: orderNumber };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getOrders(filters = {}) {
  let query = `
    SELECT o.*, c.email as customer_email, c.first_name, c.last_name
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.status) {
    query += " AND o.status = ?";
    params.push(filters.status);
  }
  if (filters.order_number) {
    query += " AND o.order_number LIKE ?";
    params.push(`%${filters.order_number}%`);
  }
  if (filters.customer_email) {
    query += " AND c.email LIKE ?";
    params.push(`%${filters.customer_email}%`);
  }

  query += " ORDER BY o.createdAt DESC";
  if (filters.limit) {
    query += " LIMIT ?";
    params.push(parseInt(filters.limit));
  }

  const [orders] = await pool.query(query, params);
  return orders;
}

async function getOrderById(orderId) {
  const [orders] = await pool.query(
    `SELECT o.*, c.*
     FROM orders o
     LEFT JOIN customers c ON o.customer_id = c.id
     WHERE o.id = ?`,
    [orderId]
  );

  if (orders.length === 0) return null;

  const order = orders[0];
  const [items] = await pool.query(
    "SELECT * FROM order_items WHERE order_id = ?",
    [orderId]
  );
  order.items = items;

  const [tracking] = await pool.query(
    "SELECT * FROM shipping_tracking WHERE order_id = ? ORDER BY createdAt DESC LIMIT 1",
    [orderId]
  );
  order.tracking = tracking.length > 0 ? tracking[0] : null;

  return order;
}

async function updateOrderStatus(orderId, status) {
  await pool.query("UPDATE orders SET status = ? WHERE id = ?", [status, orderId]);
  return { id: orderId, status };
}

async function addShippingTracking(orderId, trackingData) {
  const trackingId = uuidv4();
  await pool.query(
    `INSERT INTO shipping_tracking (id, order_id, tracking_number, carrier, carrier_url, status, shipped_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      trackingId,
      orderId,
      trackingData.tracking_number,
      trackingData.carrier,
      trackingData.carrier_url || null,
      trackingData.status || "shipped",
      trackingData.shipped_at ? new Date(trackingData.shipped_at) : new Date(),
    ]
  );
  return { id: trackingId };
}

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  addShippingTracking,
};

