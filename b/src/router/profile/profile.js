const express = require("express");
const {
  getProfile,
  updateProfile,
  changePassword,
} = require("../../controllers/profileController");
const {
  authenticateRequest,
} = require("../../middleware/auth-middleware/middleware");

const router = express.Router();

// All routes require authentication
router.use(authenticateRequest);

// Get current user's profile
router.get("/", getProfile);

// Update current user's profile
router.put("/", updateProfile);

// Change password
router.post("/change-password", changePassword);

module.exports = router;

