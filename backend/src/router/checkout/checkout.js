const express = require("express");
const router = express.Router();
const checkoutController = require("../../controllers/checkoutController");
const { authenticateRequest } = require("../../middleware/auth-middleware/middleware");

// Create checkout session (requires authentication)
router.post("/create-session", authenticateRequest, checkoutController.createCheckoutSession);

// Webhook endpoint (no authentication, uses Stripe signature verification)
// Note: This route must use express.raw() to get the raw body for signature verification
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  checkoutController.handleWebhook
);

// Get webhook logs (requires authentication, admin only recommended)
router.get("/webhook-logs", authenticateRequest, checkoutController.getWebhookLogs);
router.get("/webhook-logs/:id", authenticateRequest, checkoutController.getWebhookLogById);

module.exports = router;

