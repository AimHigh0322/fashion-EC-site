const express = require("express");
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats,
  toggleBlockUser,
} = require("../../controllers/userController");
const {
  authenticateRequest,
} = require("../../middleware/auth-middleware/middleware");

const router = express.Router();

// All routes require authentication
router.use(authenticateRequest);

// Get user statistics
router.get("/stats", getUserStats);

// Get all users
router.get("/", getAllUsers);

// Get user by ID
router.get("/:id", getUserById);

// Update user
router.put("/:id", updateUser);

// Toggle block user
router.patch("/:id/block", toggleBlockUser);

// Delete user
router.delete("/:id", deleteUser);

module.exports = router;

