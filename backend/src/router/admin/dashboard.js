const express = require("express");
const router = express.Router();
const dashboardController = require("../../controllers/dashboardController");
const { authenticateRequest, requireAdmin } = require("../../middleware/auth-middleware/middleware");

// All routes require admin authentication
router.use(authenticateRequest);
router.use(requireAdmin);

// Get dashboard statistics
router.get("/stats", dashboardController.getDashboardStats);

// Get recent orders
router.get("/recent-orders", dashboardController.getRecentOrders);

module.exports = router;

