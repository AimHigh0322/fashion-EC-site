const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/orderController");
const { authenticateRequest } = require("../../middleware/auth-middleware/middleware");

router.use(authenticateRequest);

router.post("/", orderController.createOrder);
router.get("/", orderController.getOrders);
router.get("/export", orderController.exportOrders);
router.get("/:id", orderController.getOrderById);
router.put("/:id/status", orderController.updateOrderStatus);
router.post("/:id/tracking", orderController.addShippingTracking);
router.post("/:id/cancel", orderController.cancelOrder);

module.exports = router;

