const express = require("express");
const router = express.Router();
const categoryController = require("../../controllers/categoryController");
const { authenticateRequest } = require("../../middleware/auth-middleware/middleware");

router.use(authenticateRequest);

router.post("/", categoryController.createCategory);
router.get("/tree", categoryController.getCategoryTree);
router.get("/", categoryController.getAllCategories);
router.get("/:id", categoryController.getCategoryById);
router.put("/:id", categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);

module.exports = router;

