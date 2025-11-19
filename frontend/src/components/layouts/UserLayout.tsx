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
  Bell,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useFavorites } from "../../contexts/FavoritesContext";
import { useCart } from "../../contexts/CartContext";
import { useCategory } from "../../contexts/CategoryContext";
import { apiService } from "../../services/api";

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string;
  level: number;
  children?: Category[];
  [key: string]: unknown;
}

interface UserLayoutProps {
  children: ReactNode;
}

export const UserLayout = ({ children }: UserLayoutProps) => {
  const { isAuthenticated, logout } = useAuth();
  const { favorites } = useFavorites();
  const { cartCount } = useCart();
  const { setSelectedCategoryId, setSelectedCategoryName } = useCategory();
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update favorites count when favorites change
  useEffect(() => {
    if (isAuthenticated) {
      setFavoritesCount(favorites.size);
    } else {
      setFavoritesCount(0);
    }
  }, [favorites, isAuthenticated]);

  // Load categories from API
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await apiService.getCategoryTree();
        if (response.data) {
          setCategories(response.data);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };
    loadCategories();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
        // Reset selected gender when closing dropdown
        setSelectedGender(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Auto-select first gender when dropdown opens
  useEffect(() => {
    if (isCategoryDropdownOpen && !selectedGender && categories.length > 0) {
      const firstGender = categories.find((cat) => cat.level === 1);
      if (firstGender) {
        setSelectedGender(firstGender.slug);
      }
    }
  }, [isCategoryDropdownOpen, selectedGender, categories]);

  // Get selected gender's categories
  const getSelectedGenderCategories = () => {
    if (!selectedGender) return [];
    const genderCategory = categories.find(
      (cat) => cat.slug === selectedGender || cat.name === selectedGender
    );
    return genderCategory?.children || [];
  };

  // Get subcategories for a hovered category
  const getSubcategories = (categoryId: string): Category[] => {
    // Search through all categories and their children
    for (const genderCat of categories) {
      if (genderCat.children) {
        for (const mainCat of genderCat.children) {
          if (mainCat.id === categoryId) {
            return mainCat.children || [];
          }
        }
      }
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Header - Warm Orange/Terracotta Theme */}
      <header className="bg-[#e2603f] text-white shadow-md">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3 md:py-4">
          {/* Mobile Layout */}
          <div className="flex lg:hidden flex-col gap-2">
            {/* Top Row: Logo and Actions */}
            <div className="flex items-center justify-between w-full">
              <Link
                to="/"
                className="flex items-center cursor-pointer transition-all duration-300 hover:scale-110 hover:opacity-90"
              >
                <img
                  src="/img/logo/logo.png"
                  alt="Fashion EC Store"
                  className="h-12 sm:h-14 w-auto object-contain"
                />
              </Link>
              {!isAuthenticated ? (
                <div className="flex items-center space-x-2">
                  <Link
                    to="/register"
                    className="text-xs font-medium text-white hover:text-[#faf5f3] transition-all duration-300 uppercase tracking-wide cursor-pointer px-2 py-1.5  hover:bg-white/20"
                  >
                    新規登録
                  </Link>
                  <Link
                    to="/login"
                    className="text-xs font-medium text-white hover:text-[#faf5f3] transition-all duration-300 uppercase tracking-wide cursor-pointer px-2 py-1.5  hover:bg-white/20"
                  >
                    ログイン
                  </Link>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    className="p-1.5  transition-all duration-300 hover:opacity-90 cursor-pointer"
                    title="通知"
                  >
                    <Bell className="w-5 h-5 text-white" />
                  </button>
                  <Link
                    to="/profile"
                    className="p-1.5  transition-all duration-300 hover:opacity-90 cursor-pointer"
                    title="マイページ"
                  >
                    <User className="w-5 h-5 text-white" />
                  </Link>
                  <button
                    onClick={logout}
                    className="p-1.5  transition-all duration-300 hover:opacity-90 cursor-pointer"
                    title="ログアウト"
                  >
                    <LogOut className="w-5 h-5 text-white" />
                  </button>
                </div>
              )}
            </div>
            {/* Bottom Row: Search Bar */}
            <div className="w-full">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="キーワードで検索する"
                  className="w-full px-3 py-2 bg-white text-gray-900 placeholder-gray-500 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 rounded text-sm"
                />
                <button className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer p-1">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:flex items-center justify-between gap-6">
            {/* Logo Section */}
            <Link
              to="/"
              className="flex items-center cursor-pointer transition-all duration-300 hover:scale-110 hover:opacity-90 flex-shrink-0"
            >
              <img
                src="/img/logo/logo.png"
                alt="Fashion EC Store"
                className="h-16 w-auto object-contain"
              />
            </Link>

            {/* Search Bar */}
            <div className="flex-1 max-w-6xl mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="キーワードで検索する"
                  className="w-full px-5 py-2.5 bg-white text-gray-900 placeholder-gray-500 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 rounded text-sm transition-all duration-300 hover:border-gray-400 hover:shadow-sm"
                />
                <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 hover:scale-125 transition-all duration-300 cursor-pointer p-1 rounded hover:bg-gray-100">
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              {!isAuthenticated ? (
                <>
                  <Link
                    to="/register"
                    className="text-sm font-medium text-white hover:text-[#faf5f3] transition-all duration-300 uppercase tracking-wide cursor-pointer px-3 py-1.5  hover:bg-white/20 hover:scale-105"
                  >
                    新規登録
                  </Link>
                  <Link
                    to="/login"
                    className="text-sm font-medium text-white hover:text-[#faf5f3] transition-all duration-300 uppercase tracking-wide cursor-pointer px-3 py-1.5  hover:bg-white/20 hover:scale-105"
                  >
                    ログイン
                  </Link>
                </>
              ) : (
                <>
                  <button
                    className="flex items-center text-white transition-all duration-300 p-2  hover:scale-110 hover:opacity-90 cursor-pointer group"
                    title="通知"
                  >
                    <Bell className="w-5 h-5 transition-all duration-300" />
                  </button>
                  <Link
                    to="/profile"
                    className="flex items-center text-white transition-all duration-300 p-2  hover:scale-110 hover:opacity-90 cursor-pointer group"
                    title="マイページ"
                  >
                    <User className="w-5 h-5 transition-all duration-300" />
                  </Link>
                  <button
                    onClick={logout}
                    className="flex items-center space-x-2 text-sm font-medium text-white transition-all duration-300 uppercase tracking-wide cursor-pointer p-2  hover:scale-110 hover:opacity-90 group"
                  >
                    <LogOut className="w-4 h-4 transition-all duration-300" />
                    <span>ログアウト</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Secondary Navigation - Warm Orange/Terracotta Theme */}
      <div className="bg-[#c95a42] text-white border-b border-[#b84a32]">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1 min-w-0" ref={dropdownRef}>
              <button
                onClick={() => {
                  const willBeOpen = !isCategoryDropdownOpen;
                  setIsCategoryDropdownOpen(willBeOpen);
                  // Reset selected gender when closing dropdown
                  if (!willBeOpen) {
                    setSelectedGender(null);
                  }
                }}
                className="flex items-center space-x-1 sm:space-x-2 hover:text-[#faf5f3] transition-all duration-300 font-medium uppercase tracking-wide text-xs sm:text-sm cursor-pointer px-2 sm:px-3 py-1.5 sm:py-2  hover:bg-white/10 w-full sm:w-auto"
              >
                <Menu className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="truncate">カテゴリから選ぶ</span>
                <ChevronDown
                  className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200 flex-shrink-0 ${
                    isCategoryDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Category Dropdown */}
              {isCategoryDropdownOpen && (
                <div className="absolute top-full left-0 sm:left-0 md:-left-[16px] mt-2 bg-white shadow-xl z-50 border border-gray-200 w-screen sm:w-[calc(100vw-2rem)] md:w-[calc(100vw-4rem)] lg:w-[1016px] xl:w-[1248px] max-w-[calc(100vw-2rem)] md:max-w-[calc(100vw-4rem)] lg:max-w-[1016px] xl:max-w-[1248px] 2xl:max-w-[1408px]">
                  {/* Top Bar - Gender Selection (Horizontal) */}
                  <div className="border-b border-gray-200 bg-gray-50">
                    <div className="flex ">
                      {categories
                        .filter((cat) => cat.level === 1)
                        .map((gender) => (
                          <button
                            key={gender.id}
                            onClick={() => {
                              setSelectedGender(
                                selectedGender === gender.slug
                                  ? null
                                  : gender.slug
                              );
                            }}
                            className={`px-6 sm:px-8 md:px-10 py-3 sm:py-3.5 text-sm sm:text-base font-medium transition-all whitespace-nowrap flex-shrink-0 relative ${
                              selectedGender === gender.slug
                                ? "bg-[#c95a42] text-white border-b-2 border-[#c95a42] -mb-[1px]"
                                : "text-gray-700 hover:bg-gray-100 bg-white"
                            }`}
                          >
                            {gender.name === "メンズ" ? "メンズ" : "レディース"}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Main Categories - Multi-Column Layout */}
                  {selectedGender && (
                    <div className="p-3 sm:p-4 md:p-6 overflow-y-auto max-h-[calc(100vh-200px)] sm:max-h-[calc(100vh-180px)] md:max-h-[600px]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 md:gap-6">
                        {getSelectedGenderCategories().map((category) => {
                          const subcategories = getSubcategories(category.id);
                          return (
                            <div key={category.id} className="flex flex-col">
                              {/* Category Header */}
                              <button
                                onClick={() => {
                                  setSelectedCategoryId(category.id);
                                  setSelectedCategoryName(category.name);
                                  setIsCategoryDropdownOpen(false);
                                  setSelectedGender(null);
                                  // Scroll to recommended products section
                                  setTimeout(() => {
                                    const element = document.getElementById(
                                      "recommended-products"
                                    );
                                    if (element) {
                                      element.scrollIntoView({
                                        behavior: "smooth",
                                        block: "start",
                                      });
                                    }
                                  }, 100);
                                }}
                                className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3 hover:text-[#c95a42] transition-colors text-left"
                              >
                                {category.name}
                              </button>

                              {/* Subcategories List */}
                              {subcategories.length > 0 && (
                                <div className="flex flex-col space-y-0.5 sm:space-y-1">
                                  {subcategories.map((subcat) => (
                                    <button
                                      key={subcat.id}
                                      onClick={() => {
                                        setSelectedCategoryId(subcat.id);
                                        setSelectedCategoryName(subcat.name);
                                        setIsCategoryDropdownOpen(false);
                                        setSelectedGender(null);
                                        // Scroll to recommended products section
                                        setTimeout(() => {
                                          const element =
                                            document.getElementById(
                                              "recommended-products"
                                            );
                                          if (element) {
                                            element.scrollIntoView({
                                              behavior: "smooth",
                                              block: "start",
                                            });
                                          }
                                        }, 100);
                                      }}
                                      className="text-xs sm:text-sm text-gray-600 hover:text-[#c95a42] hover:underline transition-colors py-0.5 sm:py-1 text-left"
                                    >
                                      {subcat.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {!selectedGender && (
                    <div className="p-6 sm:p-8 text-center text-gray-500">
                      <p className="text-xs sm:text-sm">
                        性別を選択してください
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Heart and Cart Icons - Right Side */}
            {isAuthenticated && (
              <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3 flex-shrink-0">
                <Link
                  to="/favorites"
                  className="relative flex items-center text-white transition-all duration-300 p-1.5 sm:p-2  hover:bg-white/10 hover:opacity-90 cursor-pointer"
                >
                  <Heart className="w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300" />
                  {favoritesCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-red-600 text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center rounded-full transition-all duration-300">
                      {favoritesCount > 9 ? "9+" : favoritesCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/cart"
                  className="relative flex items-center text-white transition-all duration-300 p-1.5 sm:p-2  hover:bg-white/10 hover:opacity-90 cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300" />
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-red-600 text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center rounded-full transition-all duration-300">
                      {cartCount > 9 ? "9+" : cartCount}
                    </span>
                  )}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer - Full Width - Warm Orange/Terracotta Theme */}
      <footer className="w-full bg-[#e2603f] text-white mt-16 sm:mt-20">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-10 sm:py-12 lg:py-16">
          {/* Top Section with Logo and Description */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 sm:gap-10 mb-10 sm:mb-12">
            {/* Brand Section */}
            <div className="lg:col-span-1">
              <div className="mb-4">
                <img
                  src="/img/logo/logo.png"
                  alt="Fashion EC Store"
                  className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto object-contain"
                />
              </div>
              <p className="text-[#f5e8e4] text-sm sm:text-base leading-relaxed mb-4 max-w-md">
                最新のファッショントレンドをお届け。あなたのスタイルを彩る、質の高いアイテムを豊富に取り揃えています。
              </p>
              <div className="flex flex-col space-y-2 text-[#f5e8e4]">
                <span className="text-xs sm:text-sm">info@fashionstore.jp</span>
                <span className="text-xs sm:text-sm">0120-XXX-XXX</span>
              </div>
            </div>

            {/* Links Grid */}
            <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-10">
              <div>
                <h3 className="font-bold mb-4 sm:mb-5 text-sm sm:text-base text-white uppercase tracking-wide">
                  お客様サポート
                </h3>
                <ul className="space-y-2.5 sm:space-y-3 text-sm">
                  <li>
                    <a
                      href="#"
                      className="text-[#f5e8e4] hover:text-white transition-colors cursor-pointer"
                    >
                      よくある質問
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-[#f5e8e4] hover:text-white transition-colors cursor-pointer"
                    >
                      配送・送料について
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-[#f5e8e4] hover:text-white transition-colors cursor-pointer"
                    >
                      お支払い方法
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-[#f5e8e4] hover:text-white transition-colors cursor-pointer"
                    >
                      返品・交換
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-[#f5e8e4] hover:text-white transition-colors cursor-pointer"
                    >
                      サイズガイド
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold mb-4 sm:mb-5 text-sm sm:text-base text-white uppercase tracking-wide">
                  会員サービス
                </h3>
                <ul className="space-y-2.5 sm:space-y-3 text-sm">
                  <li>
                    <a
                      href="#"
                      className="text-[#f5e8e4] hover:text-white transition-colors cursor-pointer"
                    >
                      ポイントサービス
                    </a>
                  </li>
                  <li>
                    <Link
                      to="/favorites"
                      className="text-[#f5e8e4] hover:text-white transition-colors cursor-pointer"
                    >
                      お気に入り
                    </Link>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-[#f5e8e4] hover:text-white transition-colors cursor-pointer"
                    >
                      購入履歴
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-[#f5e8e4] hover:text-white transition-colors cursor-pointer"
                    >
                      会員登録
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold mb-4 sm:mb-5 text-sm sm:text-base text-white uppercase tracking-wide">
                  企業情報
                </h3>
                <ul className="space-y-2.5 sm:space-y-3 text-sm">
                  <li>
                    <a
                      href="#"
                      className="text-[#f5e8e4] hover:text-white transition-colors cursor-pointer"
                    >
                      会社概要
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-[#f5e8e4] hover:text-white transition-colors cursor-pointer"
                    >
                      採用情報
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-[#f5e8e4] hover:text-white transition-colors cursor-pointer"
                    >
                      お問い合わせ
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-[#f5e8e4] hover:text-white transition-colors cursor-pointer"
                    >
                      プレスリリース
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="text-[#f5e8e4] hover:text-white transition-colors cursor-pointer"
                    >
                      店舗情報
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-[#e2603f] pt-6 sm:pt-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
              <div className="text-xs sm:text-sm text-[#f5e8e4]">
                © 2024 Fashion EC Store. All rights reserved.
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm">
                <a
                  href="#"
                  className="text-[#f5e8e4] hover:text-white transition-colors cursor-pointer"
                >
                  会員規約
                </a>
                <span className="text-[#e8c4b8]">|</span>
                <a
                  href="#"
                  className="text-[#f5e8e4] hover:text-white transition-colors cursor-pointer"
                >
                  プライバシーポリシー
                </a>
                <span className="text-[#e8c4b8]">|</span>
                <a
                  href="#"
                  className="text-[#f5e8e4] hover:text-white transition-colors cursor-pointer"
                >
                  特定商取引法
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
