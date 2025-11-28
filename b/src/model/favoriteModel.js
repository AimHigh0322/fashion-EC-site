const pool = require("../db/db");
const { v4: uuidv4 } = require("uuid");

// Add product to favorites
async function addFavorite(userId, productId) {
  const id = uuidv4();
  try {
    console.log("addFavorite - Inserting:", { id, userId, productId });
    
    // First, check if product exists
    const [productCheck] = await pool.query(
      `SELECT id FROM products WHERE id = ?`,
      [productId]
    );
    
    if (!productCheck || productCheck.length === 0) {
      console.error("addFavorite - Product not found:", productId);
      throw new Error(`Product with ID ${productId} does not exist`);
    }
    
    const [result] = await pool.query(
      `INSERT INTO favorites (id, user_id, product_id) VALUES (?, ?, ?)`,
      [id, userId, productId]
    );
    console.log("addFavorite - Insert result:", result);
    return { id, user_id: userId, product_id: productId };
  } catch (error) {
    console.error("addFavorite - Error:", error);
    // If duplicate entry (already favorited), return existing
    if (error.code === "ER_DUP_ENTRY" || error.code === 1062) {
      console.log("addFavorite - Duplicate entry, fetching existing");
      const [existing] = await pool.query(
        `SELECT * FROM favorites WHERE user_id = ? AND product_id = ?`,
        [userId, productId]
      );
      if (existing && existing.length > 0) {
        return { id: existing[0].id, user_id: existing[0].user_id, product_id: existing[0].product_id };
      }
      return null;
    }
    // If foreign key constraint fails (product doesn't exist)
    if (error.code === "ER_NO_REFERENCED_ROW_2" || error.code === 1452) {
      console.error("addFavorite - Foreign key constraint failed, product doesn't exist");
      throw new Error(`Product with ID ${productId} does not exist in the database`);
    }
    throw error;
  }
}

// Remove product from favorites
async function removeFavorite(userId, productId) {
  await pool.query(
    `DELETE FROM favorites WHERE user_id = ? AND product_id = ?`,
    [userId, productId]
  );
  return { user_id: userId, product_id: productId };
}

// Get user's favorites
async function getUserFavorites(userId) {
  const [favorites] = await pool.query(
    `SELECT f.*, p.id as product_id, p.name, p.sku, p.price, p.main_image_url, p.status
     FROM favorites f
     INNER JOIN products p ON f.product_id = p.id
     WHERE f.user_id = ?
     ORDER BY f.createdAt DESC`,
    [userId]
  );
  return favorites;
}

// Check if product is favorited by user
async function isFavorited(userId, productId) {
  const [results] = await pool.query(
    `SELECT id FROM favorites WHERE user_id = ? AND product_id = ?`,
    [userId, productId]
  );
  return results.length > 0;
}

// Get favorite status for multiple products
async function getFavoriteStatus(userId, productIds) {
  if (!productIds || productIds.length === 0) {
    return [];
  }
  const placeholders = productIds.map(() => "?").join(",");
  const [results] = await pool.query(
    `SELECT product_id FROM favorites WHERE user_id = ? AND product_id IN (${placeholders})`,
    [userId, ...productIds]
  );
  return results.map((row) => row.product_id);
}

// Get favorite count for a product (how many users have favorited it)
async function getProductFavoriteCount(productId) {
  const [results] = await pool.query(
    `SELECT COUNT(*) as count FROM favorites WHERE product_id = ?`,
    [productId]
  );
  return results[0]?.count || 0;
}

module.exports = {
  addFavorite,
  removeFavorite,
  getUserFavorites,
  isFavorited,
  getFavoriteStatus,
  getProductFavoriteCount,
};

