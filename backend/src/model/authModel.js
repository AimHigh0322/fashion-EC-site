// Auth Model - MySQL implementation
const pool = require("../db/db");

// Find user by email
const findUserByEmail = async (email) => {
  try {
    if (!email) {
      return null;
    }
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email.toLowerCase()]
    );
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
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );
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
    if (!userData || !userData.id || !userData.username || !userData.email || !userData.password) {
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
      if (error.message.includes("username") || error.message.includes("idx_username")) {
        const duplicateError = new Error("このユーザー名は既に使用されています。");
        duplicateError.code = "DUPLICATE_USERNAME";
        throw duplicateError;
      } else {
        const duplicateError = new Error("このメールアドレスは既に使用されています。");
        duplicateError.code = "DUPLICATE_EMAIL";
        throw duplicateError;
      }
    }
    // Re-throw with original error if it's already a custom error
    if (error.code === "MISSING_DATA" || error.code === "DUPLICATE_USERNAME" || error.code === "DUPLICATE_EMAIL") {
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

module.exports = {
  findUserByEmail,
  findUserByUsername,
  findUserById,
  createUser,
  updateUser,
};
