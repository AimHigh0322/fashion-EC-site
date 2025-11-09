const campaignModel = require("../model/campaignModel");
const { logAudit } = require("../middleware/auditLogger");

async function createCampaign(req, res) {
  try {
    const result = await campaignModel.createCampaign(req.body);
    await logAudit(req, "create", "campaign", result.id, null, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getCampaigns(req, res) {
  try {
    const campaigns = await campaignModel.getCampaigns({
      is_active: req.query.is_active !== undefined ? req.query.is_active === "true" : undefined,
    });
    res.json({ success: true, data: campaigns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getCampaignById(req, res) {
  try {
    const campaign = await campaignModel.getCampaignById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }
    res.json({ success: true, data: campaign });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function updateCampaign(req, res) {
  try {
    const oldCampaign = await campaignModel.getCampaignById(req.params.id);
    const result = await campaignModel.updateCampaign(req.params.id, req.body);
    await logAudit(req, "update", "campaign", req.params.id, oldCampaign, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteCampaign(req, res) {
  try {
    const oldCampaign = await campaignModel.getCampaignById(req.params.id);
    await campaignModel.deleteCampaign(req.params.id);
    await logAudit(req, "delete", "campaign", req.params.id, oldCampaign, null);
    res.json({ success: true, message: "Campaign deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
};

