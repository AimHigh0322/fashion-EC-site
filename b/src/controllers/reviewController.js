const reviewModel = require("../model/reviewModel");

// Create a new review (authenticated users only)
exports.createReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, orderId, rating, title, comment } = req.body;

    console.log("Creating review - userId:", userId, "productId:", productId, "orderId:", orderId);

    if (!productId || !orderId || !rating) {
      return res.status(400).json({
        message: "商品ID、注文ID、評価が必要です",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "評価は1から5の範囲で指定してください",
      });
    }

    const review = await reviewModel.createReview(userId, productId, orderId, {
      rating,
      title,
      comment,
    });

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error("Error creating review:", error.message);
    console.error("Stack:", error.stack);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get reviews for a product
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const status = req.user && req.user.role === "admin" ? req.query.status : "approved";
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const result = await reviewModel.getProductReviews(
      productId,
      status,
      limit,
      offset
    );

    res.json(result);
  } catch (error) {
    console.error("Error getting product reviews:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get all reviews (admin only)
exports.getAllReviews = async (req, res) => {
  try {
    const { status, productId, userId, rating } = req.query;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const filters = {
      status,
      productId,
      userId,
      rating: rating ? parseInt(rating) : undefined,
    };

    const result = await reviewModel.getAllReviews(filters, limit, offset);

    res.json(result);
  } catch (error) {
    console.error("Error getting all reviews:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get user's reviews
exports.getUserReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const result = await reviewModel.getUserReviews(userId, limit, offset);

    res.json(result);
  } catch (error) {
    console.error("Error getting user reviews:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get a single review
exports.getReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await reviewModel.getReviewById(id);
    res.json(review);
  } catch (error) {
    console.error("Error getting review:", error);
    res.status(404).json({ message: error.message });
  }
};

// Update review
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    if (updates.rating && (updates.rating < 1 || updates.rating > 5)) {
      return res.status(400).json({
        message: "評価は1から5の範囲で指定してください",
      });
    }

    const review = await reviewModel.updateReview(id, userId, updates);
    res.json(review);
  } catch (error) {
    console.error("Error updating review:", error);
    res.status(500).json({ message: error.message });
  }
};

// Moderate review (admin only)
exports.moderateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        message: "ステータスが必要です",
      });
    }

    const review = await reviewModel.moderateReview(id, status, req.user.id);
    res.json(review);
  } catch (error) {
    console.error("Error moderating review:", error);
    res.status(500).json({ message: error.message });
  }
};

// Add admin reply
exports.addAdminReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply) {
      return res.status(400).json({
        message: "返信内容が必要です",
      });
    }

    const review = await reviewModel.addAdminReply(id, reply, req.user.id);
    res.json(review);
  } catch (error) {
    console.error("Error adding admin reply:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete review
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    const result = await reviewModel.deleteReview(id, userId, isAdmin);
    res.json(result);
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get reviewable products for user
exports.getReviewableProducts = async (req, res) => {
  try {
    const userId = req.user.id;
    const products = await reviewModel.getReviewableProducts(userId);
    res.json(products);
  } catch (error) {
    console.error("Error getting reviewable products:", error);
    res.status(500).json({ message: error.message });
  }
};

