const jwt = require('jsonwebtoken');

function authenticateRequest(request, response, next) {
	try {
		const header = request.headers['authorization'];
		if (!header) {
			return response.status(401).json({ error: '認証ヘッダーがありません。' });
		}
		const parts = header.split(' ');
		if (parts.length !== 2 || parts[0] !== 'Bearer') {
			return response.status(401).json({ error: '認証ヘッダーの形式が正しくありません。' });
		}
		const token = parts[1];
		
		if (!process.env.JWT_SECRET) {
			console.error("JWT_SECRET is not set");
			return response.status(500).json({ error: 'サーバー設定エラーが発生しました。' });
		}

		try {
			const payload = jwt.verify(token, process.env.JWT_SECRET);
			request.user = { id: payload.sub, username: payload.username, email: payload.email, role: payload.role };
			return next();
		} catch (error) {
			if (error.name === 'TokenExpiredError') {
				return response.status(401).json({ error: 'トークンの有効期限が切れています。再度ログインしてください。' });
			} else if (error.name === 'JsonWebTokenError') {
				return response.status(401).json({ error: '無効なトークンです。' });
			} else {
				return response.status(401).json({ error: 'トークンの検証中にエラーが発生しました。' });
			}
		}
	} catch (error) {
		console.error("Authentication middleware error:", error);
		return response.status(500).json({ error: '認証処理中にエラーが発生しました。' });
	}
}

// Alias for consistency with new routes
const authenticateToken = authenticateRequest;

// Middleware to require admin role
function requireAdmin(request, response, next) {
	if (!request.user) {
		return response.status(401).json({ error: '認証が必要です。' });
	}
	
	if (request.user.role !== 'admin') {
		return response.status(403).json({ error: 'この操作には管理者権限が必要です。' });
	}
	
	return next();
}

module.exports = { 
	authenticateRequest, 
	authenticateToken,
	requireAdmin 
};


