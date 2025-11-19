const pool = require("../db/db");
const { v4: uuidv4 } = require("uuid");
const stockHistoryModel = require("./stockHistoryModel");

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

    // Create order items and update stock
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

      // Get current stock
      const [products] = await connection.query(
        "SELECT stock_quantity FROM products WHERE id = ?",
        [item.product_id]
      );

      if (products.length > 0) {
        const quantityBefore = products[0].stock_quantity;
        const quantityAfter = quantityBefore - item.quantity;

        // Update product stock
        await connection.query(
          "UPDATE products SET stock_quantity = ? WHERE id = ?",
          [quantityAfter, item.product_id]
        );

        // Record stock history
        const historyId = uuidv4();
        await connection.query(
          `INSERT INTO stock_history 
           (id, product_id, change_type, quantity_change, quantity_before, quantity_after, 
            reference_id, reference_type, notes) 
           VALUES (?, ?, 'order', ?, ?, ?, ?, 'order', ?)`,
          [
            historyId,
            item.product_id,
            -item.quantity,
            quantityBefore,
            quantityAfter,
            orderId,
            `注文 ${orderNumber} により在庫減少`,
          ]
        );

        // Update product status if out of stock
        if (quantityAfter === 0) {
          await connection.query(
            "UPDATE products SET status = 'out_of_stock' WHERE id = ?",
            [item.product_id]
          );
        }
      }
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
    SELECT o.*, c.email as customer_email, c.first_name, c.last_name, c.user_id
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.user_id) {
    query += " AND c.user_id = ?";
    params.push(filters.user_id);
  }
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
  if (filters.payment_status) {
    query += " AND o.payment_status = ?";
    params.push(filters.payment_status);
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
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const trackingId = uuidv4();
    await connection.query(
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

    // Update order status to shipped if not already
    await connection.query(
      `UPDATE orders SET status = 'shipped' WHERE id = ? AND status NOT IN ('cancelled', 'delivered')`,
      [orderId]
    );

    await connection.commit();
    return { id: trackingId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateShippingTracking(trackingId, trackingData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const updates = [];
    const values = [];

    if (trackingData.status !== undefined) {
      updates.push("status = ?");
      values.push(trackingData.status);
    }
    if (trackingData.tracking_number !== undefined) {
      updates.push("tracking_number = ?");
      values.push(trackingData.tracking_number);
    }
    if (trackingData.carrier !== undefined) {
      updates.push("carrier = ?");
      values.push(trackingData.carrier);
    }
    if (trackingData.carrier_url !== undefined) {
      updates.push("carrier_url = ?");
      values.push(trackingData.carrier_url);
    }
    if (trackingData.delivered_at !== undefined) {
      updates.push("delivered_at = ?");
      values.push(trackingData.delivered_at ? new Date(trackingData.delivered_at) : null);
    }

    if (updates.length > 0) {
      values.push(trackingId);
      await connection.query(
        `UPDATE shipping_tracking SET ${updates.join(", ")} WHERE id = ?`,
        values
      );

      // If status is delivered, update order status
      if (trackingData.status === "delivered") {
        const [tracking] = await connection.query(
          "SELECT order_id FROM shipping_tracking WHERE id = ?",
          [trackingId]
        );
        if (tracking.length > 0) {
          await connection.query(
            `UPDATE orders SET status = 'delivered' WHERE id = ?`,
            [tracking[0].order_id]
          );
        }
      }
    }

    await connection.commit();
    return { id: trackingId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function cancelOrder(orderId, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get order to verify ownership and check if it can be cancelled
    const [orders] = await connection.query(
      `SELECT o.*, c.user_id 
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.id = ?`,
      [orderId]
    );

    if (orders.length === 0) {
      throw new Error("注文が見つかりません");
    }

    const order = orders[0];

    // Verify ownership (only for user role, admin can cancel any order)
    if (userId && order.user_id !== userId) {
      throw new Error("この注文をキャンセルする権限がありません");
    }

    // Check if order can be cancelled
    if (order.status === "delivered") {
      throw new Error("配達済みの注文はキャンセルできません");
    }
    if (order.status === "cancelled") {
      throw new Error("この注文は既にキャンセルされています");
    }
    if (order.status === "shipped") {
      throw new Error("発送済みの注文はキャンセルできません。カスタマーサポートにお問い合わせください");
    }

    // Update order status to cancelled
    await connection.query(
      "UPDATE orders SET status = 'cancelled' WHERE id = ?",
      [orderId]
    );

    // Restore product stock
    const [items] = await connection.query(
      "SELECT product_id, quantity FROM order_items WHERE order_id = ?",
      [orderId]
    );

    for (const item of items) {
      // Get current stock
      const [products] = await connection.query(
        "SELECT stock_quantity FROM products WHERE id = ?",
        [item.product_id]
      );

      if (products.length > 0) {
        const quantityBefore = products[0].stock_quantity;
        const quantityAfter = quantityBefore + item.quantity;

        // Update product stock
        await connection.query(
          "UPDATE products SET stock_quantity = ? WHERE id = ?",
          [quantityAfter, item.product_id]
        );

        // Record stock history
        const historyId = uuidv4();
        await connection.query(
          `INSERT INTO stock_history 
           (id, product_id, change_type, quantity_change, quantity_before, quantity_after, 
            reference_id, reference_type, notes) 
           VALUES (?, ?, 'cancel', ?, ?, ?, ?, 'order', ?)`,
          [
            historyId,
            item.product_id,
            item.quantity,
            quantityBefore,
            quantityAfter,
            orderId,
            `注文 ${order.order_number} のキャンセルにより在庫復元`,
          ]
        );

        // Restore to active if restocked
        if (quantityBefore === 0 && quantityAfter > 0) {
          await connection.query(
            "UPDATE products SET status = 'active' WHERE id = ?",
            [item.product_id]
          );
        }
      }
    }

    await connection.commit();
    return { id: orderId, status: "cancelled" };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getOrdersByUser(userId, filters = {}) {
  return getOrders({ ...filters, user_id: userId });
}

async function updateOrderPaymentStatus(orderId, paymentStatus) {
  await pool.query(
    "UPDATE orders SET payment_status = ? WHERE id = ?",
    [paymentStatus, orderId]
  );
  return { id: orderId, payment_status: paymentStatus };
}

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  addShippingTracking,
  updateShippingTracking,
  cancelOrder,
  getOrdersByUser,
  updateOrderPaymentStatus,
};

