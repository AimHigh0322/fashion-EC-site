const express = require("express");
const {
  register,
  login,
  getMe,
} = require("../../controllers/authController");
const {
  authenticateRequest,
} = require("../../middleware/auth-middleware/middleware");

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.get("/me", authenticateRequest, getMe);

module.exports = router;
