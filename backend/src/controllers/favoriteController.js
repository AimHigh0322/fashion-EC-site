const favoriteModel = require("../model/favoriteModel");
const { logAudit } = require("../middleware/auditLogger");

// Add product to favorites
async function addFavorite(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "認証が必要です",
      });
    }

    const { product_id } = req.body;
    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "商品IDが必要です",
      });
    }

    console.log("Add favorite - userId:", userId, "product_id:", product_id);

    const favorite = await favoriteModel.addFavorite(userId, product_id);
    console.log("Add favorite - result:", favorite);

    if (!favorite) {
      return res.status(500).json({
        success: false,
        message: "お気に入りの追加に失敗しました",
      });
    }

    // Log audit
    try {
      await logAudit(req, "create", "favorite", favorite.id, null, {
        user_id: userId,
        product_id: product_id,
      });
    } catch (auditError) {
      console.warn("Audit log error (non-critical):", auditError);
    }

    res.json({
      success: true,
      message: "お気に入りに追加しました",
      data: favorite,
    });
  } catch (error) {
    console.error("Add favorite error:", error);
    res.status(500).json({
      success: false,
      message: "お気に入りの追加に失敗しました",
      error: error.message,
    });
  }
}

// Remove product from favorites
async function removeFavorite(req, res) {
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

    // Check if favorite exists
    const isFav = await favoriteModel.isFavorited(userId, product_id);
    if (!isFav) {
      return res.status(404).json({
        success: false,
        message: "お気に入りが見つかりません",
      });
    }

    await favoriteModel.removeFavorite(userId, product_id);

    // Log audit
    await logAudit(
      req,
      "delete",
      "favorite",
      product_id,
      {
        user_id: userId,
        product_id: product_id,
      },
      null
    );

    res.json({
      success: true,
      message: "お気に入りから削除しました",
    });
  } catch (error) {
    console.error("Remove favorite error:", error);
    res.status(500).json({
      success: false,
      message: "お気に入りの削除に失敗しました",
      error: error.message,
    });
  }
}

// Get user's favorites
async function getUserFavorites(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "認証が必要です",
      });
    }

    const favorites = await favoriteModel.getUserFavorites(userId);
    res.json({
      success: true,
      data: favorites,
    });
  } catch (error) {
    console.error("Get favorites error:", error);
    res.status(500).json({
      success: false,
      message: "お気に入りの取得に失敗しました",
      error: error.message,
    });
  }
}

// Check if product is favorited
async function checkFavorite(req, res) {
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

    const isFav = await favoriteModel.isFavorited(userId, product_id);
    res.json({
      success: true,
      data: { is_favorited: isFav },
    });
  } catch (error) {
    console.error("Check favorite error:", error);
    res.status(500).json({
      success: false,
      message: "お気に入りの確認に失敗しました",
      error: error.message,
    });
  }
}

// Get favorite status for multiple products
async function getFavoriteStatus(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "認証が必要です",
      });
    }

    const { product_ids } = req.query;
    if (!product_ids) {
      return res.status(400).json({
        success: false,
        message: "商品IDが必要です",
      });
    }

    const productIds = Array.isArray(product_ids)
      ? product_ids
      : product_ids.split(",");

    const favoritedIds = await favoriteModel.getFavoriteStatus(
      userId,
      productIds
    );
    res.json({
      success: true,
      data: favoritedIds,
    });
  } catch (error) {
    console.error("Get favorite status error:", error);
    res.status(500).json({
      success: false,
      message: "お気に入り状態の取得に失敗しました",
      error: error.message,
    });
  }
}

module.exports = {
  addFavorite,
  removeFavorite,
  getUserFavorites,
  checkFavorite,
  getFavoriteStatus,
};
