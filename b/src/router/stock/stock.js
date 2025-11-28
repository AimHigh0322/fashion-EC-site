const express = require("express");
const router = express.Router();
const stockController = require("../../controllers/stockController");
const { authenticateToken, requireAdmin } = require("../../middleware/auth-middleware/middleware");

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Stock history routes
router.get("/history", stockController.getAllStockHistory);
router.get("/history/:productId", stockController.getStockHistory);

// Low stock alerts
router.get("/low-stock", stockController.getLowStockProducts);

// Stock updates
router.post("/:productId/update", stockController.updateProductStock);
router.post("/bulk-update", stockController.bulkUpdateStock);

module.exports = router;

