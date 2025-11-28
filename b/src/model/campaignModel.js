const pool = require("../db/db");
const { v4: uuidv4 } = require("uuid");

async function createCampaign(campaignData) {
  const campaignId = uuidv4();
  
  // Determine discount_value based on discount_type
  let discountValue = null;
  if (campaignData.discount_type === "percent") {
    discountValue = campaignData.discount_value || campaignData.discount_percent || null;
  } else if (campaignData.discount_type === "amount") {
    discountValue = campaignData.discount_value || null;
  } else if (campaignData.discount_type === "fixed_price") {
    discountValue = campaignData.discount_value || campaignData.fixed_price || null;
  }
  
  await pool.query(
    `INSERT INTO campaigns (
      id, name, description, label, type, target_type, discount_type, 
      discount_percent, discount_value, fixed_price, minimum_purchase,
      usage_limit, user_limit, start_date, end_date, is_active, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      campaignId,
      campaignData.name,
      campaignData.description || null,
      campaignData.label || null,
      campaignData.type || "discount_percent",
      campaignData.target_type || "product",
      campaignData.discount_type || "percent",
      campaignData.discount_percent || null,
      discountValue,
      campaignData.fixed_price || null,
      campaignData.minimum_purchase || 0,
      campaignData.usage_limit || null,
      campaignData.user_limit || null,
      campaignData.start_date,
      campaignData.end_date,
      campaignData.is_active !== undefined ? campaignData.is_active : true,
      campaignData.status || "active",
    ]
  );

  // Link targets based on target_type
  if (campaignData.target_type === "product" && campaignData.target_ids && campaignData.target_ids.length > 0) {
    for (const targetId of campaignData.target_ids) {
      await pool.query(
        `INSERT INTO campaign_targets (id, campaign_id, target_id, target_type)
         VALUES (?, ?, ?, 'product')
         ON DUPLICATE KEY UPDATE target_id = target_id`,
        [uuidv4(), campaignId, targetId]
      );
      // Also add to legacy product_campaigns for backward compatibility
      await pool.query(
        `INSERT INTO product_campaigns (id, product_id, campaign_id)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE product_id = product_id`,
        [uuidv4(), targetId, campaignId]
      );
    }
  } else if (campaignData.target_type === "category" && campaignData.target_ids && campaignData.target_ids.length > 0) {
    for (const targetId of campaignData.target_ids) {
      await pool.query(
        `INSERT INTO campaign_targets (id, campaign_id, target_id, target_type)
         VALUES (?, ?, ?, 'category')
         ON DUPLICATE KEY UPDATE target_id = target_id`,
        [uuidv4(), campaignId, targetId]
      );
    }
  } else if (campaignData.target_type === "all") {
    // No targets needed for "all" campaigns
  } else {
    // Legacy: Link products if provided (for backward compatibility)
    if (campaignData.product_ids && campaignData.product_ids.length > 0) {
      for (const productId of campaignData.product_ids) {
        await pool.query(
          `INSERT INTO product_campaigns (id, product_id, campaign_id)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE product_id = product_id`,
          [uuidv4(), productId, campaignId]
        );
        await pool.query(
          `INSERT INTO campaign_targets (id, campaign_id, target_id, target_type)
           VALUES (?, ?, ?, 'product')
           ON DUPLICATE KEY UPDATE target_id = target_id`,
          [uuidv4(), campaignId, productId]
        );
      }
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

  if (filters.status !== undefined) {
    query += " AND status = ?";
    params.push(filters.status);
  }

  query += " ORDER BY start_date DESC";
  const [campaigns] = await pool.query(query, params);

  // Get target counts and info
  for (const campaign of campaigns) {
    if (campaign.target_type === "all") {
      campaign.target_count = "all";
      campaign.target_ids = [];
    } else {
      const [targets] = await pool.query(
        `SELECT target_id, target_type FROM campaign_targets WHERE campaign_id = ?`,
        [campaign.id]
      );
      campaign.target_ids = targets.map((t) => t.target_id);
      campaign.target_count = targets.length;
      
      // Also get legacy product count for backward compatibility
      const [productCount] = await pool.query(
        "SELECT COUNT(*) as count FROM product_campaigns WHERE campaign_id = ?",
        [campaign.id]
      );
      campaign.product_count = productCount[0].count;
    }
  }

  return campaigns;
}

async function getCampaignById(campaignId) {
  const [campaigns] = await pool.query("SELECT * FROM campaigns WHERE id = ?", [campaignId]);
  if (campaigns.length === 0) return null;

  const campaign = campaigns[0];
  
  // Get targets based on target_type
  if (campaign.target_type === "all") {
    campaign.target_ids = [];
    campaign.products = [];
    campaign.categories = [];
  } else {
    const [targets] = await pool.query(
      `SELECT target_id, target_type FROM campaign_targets WHERE campaign_id = ?`,
      [campaignId]
    );
    
    const productIds = targets.filter((t) => t.target_type === "product").map((t) => t.target_id);
    const categoryIds = targets.filter((t) => t.target_type === "category").map((t) => t.target_id);
    
    campaign.target_ids = targets.map((t) => t.target_id);
    
    // Get products
    if (productIds.length > 0) {
      const placeholders = productIds.map(() => "?").join(",");
      const [products] = await pool.query(
        `SELECT * FROM products WHERE id IN (${placeholders})`,
        productIds
      );
      campaign.products = products;
    } else {
      campaign.products = [];
    }
    
    // Get categories
    if (categoryIds.length > 0) {
      const placeholders = categoryIds.map(() => "?").join(",");
      const [categories] = await pool.query(
        `SELECT * FROM categories WHERE id IN (${placeholders})`,
        categoryIds
      );
      campaign.categories = categories;
    } else {
      campaign.categories = [];
    }
    
    // Also get legacy products for backward compatibility
    if (campaign.products.length === 0) {
      const [legacyProducts] = await pool.query(
        `SELECT p.* FROM products p
         JOIN product_campaigns pc ON p.id = pc.product_id
         WHERE pc.campaign_id = ?`,
        [campaignId]
      );
      campaign.products = legacyProducts;
    }
  }

  return campaign;
}

async function updateCampaign(campaignId, campaignData) {
  const updateFields = [];
  const updateValues = [];

  // Determine discount_value based on discount_type
  if (campaignData.discount_type !== undefined || campaignData.discount_value !== undefined) {
    const [existing] = await pool.query("SELECT discount_type, discount_value, discount_percent, fixed_price FROM campaigns WHERE id = ?", [campaignId]);
    const current = existing[0] || {};
    const discountType = campaignData.discount_type || current.discount_type || "percent";
    
    let discountValue = campaignData.discount_value;
    if (discountValue === undefined) {
      if (discountType === "percent") {
        discountValue = campaignData.discount_percent || current.discount_percent || null;
      } else if (discountType === "amount") {
        discountValue = current.discount_value || null;
      } else if (discountType === "fixed_price") {
        discountValue = campaignData.fixed_price || current.fixed_price || null;
      }
    }
    
    if (discountValue !== undefined) {
      updateFields.push("discount_value = ?");
      updateValues.push(discountValue);
    }
  }

  ["name", "description", "label", "type", "target_type", "discount_type", 
   "discount_percent", "fixed_price", "minimum_purchase", "usage_limit", 
   "user_limit", "start_date", "end_date", "is_active", "status"].forEach((field) => {
    if (campaignData[field] !== undefined) {
      updateFields.push(`${field} = ?`);
      updateValues.push(campaignData[field]);
    }
  });

  if (updateFields.length > 0) {
    updateValues.push(campaignId);
    await pool.query(`UPDATE campaigns SET ${updateFields.join(", ")} WHERE id = ?`, updateValues);
  }

  // Update targets if provided
  if (campaignData.target_ids !== undefined || campaignData.target_type !== undefined) {
    await pool.query("DELETE FROM campaign_targets WHERE campaign_id = ?", [campaignId]);
    
    const [current] = await pool.query("SELECT target_type FROM campaigns WHERE id = ?", [campaignId]);
    const targetType = campaignData.target_type || (current[0]?.target_type || "product");
    
    if (targetType === "product" && campaignData.target_ids && campaignData.target_ids.length > 0) {
      // Delete legacy product_campaigns
      await pool.query("DELETE FROM product_campaigns WHERE campaign_id = ?", [campaignId]);
      
      for (const targetId of campaignData.target_ids) {
        await pool.query(
          `INSERT INTO campaign_targets (id, campaign_id, target_id, target_type) VALUES (?, ?, ?, 'product')`,
          [uuidv4(), campaignId, targetId]
        );
        // Also add to legacy table
        await pool.query(
          `INSERT INTO product_campaigns (id, product_id, campaign_id) VALUES (?, ?, ?)`,
          [uuidv4(), targetId, campaignId]
        );
      }
    } else if (targetType === "category" && campaignData.target_ids && campaignData.target_ids.length > 0) {
      for (const targetId of campaignData.target_ids) {
        await pool.query(
          `INSERT INTO campaign_targets (id, campaign_id, target_id, target_type) VALUES (?, ?, ?, 'category')`,
          [uuidv4(), campaignId, targetId]
        );
      }
    } else if (targetType === "all") {
      // No targets needed
    }
  }
  
  // Legacy: Update product links if provided (for backward compatibility)
  if (campaignData.product_ids !== undefined && !campaignData.target_ids) {
    await pool.query("DELETE FROM product_campaigns WHERE campaign_id = ?", [campaignId]);
    await pool.query("DELETE FROM campaign_targets WHERE campaign_id = ? AND target_type = 'product'", [campaignId]);
    
    for (const productId of campaignData.product_ids) {
      await pool.query(
        `INSERT INTO product_campaigns (id, product_id, campaign_id) VALUES (?, ?, ?)`,
        [uuidv4(), productId, campaignId]
      );
      await pool.query(
        `INSERT INTO campaign_targets (id, campaign_id, target_id, target_type) VALUES (?, ?, ?, 'product')`,
        [uuidv4(), campaignId, productId]
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

