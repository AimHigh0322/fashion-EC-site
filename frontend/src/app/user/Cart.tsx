import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";
import { useToast } from "../../contexts/ToastContext";
import { apiService } from "../../services/api";
import { UserLayout } from "../../components/layouts/UserLayout";
import { Breadcrumbs } from "../../components/molecules/Breadcrumbs";

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
  const { refreshCart } = useCart();
  const { success, error } = useToast();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getCart();
      if (response.error) {
        error(response.error);
        setCartItems([]);
      } else if (response.data) {
        setCartItems(response.data);
      }
    } catch {
      error("カートの読み込みに失敗しました");
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadCart();
  }, [isAuthenticated, navigate, loadCart]);

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
        await refreshCart(); // Refresh cart count in context
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
        await refreshCart(); // Refresh cart count in context
        success("カートから削除しました");
      }
    } catch {
      error("削除に失敗しました");
    } finally {
      setRemoving(null);
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
            <Breadcrumbs
              items={[
                { label: "商品一覧", path: "/" },
                { label: "ショッピングカート" },
              ]}
            />
            <h1 className="text-2xl font-bold text-gray-900 flex items-center mt-4">
              <ShoppingCart className="w-6 h-6 mr-2 text-[#e2603f]" />
              ショッピングカート
            </h1>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {cartItems.length === 0 ? (
            /* Empty Cart */
            <div className="bg-white  shadow-sm p-6 sm:p-8 md:p-12 text-center">
              <ShoppingCart className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-gray-300 mx-auto mb-4 sm:mb-6" />
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                カートは空です
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
                商品をカートに追加してください
              </p>
              <Link
                to="/"
                className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-[#e2603f] hover:bg-[#c95a42] text-white text-sm sm:text-base font-medium  transition-colors shadow-md"
              >
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
                    className="bg-white  shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        <img
                          src={getImageUrl(item.main_image_url)}
                          alt={item.name}
                          className="w-24 h-24 sm:w-32 sm:h-32 object-cover  border border-gray-200"
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
                              className="w-8 h-8 flex items-center justify-center border border-gray-300  hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
                              className="w-8 h-8 flex items-center justify-center border border-gray-300  hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => removeItem(item.product_id)}
                            disabled={removing === item.product_id}
                            className="flex items-center space-x-1 text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
                <div className="bg-white  shadow-sm border border-gray-200 p-4 sm:p-6 sticky top-4 sm:top-8">
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
                    onClick={() => navigate("/checkout")}
                    className="w-full bg-[#e2603f] hover:bg-[#c95a42] text-white font-bold py-3 px-4  transition-colors shadow-md"
                  >
                    レジに進む
                  </button>

                  <Link
                    to="/"
                    className="block mt-4 text-center text-[#e2603f] hover:text-[#c95a42] font-medium text-sm transition-colors cursor-pointer"
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
