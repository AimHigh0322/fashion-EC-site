const express = require("express");
const router = express.Router();
const reviewController = require("../../controllers/reviewController");
const { authenticateToken, requireAdmin } = require("../../middleware/auth-middleware/middleware");

// Public routes (no authentication required)
router.get("/product/:productId", reviewController.getProductReviews);

// Authenticated user routes
router.post("/", authenticateToken, reviewController.createReview);
router.get("/user", authenticateToken, reviewController.getUserReviews);
router.get("/reviewable", authenticateToken, reviewController.getReviewableProducts);
router.get("/:id", reviewController.getReviewById);
router.put("/:id", authenticateToken, reviewController.updateReview);
router.delete("/:id", authenticateToken, reviewController.deleteReview);

// Admin routes
router.get("/admin/all", authenticateToken, requireAdmin, reviewController.getAllReviews);
router.post("/:id/moderate", authenticateToken, requireAdmin, reviewController.moderateReview);
router.post("/:id/reply", authenticateToken, requireAdmin, reviewController.addAdminReply);

module.exports = router;

