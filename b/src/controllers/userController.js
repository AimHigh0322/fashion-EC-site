const authModel = require("../model/authModel");

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const {
      search = "",
      role = "",
      limit = 50,
      offset = 0,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const result = await authModel.getAllUsers({
      search,
      role,
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    // Get order counts for each user
    const pool = require("../db/db");
    const userIds = result.users.map((u) => u.id);
    let orderCountsMap = {};

    if (userIds.length > 0) {
      const placeholders = userIds.map(() => "?").join(",");
      const [orderCounts] = await pool.query(
        `
        SELECT 
          u.id,
          COUNT(o.id) as order_count
        FROM users u
        LEFT JOIN customers c ON c.user_id = u.id
        LEFT JOIN orders o ON o.customer_id = c.id
        WHERE u.id IN (${placeholders})
        GROUP BY u.id
      `,
        userIds
      );

      orderCounts.forEach((item) => {
        orderCountsMap[item.id] = item.order_count || 0;
      });
    }

    // Add order counts to users
    const usersWithOrders = result.users.map((user) => ({
      ...user,
      orders: orderCountsMap[user.id] || 0,
      status: user.status || "active", // Use status from database or default to active
    }));

    return res.json({
      users: usersWithOrders,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    if (error.code === "DATABASE_ERROR") {
      return res.status(500).json({
        error:
          "データベース接続エラーが発生しました。しばらくしてから再度お試しください。",
      });
    }
    return res.status(500).json({
      error:
        "ユーザー情報の取得中にエラーが発生しました。しばらくしてから再度お試しください。",
    });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "ユーザーIDが必要です。" });
    }

    const user = await authModel.findUserById(id);

    if (!user) {
      return res.status(404).json({ error: "ユーザーが見つかりません。" });
    }

    // Get order count
    const pool = require("../db/db");
    const [orderCounts] = await pool.query(
      `
      SELECT COUNT(o.id) as order_count
      FROM users u
      LEFT JOIN customers c ON c.user_id = u.id
      LEFT JOIN orders o ON o.customer_id = c.id
      WHERE u.id = ?
      GROUP BY u.id
    `,
      [id]
    );

    const orderCount = orderCounts[0]?.order_count || 0;

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return res.json({
      ...userWithoutPassword,
      orders: orderCount,
      status: user.status || "active",
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    return res.status(500).json({
      error:
        "ユーザー情報の取得中にエラーが発生しました。しばらくしてから再度お試しください。",
    });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role } = req.body;

    if (!id) {
      return res.status(400).json({ error: "ユーザーIDが必要です。" });
    }

    // Check if user exists
    const existingUser = await authModel.findUserById(id);
    if (!existingUser) {
      return res.status(404).json({ error: "ユーザーが見つかりません。" });
    }

    // Prepare update data
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (role !== undefined) {
      if (role !== "admin" && role !== "user") {
        return res.status(400).json({ error: "無効なロールです。" });
      }
      updateData.role = role;
    }

    // Check for duplicate username if username is being updated
    if (username && username !== existingUser.username) {
      const duplicateUser = await authModel.findUserByUsername(username);
      if (duplicateUser && duplicateUser.id !== id) {
        return res
          .status(409)
          .json({ error: "このユーザー名は既に使用されています。" });
      }
    }

    // Check for duplicate email if email is being updated
    if (email && email.toLowerCase() !== existingUser.email) {
      const duplicateUser = await authModel.findUserByEmail(email);
      if (duplicateUser && duplicateUser.id !== id) {
        return res
          .status(409)
          .json({ error: "このメールアドレスは既に使用されています。" });
      }
    }

    // Update user
    const updatedUser = await authModel.updateUser(id, updateData);

    if (!updatedUser) {
      return res.status(500).json({
        error: "ユーザーの更新に失敗しました。",
      });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;

    return res.json({
      message: "ユーザーが正常に更新されました。",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Update user error:", error);
    if (error.code === "DUPLICATE_USERNAME") {
      return res
        .status(409)
        .json({ error: "このユーザー名は既に使用されています。" });
    }
    if (error.code === "DUPLICATE_EMAIL") {
      return res
        .status(409)
        .json({ error: "このメールアドレスは既に使用されています。" });
    }
    return res.status(500).json({
      error:
        "ユーザーの更新中にエラーが発生しました。しばらくしてから再度お試しください。",
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "ユーザーIDが必要です。" });
    }

    // Prevent deleting yourself
    if (req.user && req.user.id === id) {
      return res
        .status(400)
        .json({ error: "自分自身を削除することはできません。" });
    }

    // Check if user exists
    const existingUser = await authModel.findUserById(id);
    if (!existingUser) {
      return res.status(404).json({ error: "ユーザーが見つかりません。" });
    }

    // Delete user
    const deleted = await authModel.deleteUser(id);

    if (!deleted) {
      return res.status(500).json({
        error: "ユーザーの削除に失敗しました。",
      });
    }

    return res.json({
      message: "ユーザーが正常に削除されました。",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    if (error.code === "DATABASE_ERROR") {
      return res.status(500).json({
        error:
          "データベース接続エラーが発生しました。しばらくしてから再度お試しください。",
      });
    }
    return res.status(500).json({
      error:
        "ユーザーの削除中にエラーが発生しました。しばらくしてから再度お試しください。",
    });
  }
};

// Get user statistics
const getUserStats = async (req, res) => {
  try {
    const stats = await authModel.getUserStats();

    return res.json(stats);
  } catch (error) {
    console.error("Get user stats error:", error);
    if (error.code === "DATABASE_ERROR") {
      return res.status(500).json({
        error:
          "データベース接続エラーが発生しました。しばらくしてから再度お試しください。",
      });
    }
    return res.status(500).json({
      error:
        "統計情報の取得中にエラーが発生しました。しばらくしてから再度お試しください。",
    });
  }
};

// Toggle user block status
const toggleBlockUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "ユーザーIDが必要です。" });
    }

    // Check if user exists
    const existingUser = await authModel.findUserById(id);
    if (!existingUser) {
      return res.status(404).json({ error: "ユーザーが見つかりません。" });
    }

    // Prevent blocking yourself
    if (req.user && req.user.id === id) {
      return res
        .status(400)
        .json({ error: "自分自身をブロックすることはできません。" });
    }

    // Toggle status
    const newStatus = existingUser.status === "blocked" ? "active" : "blocked";
    const updatedUser = await authModel.updateUser(id, { status: newStatus });

    if (!updatedUser) {
      return res.status(500).json({
        error: "ユーザーステータスの更新に失敗しました。",
      });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;

    return res.json({
      message: `ユーザーが${newStatus === "blocked" ? "ブロック" : "アンブロック"}されました。`,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Toggle block user error:", error);
    return res.status(500).json({
      error:
        "ユーザーステータスの更新中にエラーが発生しました。しばらくしてから再度お試しください。",
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats,
  toggleBlockUser,
};

