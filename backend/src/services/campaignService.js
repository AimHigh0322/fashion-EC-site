const campaignModel = require("../model/campaignModel");
const pool = require("../db/db");
const { v4: uuidv4 } = require("uuid");

/**
 * Check if a campaign is currently active based on date/time and status
 */
function isCampaignActive(campaign) {
  if (!campaign) return false;
  
  const now = new Date();
  const startDate = new Date(campaign.start_date);
  const endDate = new Date(campaign.end_date);
  
  // Check status
  if (campaign.status === "inactive" || !campaign.is_active) {
    return false;
  }
  
  // Check date range
  if (now < startDate || now > endDate) {
    return false;
  }
  
  // Check usage limit
  if (campaign.usage_limit && campaign.current_usage >= campaign.usage_limit) {
    return false;
  }
  
  return true;
}

/**
 * Get active campaigns
 */
async function getActiveCampaigns() {
  const now = new Date();
  const campaigns = await campaignModel.getCampaigns({ is_active: true });
  
  return campaigns.filter((campaign) => {
    if (campaign.status === "inactive") return false;
    const startDate = new Date(campaign.start_date);
    const endDate = new Date(campaign.end_date);
    return now >= startDate && now <= endDate;
  });
}

/**
 * Get campaigns that apply to a specific product
 */
async function getCampaignsForProduct(productId, categoryIds = []) {
  const activeCampaigns = await getActiveCampaigns();
  const applicableCampaigns = [];
  
  for (const campaign of activeCampaigns) {
    let applies = false;
    
    // Check target type
    if (campaign.target_type === "all") {
      applies = true;
    } else if (campaign.target_type === "product") {
      // Check if product is in campaign targets
      const [targets] = await pool.query(
        `SELECT target_id FROM campaign_targets 
         WHERE campaign_id = ? AND target_type = 'product' AND target_id = ?`,
        [campaign.id, productId]
      );
      applies = targets.length > 0;
      
      // Also check legacy product_campaigns table for backward compatibility
      if (!applies) {
        const [legacy] = await pool.query(
          `SELECT id FROM product_campaigns 
           WHERE campaign_id = ? AND product_id = ?`,
          [campaign.id, productId]
        );
        applies = legacy.length > 0;
      }
    } else if (campaign.target_type === "category") {
      // Check if any of the product's categories match
      if (categoryIds && categoryIds.length > 0) {
        const placeholders = categoryIds.map(() => "?").join(",");
        const [targets] = await pool.query(
          `SELECT target_id FROM campaign_targets 
           WHERE campaign_id = ? AND target_type = 'category' 
           AND target_id IN (${placeholders})`,
          [campaign.id, ...categoryIds]
        );
        applies = targets.length > 0;
      }
    }
    
    if (applies) {
      applicableCampaigns.push(campaign);
    }
  }
  
  return applicableCampaigns;
}

/**
 * Calculate discount for a product based on applicable campaigns
 * Returns the best discount (highest priority)
 */
async function calculateProductDiscount(product, categoryIds = []) {
  const campaigns = await getCampaignsForProduct(product.id, categoryIds);
  
  if (campaigns.length === 0) {
    return {
      originalPrice: product.price,
      discountedPrice: product.price,
      discount: 0,
      campaign: null,
      discountBreakdown: [],
    };
  }
  
  // Sort campaigns by priority (you can add priority field later)
  // For now, use the first applicable campaign
  const campaign = campaigns[0];
  
  let discount = 0;
  let discountedPrice = product.price;
  const discountBreakdown = [];
  
  if (campaign.discount_type === "percent") {
    const discountPercent = campaign.discount_value || campaign.discount_percent || 0;
    discount = (product.price * discountPercent) / 100;
    discountedPrice = product.price - discount;
    discountBreakdown.push({
      type: "percent",
      value: discountPercent,
      amount: discount,
    });
  } else if (campaign.discount_type === "amount") {
    discount = campaign.discount_value || 0;
    discountedPrice = Math.max(0, product.price - discount);
    discountBreakdown.push({
      type: "amount",
      value: discount,
      amount: discount,
    });
  } else if (campaign.discount_type === "fixed_price") {
    // Use fixed_price from legacy type or discount_value
    const fixedPrice = campaign.fixed_price || campaign.discount_value || product.price;
    discount = product.price - fixedPrice;
    discountedPrice = Math.max(0, fixedPrice);
    discountBreakdown.push({
      type: "fixed_price",
      value: fixedPrice,
      amount: discount,
    });
  }
  
  return {
    originalPrice: product.price,
    discountedPrice: Math.max(0, discountedPrice),
    discount: Math.max(0, discount),
    campaign: {
      id: campaign.id,
      name: campaign.name,
      label: campaign.label,
      description: campaign.description,
      discountType: campaign.discount_type,
      discountValue: campaign.discount_value || campaign.discount_percent || campaign.fixed_price,
    },
    discountBreakdown,
  };
}

/**
 * Apply campaigns to cart items
 */
async function applyCampaignsToCart(cartItems, userId = null) {
  const cartWithDiscounts = [];
  let totalDiscount = 0;
  let freeShipping = false;
  const appliedCampaigns = [];
  
  for (const item of cartItems) {
    // Get product with category info
    const [products] = await pool.query(
      `SELECT p.*, GROUP_CONCAT(pc.category_id) as category_ids
       FROM products p
       LEFT JOIN product_categories pc ON p.id = pc.product_id
       WHERE p.id = ?
       GROUP BY p.id`,
      [item.product_id]
    );
    
    if (products.length === 0) continue;
    
    const product = products[0];
    const categoryIds = product.category_ids
      ? product.category_ids.split(",").filter(Boolean)
      : [];
    
    const discountInfo = await calculateProductDiscount(product, categoryIds);
    
    const itemTotal = discountInfo.discountedPrice * item.quantity;
    const itemDiscount = discountInfo.discount * item.quantity;
    
    cartWithDiscounts.push({
      ...item,
      originalPrice: discountInfo.originalPrice,
      discountedPrice: discountInfo.discountedPrice,
      discount: discountInfo.discount,
      itemTotal,
      itemDiscount,
      campaign: discountInfo.campaign,
    });
    
    totalDiscount += itemDiscount;
    
    if (discountInfo.campaign) {
      appliedCampaigns.push(discountInfo.campaign);
    }
    
    // Check for free shipping campaign
    if (discountInfo.campaign && discountInfo.campaign.discountType === "freeShipping") {
      freeShipping = true;
    }
  }
  
  // Check for cart-level campaigns (minimum purchase, etc.)
  const subtotal = cartItems.reduce((sum, item) => {
    const cartItem = cartWithDiscounts.find((ci) => ci.id === item.id);
    return sum + (cartItem ? cartItem.itemTotal : item.price * item.quantity);
  }, 0);
  
  const activeCampaigns = await getActiveCampaigns();
  for (const campaign of activeCampaigns) {
    if (campaign.target_type === "all" && campaign.minimum_purchase > 0) {
      if (subtotal >= campaign.minimum_purchase) {
        if (campaign.discount_type === "freeShipping") {
          freeShipping = true;
        } else if (campaign.discount_type === "percent") {
          const cartDiscount = (subtotal * (campaign.discount_value || 0)) / 100;
          totalDiscount += cartDiscount;
          appliedCampaigns.push({
            id: campaign.id,
            name: campaign.name,
            label: campaign.label,
            type: "cart",
            discount: cartDiscount,
          });
        } else if (campaign.discount_type === "amount") {
          totalDiscount += campaign.discount_value || 0;
          appliedCampaigns.push({
            id: campaign.id,
            name: campaign.name,
            label: campaign.label,
            type: "cart",
            discount: campaign.discount_value || 0,
          });
        }
      }
    }
  }
  
  return {
    items: cartWithDiscounts,
    subtotal,
    totalDiscount,
    freeShipping,
    appliedCampaigns: [...new Map(appliedCampaigns.map((c) => [c.id, c])).values()], // Remove duplicates
  };
}

/**
 * Validate campaign usage for a user
 */
async function validateCampaignUsage(campaignId, userId) {
  const [campaigns] = await pool.query("SELECT * FROM campaigns WHERE id = ?", [campaignId]);
  
  if (campaigns.length === 0) {
    return { valid: false, error: "Campaign not found" };
  }
  
  const campaign = campaigns[0];
  
  // Check if campaign is active
  if (!isCampaignActive(campaign)) {
    return { valid: false, error: "Campaign is not active" };
  }
  
  // Check user limit
  if (campaign.user_limit && userId) {
    const [usage] = await pool.query(
      `SELECT usage_count FROM campaign_usage 
       WHERE campaign_id = ? AND user_id = ?`,
      [campaignId, userId]
    );
    
    if (usage.length > 0 && usage[0].usage_count >= campaign.user_limit) {
      return { valid: false, error: "User has reached campaign usage limit" };
    }
  }
  
  return { valid: true };
}

/**
 * Record campaign usage
 */
async function recordCampaignUsage(campaignId, userId) {
  if (!userId) return;
  
  const [existing] = await pool.query(
    `SELECT id, usage_count FROM campaign_usage 
     WHERE campaign_id = ? AND user_id = ?`,
    [campaignId, userId]
  );
  
  if (existing.length > 0) {
    await pool.query(
      `UPDATE campaign_usage 
       SET usage_count = usage_count + 1, last_used_at = NOW() 
       WHERE id = ?`,
      [existing[0].id]
    );
  } else {
    await pool.query(
      `INSERT INTO campaign_usage (id, campaign_id, user_id, usage_count) 
       VALUES (?, ?, ?, 1)`,
      [uuidv4(), campaignId, userId]
    );
  }
  
  // Update campaign current_usage
  await pool.query(
    `UPDATE campaigns SET current_usage = current_usage + 1 WHERE id = ?`,
    [campaignId]
  );
}

/**
 * Validate campaigns for checkout
 */
async function validateCampaignsForCheckout(cartItems, userId = null) {
  const validationResults = [];
  
  for (const item of cartItems) {
    const [products] = await pool.query(
      `SELECT p.*, GROUP_CONCAT(pc.category_id) as category_ids
       FROM products p
       LEFT JOIN product_categories pc ON p.id = pc.product_id
       WHERE p.id = ?
       GROUP BY p.id`,
      [item.product_id]
    );
    
    if (products.length === 0) continue;
    
    const product = products[0];
    const categoryIds = product.category_ids
      ? product.category_ids.split(",").filter(Boolean)
      : [];
    
    const campaigns = await getCampaignsForProduct(product.id, categoryIds);
    
    for (const campaign of campaigns) {
      const validation = await validateCampaignUsage(campaign.id, userId);
      validationResults.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        productId: product.id,
        ...validation,
      });
    }
  }
  
  const invalid = validationResults.filter((r) => !r.valid);
  
  return {
    valid: invalid.length === 0,
    results: validationResults,
    errors: invalid.map((r) => r.error),
  };
}

module.exports = {
  isCampaignActive,
  getActiveCampaigns,
  getCampaignsForProduct,
  calculateProductDiscount,
  applyCampaignsToCart,
  validateCampaignUsage,
  recordCampaignUsage,
  validateCampaignsForCheckout,
};

