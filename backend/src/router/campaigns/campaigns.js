const express = require("express");
const router = express.Router();
const campaignController = require("../../controllers/campaignController");
const { authenticateRequest } = require("../../middleware/auth-middleware/middleware");

router.use(authenticateRequest);

router.post("/", campaignController.createCampaign);
router.get("/", campaignController.getCampaigns);
router.get("/:id", campaignController.getCampaignById);
router.put("/:id", campaignController.updateCampaign);
router.delete("/:id", campaignController.deleteCampaign);

module.exports = router;

