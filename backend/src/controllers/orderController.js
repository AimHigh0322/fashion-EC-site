const orderModel = require("../model/orderModel");
const { logAudit } = require("../middleware/auditLogger");
const csv = require("csv-parser");
const fs = require("fs");
const xlsx = require("xlsx");

async function createOrder(req, res) {
  try {
    const result = await orderModel.createOrder(req.body);
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
    const order = await orderModel.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    res.json({ success: true, data: order });
  } catch (error) {
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

