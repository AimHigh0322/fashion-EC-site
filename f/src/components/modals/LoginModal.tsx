import { useState } from "react";
import { X, Mail, Lock, User } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  showRegister?: boolean;
}

export const LoginModal = ({
  isOpen,
  onClose,
  onSuccess,
  showRegister: initialShowRegister = false,
}: LoginModalProps) => {
  const { login, register, isAuthenticated } = useAuth();
  const { success, error: showError } = useToast();
  const [showRegister, setShowRegister] = useState(initialShowRegister);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Close modal when authenticated
  if (isAuthenticated && isOpen) {
    setTimeout(() => {
      onClose();
      if (onSuccess) onSuccess();
    }, 100);
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      const errorMessage = result.error || "ログインに失敗しました";
      showError(errorMessage);
    } else {
      success("ログインに成功しました");
      onClose();
      if (onSuccess) onSuccess();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (username.length < 3) {
      showError("ユーザー名は3文字以上である必要があります");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      showError("有効なメールアドレスを入力してください");
      return;
    }

    if (password !== confirmPassword) {
      showError("パスワードが一致しません");
      return;
    }

    if (password.length < 8) {
      showError("パスワードは8文字以上である必要があります");
      return;
    }

    setLoading(true);
    const result = await register(username, email, password);
    setLoading(false);

    if (!result.success) {
      const errorMessage = result.error || "登録に失敗しました";
      showError(errorMessage);
    } else {
      success("アカウントが正常に作成されました");
      onClose();
      if (onSuccess) onSuccess();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900">
            {showRegister ? "新規登録" : "ログイン"}
          </h2>
          {!loading && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              aria-label="閉じる"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {showRegister ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  ユーザー名
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="username"
                    type="text"
                    required
                    className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent"
                    placeholder="ユーザー名を入力（3文字以上）"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email-register"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  メールアドレス
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="email-register"
                    type="email"
                    required
                    className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent"
                    placeholder="メールアドレスを入力"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password-register"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  パスワード
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="password-register"
                    type="password"
                    required
                    className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent"
                    placeholder="パスワードを入力（8文字以上）"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  パスワード確認
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent"
                    placeholder="パスワードを再入力"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegister(false)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  すでにアカウントをお持ちの方
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#e2603f] text-white font-bold rounded hover:bg-[#c95a42] focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {loading ? "登録中..." : "登録"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  メールアドレス
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="email"
                    type="email"
                    required
                    className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent"
                    placeholder="メールアドレスを入力"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  パスワード
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="password"
                    type="password"
                    required
                    className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent"
                    placeholder="パスワードを入力"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegister(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  アカウントをお持ちでない方
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#e2603f] text-white font-bold rounded hover:bg-[#c95a42] focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {loading ? "ログイン中..." : "ログイン"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

