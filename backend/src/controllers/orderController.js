const orderModel = require("../model/orderModel");
const { logAudit } = require("../middleware/auditLogger");
const csv = require("csv-parser");
const fs = require("fs");
const xlsx = require("xlsx");

async function createOrder(req, res) {
  try {
    // Include user_id if user is authenticated
    const orderData = {
      ...req.body,
      user_id: req.user?.id || req.body.user_id || null,
      userId: req.user?.id || req.body.userId || null,
    };
    const result = await orderModel.createOrder(orderData);
    await logAudit(req, "create", "order", result.id, null, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getOrders(req, res) {
  try {
    const filters = {
      status: req.query.status,
      order_number: req.query.order_number,
      customer_email: req.query.customer_email,
      payment_status: req.query.payment_status,
      limit: req.query.limit || 50,
    };

    // If user is not admin, only show their own orders
    if (req.user && req.user.role !== "admin") {
      filters.user_id = req.user.id;
    }

    const orders = await orderModel.getOrders(filters);
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getOrderById(req, res) {
  try {
    let orderId = req.params.id;
    console.log(`Getting order by ID: ${orderId}, User: ${req.user?.id}, Role: ${req.user?.role}`);
    
    // Try to get order by ID first
    let order = await orderModel.getOrderById(orderId);
    
    // If not found, try by order_number
    if (!order) {
      const pool = require("../db/db");
      const [ordersByNumber] = await pool.query(
        "SELECT id FROM orders WHERE order_number = ?",
        [orderId]
      );
      if (ordersByNumber.length > 0) {
        orderId = ordersByNumber[0].id;
        order = await orderModel.getOrderById(orderId);
        console.log(`Order found by order_number, using order ID: ${orderId}`);
      }
    }
    
    if (!order) {
      console.log(`Order not found: ${req.params.id}`);
      return res.status(404).json({ 
        success: false, 
        message: "注文が見つかりません" 
      });
    }

    // Check if user has permission to view this order
    // Admins can view any order, users can only view their own orders
    if (req.user && req.user.role !== "admin") {
      const userId = req.user.id;
      
      // Check if order belongs to user directly
      if (order.user_id && order.user_id !== userId) {
        // Check if order belongs to user via customer
        if (order.customer_id) {
          const pool = require("../db/db");
          const [customerCheck] = await pool.query(
            "SELECT user_id FROM customers WHERE id = ? AND user_id = ?",
            [order.customer_id, userId]
          );
          
          if (customerCheck.length === 0) {
            console.log(`Access denied: User ${userId} tried to access order ${orderId}`);
            return res.status(403).json({ 
              success: false, 
              message: "この注文を表示する権限がありません" 
            });
          }
        } else {
          console.log(`Access denied: User ${userId} tried to access order ${orderId} (no customer link)`);
          return res.status(403).json({ 
            success: false, 
            message: "この注文を表示する権限がありません" 
          });
        }
      }
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error("Error getting order by ID:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const result = await orderModel.updateOrderStatus(req.params.id, req.body.status);
    await logAudit(req, "update_status", "order", req.params.id, null, { status: req.body.status });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function addShippingTracking(req, res) {
  try {
    const result = await orderModel.addShippingTracking(req.params.id, req.body);
    await logAudit(req, "add_tracking", "order", req.params.id, null, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error adding shipping tracking:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function updateShippingTracking(req, res) {
  try {
    const result = await orderModel.updateShippingTracking(req.params.trackingId, req.body);
    await logAudit(req, "update_tracking", "shipping_tracking", req.params.trackingId, null, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error updating shipping tracking:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function exportOrders(req, res) {
  try {
    const orders = await orderModel.getOrders({ limit: 10000 });
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(orders);
    xlsx.utils.book_append_sheet(workbook, worksheet, "Orders");
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=orders_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function cancelOrder(req, res) {
  try {
    // Allow users to cancel their own orders, admins can cancel any order
    const userId = req.user.role === "admin" ? null : req.user.id;
    const result = await orderModel.cancelOrder(req.params.id, userId);
    await logAudit(req, "cancel", "order", req.params.id, null, result);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.message.includes("見つかりません") || error.message.includes("権限がありません")) {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message.includes("キャンセルできません")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  addShippingTracking,
  updateShippingTracking,
  exportOrders,
  cancelOrder,
};

