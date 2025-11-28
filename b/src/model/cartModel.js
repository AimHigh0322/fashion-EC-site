const pool = require("../db/db");
const { v4: uuidv4 } = require("uuid");

// Add product to cart or update quantity
async function addToCart(userId, productId, quantity = 1) {
  const id = uuidv4();
  try {
    // Check if product exists
    const [productCheck] = await pool.query(
      `SELECT id, stock_quantity, status FROM products WHERE id = ?`,
      [productId]
    );
    
    if (!productCheck || productCheck.length === 0) {
      throw new Error(`Product with ID ${productId} does not exist`);
    }

    const product = productCheck[0];
    if (product.status !== "active") {
      throw new Error("この商品は現在ご利用いただけません");
    }

    // Check if item already in cart
    const [existing] = await pool.query(
      `SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );

    if (existing && existing.length > 0) {
      // Update quantity
      const newQuantity = existing[0].quantity + quantity;
      if (product.stock_quantity > 0 && newQuantity > product.stock_quantity) {
        throw new Error(`在庫が不足しています。残り在庫: ${product.stock_quantity}個`);
      }
      await pool.query(
        `UPDATE cart SET quantity = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        [newQuantity, existing[0].id]
      );
      return { id: existing[0].id, user_id: userId, product_id: productId, quantity: newQuantity };
    } else {
      // Add new item
      if (product.stock_quantity > 0 && quantity > product.stock_quantity) {
        throw new Error(`在庫が不足しています。残り在庫: ${product.stock_quantity}個`);
      }
      await pool.query(
        `INSERT INTO cart (id, user_id, product_id, quantity) VALUES (?, ?, ?, ?)`,
        [id, userId, productId, quantity]
      );
      return { id, user_id: userId, product_id: productId, quantity };
    }
  } catch (error) {
    console.error("addToCart - Error:", error);
    throw error;
  }
}

// Remove product from cart
async function removeFromCart(userId, productId) {
  await pool.query(
    `DELETE FROM cart WHERE user_id = ? AND product_id = ?`,
    [userId, productId]
  );
  return { user_id: userId, product_id: productId };
}

// Update cart item quantity
async function updateCartQuantity(userId, productId, quantity) {
  if (quantity <= 0) {
    return removeFromCart(userId, productId);
  }

  // Check stock
  const [productCheck] = await pool.query(
    `SELECT stock_quantity FROM products WHERE id = ?`,
    [productId]
  );
  
  if (productCheck && productCheck.length > 0) {
    const stockQuantity = productCheck[0].stock_quantity;
    if (stockQuantity > 0 && quantity > stockQuantity) {
      throw new Error(`在庫が不足しています。残り在庫: ${stockQuantity}個`);
    }
  }

  await pool.query(
    `UPDATE cart SET quantity = ?, updatedAt = CURRENT_TIMESTAMP WHERE user_id = ? AND product_id = ?`,
    [quantity, userId, productId]
  );
  return { user_id: userId, product_id: productId, quantity };
}

// Get user's cart
async function getUserCart(userId) {
  const [cartItems] = await pool.query(
    `SELECT c.*, p.id as product_id, p.name, p.sku, p.price, p.main_image_url, p.status, p.stock_quantity
     FROM cart c
     INNER JOIN products p ON c.product_id = p.id
     WHERE c.user_id = ?
     ORDER BY c.createdAt DESC`,
    [userId]
  );
  return cartItems;
}

// Get cart count
async function getCartCount(userId) {
  const [result] = await pool.query(
    `SELECT COUNT(*) as count, SUM(quantity) as total_quantity FROM cart WHERE user_id = ?`,
    [userId]
  );
  return {
    itemCount: result[0]?.count || 0,
    totalQuantity: result[0]?.total_quantity || 0,
  };
}

// Clear user's cart
async function clearCart(userId) {
  await pool.query(`DELETE FROM cart WHERE user_id = ?`, [userId]);
  return { user_id: userId };
}

module.exports = {
  addToCart,
  removeFromCart,
  updateCartQuantity,
  getUserCart,
  getCartCount,
  clearCart,
};

