const express = require("express");
const router = express.Router();
const favoriteController = require("../../controllers/favoriteController");
const { authenticateRequest } = require("../../middleware/auth-middleware/middleware");

// All routes require authentication
router.use(authenticateRequest);

// Add product to favorites
router.post("/", favoriteController.addFavorite);

// Remove product from favorites
router.delete("/:product_id", favoriteController.removeFavorite);

// Get user's favorites
router.get("/", favoriteController.getUserFavorites);

// Check if product is favorited
router.get("/check/:product_id", favoriteController.checkFavorite);

// Get favorite status for multiple products
router.get("/status", favoriteController.getFavoriteStatus);

module.exports = router;

