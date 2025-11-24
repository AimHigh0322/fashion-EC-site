const cartModel = require("../model/cartModel");
const campaignService = require("../services/campaignService");
const { logAudit } = require("../middleware/auditLogger");

// Add product to cart
async function addToCart(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "認証が必要です",
      });
    }

    const { product_id, quantity = 1 } = req.body;
    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "商品IDが必要です",
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "数量は1以上である必要があります",
      });
    }

    const cartItem = await cartModel.addToCart(userId, product_id, quantity);

    // Log audit
    try {
      await logAudit(req, "create", "cart", cartItem.id, null, {
        user_id: userId,
        product_id: product_id,
        quantity: cartItem.quantity,
      });
    } catch (auditError) {
      console.warn("Audit log error (non-critical):", auditError);
    }

    res.json({
      success: true,
      message: "カートに追加しました",
      data: cartItem,
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "カートへの追加に失敗しました",
      error: error.message,
    });
  }
}

// Remove product from cart
async function removeFromCart(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "認証が必要です",
      });
    }

    const { product_id } = req.params;
    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "商品IDが必要です",
      });
    }

    await cartModel.removeFromCart(userId, product_id);

    // Log audit
    await logAudit(
      req,
      "delete",
      "cart",
      product_id,
      {
        user_id: userId,
        product_id: product_id,
      },
      null
    );

    res.json({
      success: true,
      message: "カートから削除しました",
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({
      success: false,
      message: "カートからの削除に失敗しました",
      error: error.message,
    });
  }
}

// Update cart item quantity
async function updateCartQuantity(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "認証が必要です",
      });
    }

    const { product_id } = req.params;
    const { quantity } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "商品IDが必要です",
      });
    }

    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "数量が必要です",
      });
    }

    const cartItem = await cartModel.updateCartQuantity(userId, product_id, quantity);

    res.json({
      success: true,
      message: "カートを更新しました",
      data: cartItem,
    });
  } catch (error) {
    console.error("Update cart quantity error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "カートの更新に失敗しました",
      error: error.message,
    });
  }
}

// Get user's cart
async function getUserCart(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "認証が必要です",
      });
    }

    const cartItems = await cartModel.getUserCart(userId);
    
    // Apply campaigns if requested
    const applyCampaigns = req.query.apply_campaigns === "true";
    if (applyCampaigns) {
      const cartWithDiscounts = await campaignService.applyCampaignsToCart(cartItems, userId);
      return res.json({
        success: true,
        data: cartWithDiscounts.items,
        discounts: {
          subtotal: cartWithDiscounts.subtotal,
          totalDiscount: cartWithDiscounts.totalDiscount,
          freeShipping: cartWithDiscounts.freeShipping,
          appliedCampaigns: cartWithDiscounts.appliedCampaigns,
        },
      });
    }
    
    res.json({
      success: true,
      data: cartItems,
    });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({
      success: false,
      message: "カートの取得に失敗しました",
      error: error.message,
    });
  }
}

// Apply campaigns to cart
async function applyCampaignsToCart(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "認証が必要です",
      });
    }

    const cartItems = await cartModel.getUserCart(userId);
    const cartWithDiscounts = await campaignService.applyCampaignsToCart(cartItems, userId);
    
    res.json({
      success: true,
      data: {
        items: cartWithDiscounts.items,
        subtotal: cartWithDiscounts.subtotal,
        totalDiscount: cartWithDiscounts.totalDiscount,
        freeShipping: cartWithDiscounts.freeShipping,
        appliedCampaigns: cartWithDiscounts.appliedCampaigns,
        finalTotal: cartWithDiscounts.subtotal - cartWithDiscounts.totalDiscount,
      },
    });
  } catch (error) {
    console.error("Apply campaigns to cart error:", error);
    res.status(500).json({
      success: false,
      message: "キャンペーンの適用に失敗しました",
      error: error.message,
    });
  }
}

// Get cart count
async function getCartCount(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "認証が必要です",
      });
    }

    const count = await cartModel.getCartCount(userId);
    res.json({
      success: true,
      data: count,
    });
  } catch (error) {
    console.error("Get cart count error:", error);
    res.status(500).json({
      success: false,
      message: "カート数の取得に失敗しました",
      error: error.message,
    });
  }
}

// Clear cart
async function clearCart(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "認証が必要です",
      });
    }

    await cartModel.clearCart(userId);

    res.json({
      success: true,
      message: "カートを空にしました",
    });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({
      success: false,
      message: "カートのクリアに失敗しました",
      error: error.message,
    });
  }
}

module.exports = {
  addToCart,
  removeFromCart,
  updateCartQuantity,
  getUserCart,
  getCartCount,
  clearCart,
  applyCampaignsToCart,
};

