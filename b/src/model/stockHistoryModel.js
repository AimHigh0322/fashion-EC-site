const pool = require("../db/db");
const { v4: uuidv4 } = require("uuid");

// Record stock change
async function recordStockChange(
  productId,
  changeType,
  quantityChange,
  quantityBefore,
  quantityAfter,
  referenceId = null,
  referenceType = null,
  notes = null,
  createdBy = null
) {
  const id = uuidv4();

  await pool.query(
    `INSERT INTO stock_history 
     (id, product_id, change_type, quantity_change, quantity_before, quantity_after, 
      reference_id, reference_type, notes, created_by) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      productId,
      changeType,
      quantityChange,
      quantityBefore,
      quantityAfter,
      referenceId,
      referenceType,
      notes,
      createdBy,
    ]
  );

  return { id, productId, changeType, quantityChange };
}

// Get stock history for a product
async function getStockHistory(productId, limit = 50, offset = 0) {
  const [history] = await pool.query(
    `SELECT sh.*, p.name as product_name, p.sku, u.username as created_by_name
     FROM stock_history sh
     LEFT JOIN products p ON sh.product_id = p.id
     LEFT JOIN users u ON sh.created_by = u.id
     WHERE sh.product_id = ?
     ORDER BY sh.createdAt DESC
     LIMIT ? OFFSET ?`,
    [productId, limit, offset]
  );

  const [countResult] = await pool.query(
    "SELECT COUNT(*) as total FROM stock_history WHERE product_id = ?",
    [productId]
  );

  return {
    history,
    total: countResult[0].total,
    limit,
    offset,
  };
}

// Get all stock changes (for admin)
async function getAllStockHistory(filters = {}, limit = 100, offset = 0) {
  const { changeType, productId, startDate, endDate } = filters;

  let query = `
    SELECT sh.*, p.name as product_name, p.sku, u.username as created_by_name
    FROM stock_history sh
    LEFT JOIN products p ON sh.product_id = p.id
    LEFT JOIN users u ON sh.created_by = u.id
    WHERE 1=1
  `;
  const queryParams = [];

  if (changeType) {
    query += " AND sh.change_type = ?";
    queryParams.push(changeType);
  }

  if (productId) {
    query += " AND sh.product_id = ?";
    queryParams.push(productId);
  }

  if (startDate) {
    query += " AND sh.createdAt >= ?";
    queryParams.push(startDate);
  }

  if (endDate) {
    query += " AND sh.createdAt <= ?";
    queryParams.push(endDate);
  }

  query += " ORDER BY sh.createdAt DESC LIMIT ? OFFSET ?";
  queryParams.push(limit, offset);

  const [history] = await pool.query(query, queryParams);

  // Get total count
  let countQuery = `
    SELECT COUNT(*) as total
    FROM stock_history sh
    WHERE 1=1
  `;
  const countParams = [];

  if (changeType) {
    countQuery += " AND sh.change_type = ?";
    countParams.push(changeType);
  }

  if (productId) {
    countQuery += " AND sh.product_id = ?";
    countParams.push(productId);
  }

  if (startDate) {
    countQuery += " AND sh.createdAt >= ?";
    countParams.push(startDate);
  }

  if (endDate) {
    countQuery += " AND sh.createdAt <= ?";
    countParams.push(endDate);
  }

  const [countResult] = await pool.query(countQuery, countParams);

  return {
    history,
    total: countResult[0].total,
    limit,
    offset,
  };
}

// Get low stock products
async function getLowStockProducts() {
  const [products] = await pool.query(
    `SELECT p.*, 
     (p.stock_quantity <= p.low_stock_threshold) as is_low_stock,
     (p.stock_quantity = 0) as is_out_of_stock
     FROM products p
     WHERE p.stock_quantity <= p.low_stock_threshold
     ORDER BY p.stock_quantity ASC, p.name ASC`
  );

  return products;
}

// Update product stock with history tracking
async function updateProductStock(
  productId,
  quantityChange,
  changeType,
  referenceId = null,
  referenceType = null,
  notes = null,
  createdBy = null
) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Get current stock
    const [products] = await connection.query(
      "SELECT stock_quantity FROM products WHERE id = ?",
      [productId]
    );

    if (products.length === 0) {
      throw new Error("商品が見つかりません");
    }

    const quantityBefore = products[0].stock_quantity;
    const quantityAfter = quantityBefore + quantityChange;

    // Prevent negative stock
    if (quantityAfter < 0) {
      throw new Error("在庫数がマイナスになります");
    }

    // Update product stock
    await connection.query(
      "UPDATE products SET stock_quantity = ? WHERE id = ?",
      [quantityAfter, productId]
    );

    // Record history
    const historyId = uuidv4();
    await connection.query(
      `INSERT INTO stock_history 
       (id, product_id, change_type, quantity_change, quantity_before, quantity_after, 
        reference_id, reference_type, notes, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        historyId,
        productId,
        changeType,
        quantityChange,
        quantityBefore,
        quantityAfter,
        referenceId,
        referenceType,
        notes,
        createdBy,
      ]
    );

    // Update product status if out of stock
    if (quantityAfter === 0) {
      await connection.query(
        "UPDATE products SET status = 'out_of_stock' WHERE id = ?",
        [productId]
      );
    } else if (quantityBefore === 0 && quantityAfter > 0) {
      // Restore to active if restocked
      await connection.query(
        "UPDATE products SET status = 'active' WHERE id = ?",
        [productId]
      );
    }

    await connection.commit();

    return {
      productId,
      quantityBefore,
      quantityAfter,
      quantityChange,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  recordStockChange,
  getStockHistory,
  getAllStockHistory,
  getLowStockProducts,
  updateProductStock,
};

