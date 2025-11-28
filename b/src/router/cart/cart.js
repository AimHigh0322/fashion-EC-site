const express = require("express");
const router = express.Router();
const cartController = require("../../controllers/cartController");
const { authenticateRequest } = require("../../middleware/auth-middleware/middleware");

// All routes require authentication
router.use(authenticateRequest);

// Add product to cart
router.post("/", cartController.addToCart);

// Remove product from cart
router.delete("/:product_id", cartController.removeFromCart);

// Update cart item quantity
router.put("/:product_id", cartController.updateCartQuantity);

// Get user's cart
router.get("/", cartController.getUserCart);

// Apply campaigns to cart
router.post("/apply-campaigns", cartController.applyCampaignsToCart);

// Get cart count
router.get("/count", cartController.getCartCount);

// Clear cart
router.delete("/", cartController.clearCart);

module.exports = router;

