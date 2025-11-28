const express = require("express");
const router = express.Router();
const campaignController = require("../../controllers/campaignController");
const { authenticateRequest } = require("../../middleware/auth-middleware/middleware");

// Public routes - viewing campaigns (no authentication required)
router.get("/", campaignController.getCampaigns);
router.get("/active", campaignController.getActiveCampaigns);
router.get("/apply-to-product/:productId", campaignController.getCampaignsForProduct);
router.get("/:id", campaignController.getCampaignById);

// Protected routes - modifying campaigns (authentication required)
router.post("/", authenticateRequest, campaignController.createCampaign);
router.put("/:id", authenticateRequest, campaignController.updateCampaign);
router.delete("/:id", authenticateRequest, campaignController.deleteCampaign);

module.exports = router;

