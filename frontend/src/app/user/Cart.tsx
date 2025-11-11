import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  Check,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { apiService } from "../../services/api";
import { UserLayout } from "../../components/layouts/UserLayout";

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  name: string;
  sku: string;
  price: number;
  main_image_url: string;
  status: string;
  stock_quantity: number;
}

export const Cart = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const {  success, error } = useToast();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadCart();
  }, [isAuthenticated, navigate]);

  const loadCart = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCart();
      if (response.error) {
        error(response.error);
        setCartItems([]);
      } else if (response.data) {
        setCartItems(response.data);
      }
    } catch  {
      error("カートの読み込みに失敗しました");
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      return;
    }

    setUpdating(productId);
    try {
      const response = await apiService.updateCartQuantity(
        productId,
        newQuantity
      );
      if (response.error) {
        error(response.error);
        await loadCart(); // Reload to revert changes
      } else {
        await loadCart(); // Reload to get updated data
        success("数量を更新しました");
      }
    } catch {
      error("数量の更新に失敗しました");
      await loadCart();
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (productId: string) => {
    setRemoving(productId);
    try {
      const response = await apiService.removeFromCart(productId);
      if (response.error) {
        error(response.error);
      } else {
        await loadCart();
        success("カートから削除しました");
      }
    } catch {
      error("削除に失敗しました");
    } finally {
      setRemoving(null);
    }
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      error("カートが空です");
      return;
    }

    setCheckingOut(true);
    try {
      const response = await apiService.createCheckoutSession();
      if (response.error) {
        // Check if it's a stock issue
        if (
          response.data?.stockIssues &&
          Array.isArray(response.data.stockIssues)
        ) {
          const stockMessages = response.data.stockIssues
            .map(
              (issue: {
                name: string;
                sku: string;
                requested: number;
                available: number;
              }) =>
                `${issue.name} (SKU: ${issue.sku}): 在庫 ${issue.available}個、ご希望数量 ${issue.requested}個`
            )
            .join("\n");
          error(`在庫が不足している商品があります:\n${stockMessages}`);
        } else {
          error(response.error);
        }
      } else if (response.data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = response.data.url;
      } else {
        error("チェックアウトセッションの作成に失敗しました");
      }
    } catch (err) {
      error("決済処理の開始に失敗しました");
    } finally {
      setCheckingOut(false);
    }
  };

  const getImageUrl = (imageUrl: string) => {
    if (!imageUrl) return "/img/model/model (1).png";
    if (imageUrl.startsWith("http")) return imageUrl;
    const baseUrl = (
      import.meta.env.VITE_API_URL || "http://localhost:8888/api"
    ).replace(/\/api$/, "");
    const cleanPath = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
    return `${baseUrl}${cleanPath}`;
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const tax = Math.floor(subtotal * 0.1); // 10% tax
  const shipping = subtotal > 5000 ? 0 : 500; // Free shipping over 5000 yen
  const total = subtotal + tax + shipping;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <UserLayout>
      <div className="bg-gray-50 min-h-screen">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  to="/"
                  className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">買い物を続ける</span>
                </Link>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <ShoppingCart className="w-6 h-6 mr-2 text-indigo-600" />
                ショッピングカート
              </h1>
              <div className="w-24"></div> {/* Spacer for centering */}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {cartItems.length === 0 ? (
            /* Empty Cart */
            <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 md:p-12 text-center">
              <ShoppingCart className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-gray-300 mx-auto mb-4 sm:mb-6" />
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                カートは空です
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
                商品をカートに追加してください
              </p>
              <Link
                to="/"
                className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-base font-medium rounded-lg transition-colors shadow-md"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                商品を見る
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-3 sm:space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        <img
                          src={getImageUrl(item.main_image_url)}
                          alt={item.name}
                          className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg border border-gray-200"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/img/model/model (1).png";
                          }}
                        />
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-2">
                          SKU: {item.sku}
                        </p>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-2xl font-bold text-red-600">
                              ¥{item.price.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">(税込)</p>
                          </div>
                          {item.stock_quantity > 0 && (
                            <p className="text-sm text-gray-600">
                              在庫: {item.stock_quantity}個
                            </p>
                          )}
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.product_id,
                                  item.quantity - 1
                                )
                              }
                              disabled={
                                updating === item.product_id ||
                                item.quantity <= 1
                              }
                              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-12 text-center font-medium">
                              {updating === item.product_id ? (
                                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                              ) : (
                                item.quantity
                              )}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.product_id,
                                  item.quantity + 1
                                )
                              }
                              disabled={
                                updating === item.product_id ||
                                (item.stock_quantity > 0 &&
                                  item.quantity >= item.stock_quantity)
                              }
                              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => removeItem(item.product_id)}
                            disabled={removing === item.product_id}
                            className="flex items-center space-x-1 text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {removing === item.product_id ? (
                              <>
                                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-sm">削除中...</span>
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4" />
                                <span className="text-sm">削除</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 sticky top-4 sm:top-8">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                    注文内容
                  </h2>

                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-gray-600">
                      <span>小計</span>
                      <span>¥{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>消費税 (10%)</span>
                      <span>¥{tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>送料</span>
                      <span
                        className={
                          shipping === 0 ? "text-green-600 font-semibold" : ""
                        }
                      >
                        {shipping === 0
                          ? "無料"
                          : `¥${shipping.toLocaleString()}`}
                      </span>
                    </div>
                    {subtotal < 5000 && (
                      <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                        ¥{(5000 - subtotal).toLocaleString()}以上で送料無料
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-4 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">
                        合計
                      </span>
                      <span className="text-2xl font-bold text-red-600">
                        ¥{total.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">(税込)</p>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={checkingOut || cartItems.length === 0}
                    className="w-full bg-[#e2603f] hover:bg-[#c95a42] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                  >
                    {checkingOut ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>処理中...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        <span>レジに進む</span>
                      </>
                    )}
                  </button>

                  <Link
                    to="/"
                    className="block mt-4 text-center text-indigo-600 hover:text-indigo-700 font-medium text-sm transition-colors"
                  >
                    買い物を続ける
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};
