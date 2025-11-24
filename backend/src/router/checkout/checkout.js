const express = require("express");
const router = express.Router();
const checkoutController = require("../../controllers/checkoutController");
const { authenticateRequest } = require("../../middleware/auth-middleware/middleware");

// Protected routes (require authentication)
router.post(
  "/create-session",
  authenticateRequest,
  checkoutController.createCheckoutSession
);
router.post(
  "/validate-campaigns",
  authenticateRequest,
  checkoutController.validateCampaigns
);
router.get(
  "/verify-payment",
  authenticateRequest,
  checkoutController.verifyPaymentAndCreateOrder
);

// Webhook endpoint (no auth required, verified by Stripe signature)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  checkoutController.handleStripeWebhook
);

module.exports = router;

