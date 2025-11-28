const authModel = require("../model/authModel");
const bcrypt = require("bcryptjs");
const pool = require("../db/db");

// Get current user's profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await authModel.findUserById(userId);

    if (!user) {
      return res.status(404).json({ error: "ユーザーが見つかりません。" });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return res.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({
      error:
        "プロフィール情報の取得中にエラーが発生しました。しばらくしてから再度お試しください。",
    });
  }
};

// Update current user's profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      first_name,
      last_name,
      email,
      phone,
      postal_code,
      prefecture,
      city,
      street_address,
      apartment,
    } = req.body;

    // Check if user exists
    const existingUser = await authModel.findUserById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: "ユーザーが見つかりません。" });
    }

    // Prepare update data
    const updateData = {};
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (phone !== undefined) updateData.phone = phone;
    if (postal_code !== undefined) updateData.postal_code = postal_code;
    if (prefecture !== undefined) updateData.prefecture = prefecture;
    if (city !== undefined) updateData.city = city;
    if (street_address !== undefined)
      updateData.street_address = street_address;
    if (apartment !== undefined) updateData.apartment = apartment;

    // Check for duplicate email if email is being updated
    if (email && email.toLowerCase() !== existingUser.email) {
      const duplicateUser = await authModel.findUserByEmail(email);
      if (duplicateUser && duplicateUser.id !== userId) {
        return res
          .status(409)
          .json({ error: "このメールアドレスは既に使用されています。" });
      }
      updateData.email = email.toLowerCase();
    }

    // Update user
    const updatedUser = await authModel.updateUser(userId, updateData);

    if (!updatedUser) {
      return res.status(500).json({
        error: "プロフィールの更新に失敗しました。",
      });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;

    return res.json({
      success: true,
      message: "プロフィールが正常に更新されました。",
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    if (error.code === "DUPLICATE_EMAIL") {
      return res
        .status(409)
        .json({ error: "このメールアドレスは既に使用されています。" });
    }
    return res.status(500).json({
      error:
        "プロフィールの更新中にエラーが発生しました。しばらくしてから再度お試しください。",
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: "現在のパスワードと新しいパスワードは必須です。",
      });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "新しいパスワードは8文字以上である必要があります。" });
    }

    // Get user with password
    const user = await authModel.findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "ユーザーが見つかりません。" });
    }

    // Get password from database
    const [users] = await pool.query(
      "SELECT password FROM users WHERE id = ?",
      [userId]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: "ユーザーが見つかりません。" });
    }

    const hashedPassword = users[0].password;

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      hashedPassword
    );
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ error: "現在のパスワードが正しくありません。" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    await pool.query("UPDATE users SET password = ? WHERE id = ?", [
      newPasswordHash,
      userId,
    ]);

    return res.json({
      success: true,
      message: "パスワードが正常に変更されました。",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({
      error:
        "パスワードの変更中にエラーが発生しました。しばらくしてから再度お試しください。",
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
};
