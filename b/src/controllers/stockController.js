const stockHistoryModel = require("../model/stockHistoryModel");

// Get stock history for a product
exports.getStockHistory = async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const history = await stockHistoryModel.getStockHistory(
      productId,
      limit,
      offset
    );
    res.json(history);
  } catch (error) {
    console.error("Error getting stock history:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get all stock history (admin only)
exports.getAllStockHistory = async (req, res) => {
  try {
    const { changeType, productId, startDate, endDate } = req.query;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const filters = {
      changeType,
      productId,
      startDate,
      endDate,
    };

    const history = await stockHistoryModel.getAllStockHistory(
      filters,
      limit,
      offset
    );
    res.json(history);
  } catch (error) {
    console.error("Error getting all stock history:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get low stock products
exports.getLowStockProducts = async (req, res) => {
  try {
    const products = await stockHistoryModel.getLowStockProducts();
    res.json(products);
  } catch (error) {
    console.error("Error getting low stock products:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update product stock (admin only)
exports.updateProductStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantityChange, changeType, notes } = req.body;

    if (!quantityChange || !changeType) {
      return res.status(400).json({
        message: "在庫変更数と変更タイプが必要です",
      });
    }

    const result = await stockHistoryModel.updateProductStock(
      productId,
      parseInt(quantityChange),
      changeType,
      null,
      null,
      notes,
      req.user.id
    );

    res.json(result);
  } catch (error) {
    console.error("Error updating product stock:", error);
    res.status(500).json({ message: error.message });
  }
};

// Bulk update stock (admin only)
exports.bulkUpdateStock = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        message: "更新データが必要です",
      });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const result = await stockHistoryModel.updateProductStock(
          update.productId,
          update.quantityChange,
          update.changeType || "adjustment",
          null,
          null,
          update.notes,
          req.user.id
        );
        results.push(result);
      } catch (error) {
        errors.push({
          productId: update.productId,
          error: error.message,
        });
      }
    }

    res.json({
      success: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (error) {
    console.error("Error bulk updating stock:", error);
    res.status(500).json({ message: error.message });
  }
};

