import { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { Mail, Lock } from "lucide-react";
import { useToast } from "../../../contexts/ToastContext";
import { useNavigate, useLocation, Link } from "react-router-dom";

export const Login = () => {
  const { login, isAuthenticated, isAdmin } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get the page the user was trying to access before login
  const from = (location.state as { from?: string })?.from || "/";

  // Redirect after successful authentication
  useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin) {
        navigate("/admin", { replace: true });
      } else {
        // Redirect to the page they were trying to access, or home
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, isAdmin, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      const errorMessage = result.error || "ログインに失敗しました";
      showError(errorMessage);
    } else {
      success("ログインに成功しました");
      // Navigation will happen automatically via useEffect when isAuthenticated changes
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Section - Welcome Area */}
      <div className="hidden md:flex md:w-1/2 relative bg-blue-600 overflow-hidden">
        {/* Abstract background elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full">
            <svg className="w-full h-full" viewBox="0 0 400 400">
              <defs>
                <pattern
                  id="grid"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="white"
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
        </div>

        {/* Wave shapes */}
        <div className="absolute inset-0 opacity-30">
          <svg
            className="absolute bottom-0 w-full"
            viewBox="0 0 1200 200"
            preserveAspectRatio="none"
          >
            <path
              d="M0,100 Q300,50 600,100 T1200,100 L1200,200 L0,200 Z"
              fill="white"
            />
          </svg>
          <svg
            className="absolute top-0 w-full rotate-180"
            viewBox="0 0 1200 200"
            preserveAspectRatio="none"
          >
            <path
              d="M0,100 Q300,50 600,100 T1200,100 L1200,200 L0,200 Z"
              fill="white"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center px-12 text-white w-full">
          {/* Company Name */}
          <div className="absolute top-8 left-12 flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-white"></div>
            </div>
            <span className="text-sm font-semibold uppercase tracking-wider">
              ファッションECサイト
            </span>
          </div>

          {/* Welcome Content - Centered */}
          <div className="space-y-6 md:space-y-10 text-center px-4">
            <p className="text-2xl md:text-3xl lg:text-4xl font-light">
              おかえりなさい
            </p>
            <h1 className="text-5xl md:text-6xl lg:text-8xl font-bold uppercase tracking-tight">
              ようこそ
            </h1>
            <div className="w-16 md:w-24 h-1 md:h-1.5 bg-white mx-auto"></div>
            <p className="text-base md:text-lg lg:text-xl font-light leading-relaxed max-w-2xl mx-auto">
              最新トレンドから定番まで、あなたにぴったりのファッションアイテムがきっと見つかります。さあ、新しいスタイルを見つけましょう。
            </p>
          </div>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-white px-4 sm:px-6 md:px-8 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="inline-block text-sm text-gray-500 hover:text-blue-600 mb-4 transition-colors duration-200"
          >
            ← ホームに戻る
          </Link>
          <h2 className="text-2xl sm:text-3xl font-bold text-blue-600 mb-2">
            ログイン
          </h2>
          <p className="text-gray-500 text-xs sm:text-sm mb-6 sm:mb-8">
            アカウントにログインして、お気に入りのファッションアイテムをチェックしましょう。
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
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
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full pl-12 pr-4 py-2 border border-gray-300 focus:outline-none focus:border-blue-500"
                  placeholder="メールアドレスを入力"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Input */}
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
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-12 pr-4 py-2 border border-gray-300 focus:outline-none focus:border-blue-500"
                  placeholder="パスワードを入力"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">
                  ログイン状態を保持
                </span>
              </label>
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                アカウントをお持ちでない方
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 text-white font-bold uppercase rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
