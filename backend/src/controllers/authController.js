const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authModel = require("../model/authModel");

// Register controller function
const register = async (req, res) => {
  try {
    console.log("req.body:", req.body);
    console.log("req.headers:", req.headers);

    // Check if req.body exists
    if (!req.body) {
      return res.status(400).json({
        error:
          "リクエストボディがありません。JSON形式でデータを送信してください。",
      });
    }

    const { username, email, password, role = "user" } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: "ユーザー名、メールアドレス、パスワードは必須です。" });
    }

    if (username.length < 3) {
      return res
        .status(400)
        .json({ error: "ユーザー名は3文字以上である必要があります。" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "パスワードは8文字以上である必要があります。" });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ error: "有効なメールアドレスを入力してください。" });
    }

    // Check if username already exists
    try {
      const existingUsername = await authModel.findUserByUsername(username);
      if (existingUsername) {
        return res
          .status(409)
          .json({ error: "このユーザー名は既に使用されています。" });
      }
    } catch (error) {
      console.error("Error checking username:", error);
      if (error.code === "DATABASE_ERROR") {
        return res.status(500).json({
          error:
            "データベース接続エラーが発生しました。しばらくしてから再度お試しください。",
        });
      }
      // For other errors, continue to email check
    }

    // Check if email already exists
    try {
      const existingUser = await authModel.findUserByEmail(email);
      if (existingUser) {
        return res
          .status(409)
          .json({ error: "このメールアドレスは既に使用されています。" });
      }
    } catch (error) {
      console.error("Error checking email:", error);
      return res.status(500).json({
        error:
          "データベース接続エラーが発生しました。しばらくしてから再度お試しください。",
      });
    }

    // Hash password
    let passwordHash;
    try {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    } catch (error) {
      console.error("Error hashing password:", error);
      return res
        .status(500)
        .json({ error: "パスワードの処理中にエラーが発生しました。" });
    }

    // Generate unique ID
    const id =
      Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

    // Create user
    let user;
    try {
      user = await authModel.createUser({
        id,
        username,
        email,
        password: passwordHash,
        role,
      });
    } catch (error) {
      console.error("Error creating user:", error);
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
          "ユーザーの作成中にエラーが発生しました。しばらくしてから再度お試しください。",
      });
    }

    // Return user data (without password)
    if (!user || !user.id) {
      return res.status(500).json({
        error: "ユーザーの作成に失敗しました。",
      });
    }

    return res.status(201).json({
      message: "ユーザー登録が完了しました",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      error:
        "登録処理中に予期しないエラーが発生しました。しばらくしてから再度お試しください。",
    });
  }
};

// Login controller function
const login = async (req, res) => {
  try {
    // Check if req.body exists
    if (!req.body) {
      return res.status(400).json({
        error:
          "リクエストボディがありません。JSON形式でデータを送信してください。",
      });
    }

    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "メールアドレスとパスワードは必須です。" });
    }

    // Find user by email
    let user;
    try {
      user = await authModel.findUserByEmail(email);
    } catch (error) {
      console.error("Error finding user:", error);
      return res.status(500).json({
        error:
          "データベース接続エラーが発生しました。しばらくしてから再度お試しください。",
      });
    }

    if (!user) {
      return res
        .status(401)
        .json({ error: "メールアドレスが見つかりません。" });
    }

    // Check password
    let match;
    try {
      match = await bcrypt.compare(password, user.password);
    } catch (error) {
      console.error("Error comparing password:", error);
      return res
        .status(500)
        .json({ error: "パスワードの確認中にエラーが発生しました。" });
    }

    if (!match) {
      return res.status(401).json({ error: "パスワードが正しくありません。" });
    }

    // Generate JWT token
    let token;
    try {
      if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is not set");
        return res
          .status(500)
          .json({ error: "サーバー設定エラーが発生しました。" });
      }

      token = jwt.sign(
        {
          sub: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
    } catch (error) {
      console.error("Error generating token:", error);
      return res
        .status(500)
        .json({ error: "トークンの生成中にエラーが発生しました。" });
    }

    // Return user data and token
    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      error:
        "ログイン処理中に予期しないエラーが発生しました。しばらくしてから再度お試しください。",
    });
  }
};

// Get current user controller function
const getMe = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "認証情報が無効です。" });
    }

    let user;
    try {
      user = await authModel.findUserById(req.user.id);
    } catch (error) {
      console.error("Error finding user:", error);
      return res.status(500).json({
        error:
          "データベース接続エラーが発生しました。しばらくしてから再度お試しください。",
      });
    }

    if (!user) {
      return res.status(404).json({ error: "ユーザーが見つかりません。" });
    }

    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({
      error:
        "ユーザー情報の取得中にエラーが発生しました。しばらくしてから再度お試しください。",
    });
  }
};

// // Update user profile
// const updateProfile = async (req, res) => {
// 	try {
// 		const { firstName, lastName, phone, location } = req.body;
// 		const userId = req.user.sub;

// 		const user = await User.findOneAndUpdate(
// 			{ id: userId },
// 			{
// 				profile: {
// 					firstName,
// 					lastName,
// 					phone,
// 					location
// 				}
// 			},
// 			{ new: true, runValidators: true }
// 		);

// 		if (!user) {
// 			return res.status(404).json({ error: 'User not found' });
// 		}

// 		return res.json({
// 			id: user.id,
// 			email: user.email,
// 			role: user.role,
// 			profile: user.profile,
// 			createdAt: user.createdAt,
// 			updatedAt: user.updatedAt
// 		});

// 	} catch (error) {
// 		console.error('Update profile error:', error);
// 		return res.status(500).json({ error: 'Failed to update profile' });
// 	}
// };

// // Change password
// const changePassword = async (req, res) => {
// 	try {
// 		const { currentPassword, newPassword } = req.body;
// 		const userId = req.user.sub;

// 		if (!currentPassword || !newPassword) {
// 			return res.status(400).json({ error: 'Current password and new password are required' });
// 		}

// 		if (newPassword.length < 8) {
// 			return res.status(400).json({ error: 'New password must be at least 8 characters long' });
// 		}

// 		const user = await User.findOne({ id: userId });
// 		if (!user) {
// 			return res.status(404).json({ error: 'User not found' });
// 		}

// 		// Verify current password
// 		const match = await bcrypt.compare(currentPassword, user.password);
// 		if (!match) {
// 			return res.status(401).json({ error: 'Current password is incorrect' });
// 		}

// 		// Hash new password
// 		const salt = await bcrypt.genSalt(10);
// 		const passwordHash = await bcrypt.hash(newPassword, salt);

// 		// Update password
// 		user.password = passwordHash;
// 		await user.save();

// 		return res.json({ message: 'Password updated successfully' });

// 	} catch (error) {
// 		console.error('Change password error:', error);
// 		return res.status(500).json({ error: 'Failed to change password' });
// 	}
// };

module.exports = {
  register,
  login,
  getMe,
  // updateProfile,
  // changePassword
};
