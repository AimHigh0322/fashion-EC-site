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
    const orders = await orderModel.getOrders({
      status: req.query.status,
      order_number: req.query.order_number,
      customer_email: req.query.customer_email,
      limit: req.query.limit || 50,
    });
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

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  addShippingTracking,
  exportOrders,
};

