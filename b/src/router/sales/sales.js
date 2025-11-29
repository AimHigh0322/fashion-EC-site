const express = require("express");
const router = express.Router();
const salesController = require("../../controllers/salesController");
const { authenticateRequest } = require("../../middleware/auth-middleware/middleware");

// All sales routes require authentication
router.use(authenticateRequest);

// Sales aggregation routes
router.get("/daily", salesController.getDailySales);
router.get("/monthly", salesController.getMonthlySales);
router.get("/products", salesController.getProductSales);
router.get("/categories", salesController.getCategorySales);

module.exports = router;

