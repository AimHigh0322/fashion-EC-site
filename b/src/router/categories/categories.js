const express = require("express");
const router = express.Router();
const categoryController = require("../../controllers/categoryController");
const { authenticateRequest } = require("../../middleware/auth-middleware/middleware");

// Public routes - viewing categories (no authentication required)
router.get("/tree", categoryController.getCategoryTree);
router.get("/", categoryController.getAllCategories);
router.get("/:id", categoryController.getCategoryById);

// Protected routes - modifying categories (authentication required)
router.post("/", authenticateRequest, categoryController.createCategory);
router.put("/:id", authenticateRequest, categoryController.updateCategory);
router.delete("/:id", authenticateRequest, categoryController.deleteCategory);

module.exports = router;

