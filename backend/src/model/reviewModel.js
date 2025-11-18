const pool = require("../db/db");
const { v4: uuidv4 } = require("uuid");

// Create a new review (purchasers only)
async function createReview(userId, productId, orderId, reviewData) {
  const { rating, title, comment } = reviewData;

  // Verify that the user purchased this product
  const [orderItems] = await pool.query(
    `SELECT oi.* FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     JOIN customers c ON o.customer_id = c.id
     WHERE c.user_id = ? AND oi.product_id = ? AND o.id = ? AND o.status != 'cancelled'`,
    [userId, productId, orderId]
  );

  if (orderItems.length === 0) {
    throw new Error("この商品を購入していないため、レビューを投稿できません");
  }

  // Check if review already exists for this order
  const [existingReview] = await pool.query(
    "SELECT id FROM product_reviews WHERE user_id = ? AND product_id = ? AND order_id = ?",
    [userId, productId, orderId]
  );

  if (existingReview.length > 0) {
    throw new Error("この注文に対するレビューは既に投稿されています");
  }

  const reviewId = uuidv4();

  await pool.query(
    `INSERT INTO product_reviews 
     (id, product_id, user_id, order_id, rating, title, comment, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [reviewId, productId, userId, orderId, rating, title, comment]
  );

  const [review] = await pool.query(
    "SELECT * FROM product_reviews WHERE id = ?",
    [reviewId]
  );

  return review[0];
}

// Get reviews for a product (approved only for public, all for admin)
async function getProductReviews(productId, status = "approved", limit = 50, offset = 0) {
  let query = `
    SELECT pr.*, u.username, u.first_name, u.last_name, u.avatar_url
    FROM product_reviews pr
    LEFT JOIN users u ON pr.user_id = u.id
    WHERE pr.product_id = ?
  `;
  const queryParams = [productId];

  if (status && status !== "all") {
    query += " AND pr.status = ?";
    queryParams.push(status);
  }

  query += " ORDER BY pr.createdAt DESC LIMIT ? OFFSET ?";
  queryParams.push(limit, offset);

  const [reviews] = await pool.query(query, queryParams);

  // Get total count
  let countQuery = `
    SELECT COUNT(*) as total
    FROM product_reviews
    WHERE product_id = ?
  `;
  const countParams = [productId];

  if (status && status !== "all") {
    countQuery += " AND status = ?";
    countParams.push(status);
  }

  const [countResult] = await pool.query(countQuery, countParams);

  return {
    reviews,
    total: countResult[0].total,
    limit,
    offset,
  };
}

// Get all reviews (for admin moderation)
async function getAllReviews(filters = {}, limit = 50, offset = 0) {
  const { status, productId, userId, rating } = filters;

  let query = `
    SELECT pr.*, u.username, u.first_name, u.last_name, 
     p.name as product_name, p.sku as product_sku
    FROM product_reviews pr
    LEFT JOIN users u ON pr.user_id = u.id
    LEFT JOIN products p ON pr.product_id = p.id
    WHERE 1=1
  `;
  const queryParams = [];

  if (status) {
    query += " AND pr.status = ?";
    queryParams.push(status);
  }

  if (productId) {
    query += " AND pr.product_id = ?";
    queryParams.push(productId);
  }

  if (userId) {
    query += " AND pr.user_id = ?";
    queryParams.push(userId);
  }

  if (rating) {
    query += " AND pr.rating = ?";
    queryParams.push(rating);
  }

  query += " ORDER BY pr.createdAt DESC LIMIT ? OFFSET ?";
  queryParams.push(limit, offset);

  const [reviews] = await pool.query(query, queryParams);

  // Get total count
  let countQuery = `
    SELECT COUNT(*) as total
    FROM product_reviews pr
    WHERE 1=1
  `;
  const countParams = [];

  if (status) {
    countQuery += " AND pr.status = ?";
    countParams.push(status);
  }

  if (productId) {
    countQuery += " AND pr.product_id = ?";
    countParams.push(productId);
  }

  if (userId) {
    countQuery += " AND pr.user_id = ?";
    countParams.push(userId);
  }

  if (rating) {
    countQuery += " AND pr.rating = ?";
    countParams.push(rating);
  }

  const [countResult] = await pool.query(countQuery, countParams);

  return {
    reviews,
    total: countResult[0].total,
    limit,
    offset,
  };
}

// Get user's reviews
async function getUserReviews(userId, limit = 50, offset = 0) {
  const [reviews] = await pool.query(
    `SELECT pr.*, p.name as product_name, p.main_image_url as product_image
     FROM product_reviews pr
     LEFT JOIN products p ON pr.product_id = p.id
     WHERE pr.user_id = ?
     ORDER BY pr.createdAt DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );

  const [countResult] = await pool.query(
    "SELECT COUNT(*) as total FROM product_reviews WHERE user_id = ?",
    [userId]
  );

  return {
    reviews,
    total: countResult[0].total,
    limit,
    offset,
  };
}

// Get a single review
async function getReviewById(reviewId) {
  const [reviews] = await pool.query(
    `SELECT pr.*, u.username, u.first_name, u.last_name, 
     p.name as product_name, p.sku as product_sku
     FROM product_reviews pr
     LEFT JOIN users u ON pr.user_id = u.id
     LEFT JOIN products p ON pr.product_id = p.id
     WHERE pr.id = ?`,
    [reviewId]
  );

  if (reviews.length === 0) {
    throw new Error("レビューが見つかりません");
  }

  return reviews[0];
}

// Update review (user can edit their own review while pending)
async function updateReview(reviewId, userId, updates) {
  const { rating, title, comment } = updates;

  // Verify ownership and check if still editable
  const [reviews] = await pool.query(
    "SELECT * FROM product_reviews WHERE id = ? AND user_id = ?",
    [reviewId, userId]
  );

  if (reviews.length === 0) {
    throw new Error("レビューが見つかりません、または編集する権限がありません");
  }

  if (reviews[0].status === "approved") {
    throw new Error("承認済みのレビューは編集できません");
  }

  const updateFields = [];
  const values = [];

  if (rating !== undefined) {
    updateFields.push("rating = ?");
    values.push(rating);
  }
  if (title !== undefined) {
    updateFields.push("title = ?");
    values.push(title);
  }
  if (comment !== undefined) {
    updateFields.push("comment = ?");
    values.push(comment);
  }

  if (updateFields.length === 0) {
    return getReviewById(reviewId);
  }

  values.push(reviewId);

  await pool.query(
    `UPDATE product_reviews SET ${updateFields.join(", ")} WHERE id = ?`,
    values
  );

  return getReviewById(reviewId);
}

// Moderate review (admin only)
async function moderateReview(reviewId, status, adminId = null) {
  if (!["approved", "rejected", "pending"].includes(status)) {
    throw new Error("無効なステータスです");
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Get the review
    const [reviews] = await connection.query(
      "SELECT * FROM product_reviews WHERE id = ?",
      [reviewId]
    );

    if (reviews.length === 0) {
      throw new Error("レビューが見つかりません");
    }

    const review = reviews[0];
    const oldStatus = review.status;

    // Update review status
    await connection.query(
      "UPDATE product_reviews SET status = ? WHERE id = ?",
      [status, reviewId]
    );

    // Update product rating if status changed to/from approved
    if (oldStatus !== status) {
      if (status === "approved" && oldStatus !== "approved") {
        // Add this review to product rating
        await updateProductRating(connection, review.product_id);
      } else if (oldStatus === "approved" && status !== "approved") {
        // Remove this review from product rating
        await updateProductRating(connection, review.product_id);
      }
    }

    await connection.commit();

    return getReviewById(reviewId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Add admin reply to review
async function addAdminReply(reviewId, reply, adminId) {
  await pool.query(
    "UPDATE product_reviews SET admin_reply = ?, admin_reply_at = NOW() WHERE id = ?",
    [reply, reviewId]
  );

  return getReviewById(reviewId);
}

// Delete review
async function deleteReview(reviewId, userId = null, isAdmin = false) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Get the review
    const [reviews] = await connection.query(
      "SELECT * FROM product_reviews WHERE id = ?",
      [reviewId]
    );

    if (reviews.length === 0) {
      throw new Error("レビューが見つかりません");
    }

    const review = reviews[0];

    // Check permission
    if (!isAdmin && review.user_id !== userId) {
      throw new Error("このレビューを削除する権限がありません");
    }

    // Delete the review
    await connection.query("DELETE FROM product_reviews WHERE id = ?", [
      reviewId,
    ]);

    // Update product rating
    if (review.status === "approved") {
      await updateProductRating(connection, review.product_id);
    }

    await connection.commit();

    return { success: true, message: "レビューが削除されました" };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Update product rating and review count
async function updateProductRating(connection, productId) {
  const [result] = await connection.query(
    `SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
     FROM product_reviews
     WHERE product_id = ? AND status = 'approved'`,
    [productId]
  );

  const avgRating = result[0].avg_rating || 0;
  const reviewCount = result[0].review_count || 0;

  await connection.query(
    "UPDATE products SET average_rating = ?, review_count = ? WHERE id = ?",
    [avgRating, reviewCount, productId]
  );

  return { avgRating, reviewCount };
}

// Get purchasable products for review (products user bought but haven't reviewed)
async function getReviewableProducts(userId) {
  const [products] = await pool.query(
    `SELECT DISTINCT p.*, o.id as order_id, o.createdAt as purchase_date
     FROM products p
     JOIN order_items oi ON p.id = oi.product_id
     JOIN orders o ON oi.order_id = o.id
     JOIN customers c ON o.customer_id = c.id
     WHERE c.user_id = ? 
     AND o.status = 'delivered'
     AND NOT EXISTS (
       SELECT 1 FROM product_reviews pr 
       WHERE pr.product_id = p.id 
       AND pr.user_id = ? 
       AND pr.order_id = o.id
     )
     ORDER BY o.createdAt DESC`,
    [userId, userId]
  );

  return products;
}

module.exports = {
  createReview,
  getProductReviews,
  getAllReviews,
  getUserReviews,
  getReviewById,
  updateReview,
  moderateReview,
  addAdminReply,
  deleteReview,
  getReviewableProducts,
  updateProductRating,
};

