const pool = require("../db/db");
const { v4: uuidv4 } = require("uuid");

async function createCampaign(campaignData) {
  const campaignId = uuidv4();
  await pool.query(
    `INSERT INTO campaigns (id, name, description, type, discount_percent, fixed_price, start_date, end_date, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      campaignId,
      campaignData.name,
      campaignData.description || null,
      campaignData.type || "discount_percent",
      campaignData.discount_percent || null,
      campaignData.fixed_price || null,
      campaignData.start_date,
      campaignData.end_date,
      campaignData.is_active !== undefined ? campaignData.is_active : true,
    ]
  );

  // Link products if provided
  if (campaignData.product_ids && campaignData.product_ids.length > 0) {
    for (const productId of campaignData.product_ids) {
      await pool.query(
        `INSERT INTO product_campaigns (id, product_id, campaign_id)
         VALUES (?, ?, ?)`,
        [uuidv4(), productId, campaignId]
      );
    }
  }

  return { id: campaignId };
}

async function getCampaigns(filters = {}) {
  let query = "SELECT * FROM campaigns WHERE 1=1";
  const params = [];

  if (filters.is_active !== undefined) {
    query += " AND is_active = ?";
    params.push(filters.is_active);
  }

  query += " ORDER BY start_date DESC";
  const [campaigns] = await pool.query(query, params);

  // Get product counts
  for (const campaign of campaigns) {
    const [count] = await pool.query(
      "SELECT COUNT(*) as count FROM product_campaigns WHERE campaign_id = ?",
      [campaign.id]
    );
    campaign.product_count = count[0].count;
  }

  return campaigns;
}

async function getCampaignById(campaignId) {
  const [campaigns] = await pool.query("SELECT * FROM campaigns WHERE id = ?", [campaignId]);
  if (campaigns.length === 0) return null;

  const campaign = campaigns[0];
  const [products] = await pool.query(
    `SELECT p.* FROM products p
     JOIN product_campaigns pc ON p.id = pc.product_id
     WHERE pc.campaign_id = ?`,
    [campaignId]
  );
  campaign.products = products;

  return campaign;
}

async function updateCampaign(campaignId, campaignData) {
  const updateFields = [];
  const updateValues = [];

  ["name", "description", "type", "discount_percent", "fixed_price", "start_date", "end_date", "is_active"].forEach((field) => {
    if (campaignData[field] !== undefined) {
      updateFields.push(`${field} = ?`);
      updateValues.push(campaignData[field]);
    }
  });

  if (updateFields.length > 0) {
    updateValues.push(campaignId);
    await pool.query(`UPDATE campaigns SET ${updateFields.join(", ")} WHERE id = ?`, updateValues);
  }

  // Update product links if provided
  if (campaignData.product_ids !== undefined) {
    await pool.query("DELETE FROM product_campaigns WHERE campaign_id = ?", [campaignId]);
    for (const productId of campaignData.product_ids) {
      await pool.query(
        `INSERT INTO product_campaigns (id, product_id, campaign_id) VALUES (?, ?, ?)`,
        [uuidv4(), productId, campaignId]
      );
    }
  }

  return { id: campaignId };
}

async function deleteCampaign(campaignId) {
  await pool.query("DELETE FROM campaigns WHERE id = ?", [campaignId]);
  return { id: campaignId };
}

// Auto-deactivate expired campaigns
async function deactivateExpiredCampaigns() {
  await pool.query(
    "UPDATE campaigns SET is_active = FALSE WHERE end_date < NOW() AND is_active = TRUE"
  );
}

module.exports = {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  deactivateExpiredCampaigns,
};

