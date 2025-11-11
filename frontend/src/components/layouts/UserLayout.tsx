import { useState, useRef, useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Heart,
  ShoppingCart,
  Menu,
  User,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useFavorites } from "../../contexts/FavoritesContext";
import { apiService } from "../../services/api";

interface UserLayoutProps {
  children: ReactNode;
}

export const UserLayout = ({ children }: UserLayoutProps) => {
  const { isAuthenticated, logout } = useAuth();
  const { favorites } = useFavorites();
  const [cartCount, setCartCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load cart count
  useEffect(() => {
    const loadCartCount = async () => {
      if (isAuthenticated) {
        try {
          const response = await apiService.getCartCount();
          if (response.data) {
            setCartCount(response.data.itemCount);
          }
        } catch {
          // Silently fail if not authenticated or cart is empty
        }
      }
    };
    loadCartCount();
  }, [isAuthenticated]);

  // Update favorites count when favorites change
  useEffect(() => {
    if (isAuthenticated) {
      setFavoritesCount(favorites.size);
    } else {
      setFavoritesCount(0);
    }
  }, [favorites, isAuthenticated]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Categories data (same as HomePage)
  const categories = [
    {
      name: "上着",
      image: "/img/product/top/top (2).png",
    },
    {
      name: "パンツ",
      image: "/img/product/pants/pants (1).png",
    },
    {
      name: "スカート",
      image: "/img/product/skirt/skirt (1).png",
    },
    {
      name: "ワンピース",
      image: "/img/product/dress/dress (1).png",
    },
    {
      name: "アクセサリー",
      image: "/img/product/accessories/accessories (1).png",
    },
    {
      name: "バッグ",
      image: "/img/product/bag/bag (1).png",
    },
    {
      name: "靴",
      image: "/img/product/shoes/shoes (1).png",
    },
    {
      name: "その他",
      image: "/img/product/other/other (1).png",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Top Header - Warm Orange/Terracotta Theme */}
      <header className="bg-[#e2603f] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3 lg:gap-6">
            {/* Logo Section */}
            <div className="flex items-center w-full lg:w-auto justify-between lg:justify-start">
              <Link to="/" className="flex items-center">
                <img
                  src="/img/logo/logo.png"
                  alt="Fashion EC Store"
                  className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto object-contain"
                />
              </Link>
            </div>

            {/* Search Bar - Now visible on mobile too */}
            <div className="w-full lg:flex flex-1 max-w-2xl mx-0 lg:mx-8 order-3 lg:order-2">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="キーワードで検索する"
                  className="w-full px-4 sm:px-5 py-2 sm:py-2.5 bg-white text-gray-900 placeholder-gray-500 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 rounded text-sm"
                />
                <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6 w-full lg:w-auto justify-between lg:justify-end order-2 lg:order-3">
              {!isAuthenticated ? (
                <>
                  <Link
                    to="/register"
                    className="text-xs sm:text-sm font-medium text-white hover:text-[#faf5f3] transition-colors uppercase tracking-wide"
                  >
                    新規登録
                  </Link>
                  <Link
                    to="/login"
                    className="text-xs sm:text-sm font-medium text-white hover:text-[#faf5f3] transition-colors uppercase tracking-wide"
                  >
                    ログイン
                  </Link>
                </>
              ) : (
                <>
                  {/* Mobile: Show icons, avatar, and logout */}
                  <div className="flex md:hidden items-center space-x-2">
                    <button className="relative p-2 hover:bg-white/10 rounded transition-colors">
                      <Heart className="w-5 h-5 text-white" />
                      {favoritesCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                          {favoritesCount > 9 ? "9+" : favoritesCount}
                        </span>
                      )}
                    </button>
                    <Link
                      to="/cart"
                      className="relative p-2 hover:bg-white/10 rounded transition-colors"
                    >
                      <ShoppingCart className="w-5 h-5 text-white" />
                      {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                          {cartCount > 9 ? "9+" : cartCount}
                        </span>
                      )}
                    </Link>
                    {/* Avatar on mobile */}
                    <div className="flex items-center px-2 py-1.5">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    {/* Logout button on mobile */}
                    <button
                      onClick={logout}
                      className="p-2 hover:bg-white/10 rounded transition-colors"
                      title="ログアウト"
                    >
                      <LogOut className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  {/* Desktop: Show full menu */}
                  <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
                    <button className="relative flex items-center text-white hover:text-[#faf5f3] transition-colors p-2">
                      <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                      {favoritesCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-600 text-white text-[10px] sm:text-xs font-bold flex items-center justify-center rounded-full">
                          {favoritesCount}
                        </span>
                      )}
                    </button>
                    <Link
                      to="/cart"
                      className="relative flex items-center text-white hover:text-[#faf5f3] transition-colors p-2"
                    >
                      <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                      {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-600 text-white text-[10px] sm:text-xs font-bold flex items-center justify-center rounded-full">
                          {cartCount}
                        </span>
                      )}
                    </Link>
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <button
                      onClick={logout}
                      className="hidden lg:flex items-center space-x-2 text-sm font-medium text-white hover:text-[#faf5f3] transition-colors uppercase tracking-wide"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>ログアウト</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Secondary Navigation - Warm Orange/Terracotta Theme */}
      <div className="bg-[#c95a42] text-white border-b border-[#b84a32]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() =>
                  setIsCategoryDropdownOpen(!isCategoryDropdownOpen)
                }
                className="flex items-center space-x-2 hover:text-[#faf5f3] transition-colors font-medium uppercase tracking-wide text-sm"
              >
                <Menu className="w-5 h-5" />
                <span>カテゴリから選ぶ</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isCategoryDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Category Dropdown */}
              {isCategoryDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      {categories.map((category, index) => (
                        <Link
                          key={index}
                          to="/"
                          className="flex flex-col items-center p-3 hover:bg-gray-50 rounded-lg transition-colors"
                          onClick={() => setIsCategoryDropdownOpen(false)}
                        >
                          <div className="w-16 h-16 mb-2 rounded-full overflow-hidden border-2 border-gray-200">
                            <img
                              src={category.image}
                              alt={category.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {category.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
};
