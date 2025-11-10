// Auth Model - MySQL implementation
const pool = require("../db/db");

// Find user by email
const findUserByEmail = async (email) => {
  try {
    if (!email) {
      return null;
    }
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email.toLowerCase(),
    ]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error finding user by email:", error);
    // Throw error so controller can handle it properly
    const dbError = new Error("データベース接続エラーが発生しました。");
    dbError.code = "DATABASE_ERROR";
    throw dbError;
  }
};

// Find user by ID
const findUserById = async (id) => {
  try {
    if (!id) {
      return null;
    }
    const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error finding user by id:", error);
    // Return null instead of throwing to prevent crashes
    return null;
  }
};

// Find user by username
const findUserByUsername = async (username) => {
  try {
    if (!username) {
      return null;
    }
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error finding user by username:", error);
    // Throw error so controller can handle it properly
    const dbError = new Error("データベース接続エラーが発生しました。");
    dbError.code = "DATABASE_ERROR";
    throw dbError;
  }
};

// Create new user
const createUser = async (userData) => {
  try {
    if (
      !userData ||
      !userData.id ||
      !userData.username ||
      !userData.email ||
      !userData.password
    ) {
      const error = new Error("必要なユーザーデータが不足しています。");
      error.code = "MISSING_DATA";
      throw error;
    }

    const { id, username, email, password, role } = userData;
    const [result] = await pool.query(
      "INSERT INTO users (id, username, email, password, role) VALUES (?, ?, ?, ?, ?)",
      [id, username, email.toLowerCase(), password, role || "user"]
    );
    return { id, username, email: email.toLowerCase(), role: role || "user" };
  } catch (error) {
    console.error("Error creating user:", error);
    // Handle duplicate entry error
    if (error.code === "ER_DUP_ENTRY") {
      if (
        error.message.includes("username") ||
        error.message.includes("idx_username")
      ) {
        const duplicateError = new Error(
          "このユーザー名は既に使用されています。"
        );
        duplicateError.code = "DUPLICATE_USERNAME";
        throw duplicateError;
      } else {
        const duplicateError = new Error(
          "このメールアドレスは既に使用されています。"
        );
        duplicateError.code = "DUPLICATE_EMAIL";
        throw duplicateError;
      }
    }
    // Re-throw with original error if it's already a custom error
    if (
      error.code === "MISSING_DATA" ||
      error.code === "DUPLICATE_USERNAME" ||
      error.code === "DUPLICATE_EMAIL"
    ) {
      throw error;
    }
    // For other database errors, throw a generic error
    const dbError = new Error("データベースエラーが発生しました。");
    dbError.code = "DATABASE_ERROR";
    throw dbError;
  }
};

// Update user
const updateUser = async (id, updateData) => {
  try {
    if (!id) {
      return null;
    }

    const fields = [];
    const values = [];

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    });

    if (fields.length === 0) {
      return await findUserById(id);
    }

    values.push(id);
    await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    return await findUserById(id);
  } catch (error) {
    console.error("Error updating user:", error);
    // Return null instead of throwing to prevent crashes
    return null;
  }
};

// Get all users with pagination and search
const getAllUsers = async (options = {}) => {
  try {
    const {
      search = "",
      role = "",
      limit = 50,
      offset = 0,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = options;

    let query =
      "SELECT id, username, email, role, status, createdAt, updatedAt FROM users WHERE 1=1";
    const params = [];

    // Exclude admin users by default (unless explicitly filtering for admin role)
    if (role !== "admin") {
      query += " AND role != 'admin'";
    }

    // Add search filter
    if (search) {
      query += " AND (username LIKE ? OR email LIKE ?)";
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    // Add role filter
    if (role) {
      query += " AND role = ?";
      params.push(role);
    }

    // Add sorting
    const allowedSortBy = [
      "username",
      "email",
      "role",
      "createdAt",
      "updatedAt",
    ];
    const sortColumn = allowedSortBy.includes(sortBy) ? sortBy : "createdAt";
    const sortDirection = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
    query += ` ORDER BY ${sortColumn} ${sortDirection}`;

    // Add pagination
    query += " LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);

    // Get total count
    let countQuery = "SELECT COUNT(*) as total FROM users WHERE 1=1";
    const countParams = [];

    // Exclude admin users by default (unless explicitly filtering for admin role)
    if (role !== "admin") {
      countQuery += " AND role != 'admin'";
    }

    if (search) {
      countQuery += " AND (username LIKE ? OR email LIKE ?)";
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern);
    }
    if (role) {
      countQuery += " AND role = ?";
      countParams.push(role);
    }
    const [countRows] = await pool.query(countQuery, countParams);
    const total = countRows[0]?.total || 0;

    return {
      users: rows,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    };
  } catch (error) {
    console.error("Error getting all users:", error);
    const dbError = new Error("データベース接続エラーが発生しました。");
    dbError.code = "DATABASE_ERROR";
    throw dbError;
  }
};

// Delete user
const deleteUser = async (id) => {
  try {
    if (!id) {
      return false;
    }

    const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error deleting user:", error);
    const dbError = new Error("データベースエラーが発生しました。");
    dbError.code = "DATABASE_ERROR";
    throw dbError;
  }
};

// Get user statistics
const getUserStats = async () => {
  try {
    // Exclude admin users from statistics
    const [totalUsers] = await pool.query(
      "SELECT COUNT(*) as total FROM users WHERE role != 'admin'"
    );
    const [activeUsers] = await pool.query(
      "SELECT COUNT(*) as total FROM users WHERE role = 'user'"
    );
    const [adminUsers] = await pool.query(
      "SELECT COUNT(*) as total FROM users WHERE role = 'admin'"
    );

    // Get order counts per user
    const [orderCounts] = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        COUNT(o.id) as order_count
      FROM users u
      LEFT JOIN customers c ON c.user_id = u.id
      LEFT JOIN orders o ON o.customer_id = c.id
      GROUP BY u.id, u.username, u.email
    `);

    return {
      total: totalUsers[0]?.total || 0,
      active: activeUsers[0]?.total || 0,
      admins: adminUsers[0]?.total || 0,
      orderCounts: orderCounts || [],
    };
  } catch (error) {
    console.error("Error getting user stats:", error);
    const dbError = new Error("データベース接続エラーが発生しました。");
    dbError.code = "DATABASE_ERROR";
    throw dbError;
  }
};

module.exports = {
  findUserByEmail,
  findUserByUsername,
  findUserById,
  createUser,
  updateUser,
  getAllUsers,
  deleteUser,
  getUserStats,
};
