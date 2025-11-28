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
  originalPrice?: number;
  discountedPrice?: number;
  discount?: number;
  itemTotal?: number;
  itemDiscount?: number;
  campaign?: {
    id: string;
    name: string;
    label?: string;
    description?: string;
    discountType: string;
    discountValue: number;
  };
  main_image_url: string;
  status: string;
  stock_quantity: number;
}

interface CartDiscounts {
  subtotal: number;
  totalDiscount: number;
  freeShipping: boolean;
  appliedCampaigns: Array<{
    id: string;
    name: string;
    label?: string;
    type?: string;
    discount?: number;
  }>;
  finalTotal: number;
}

export const Cart = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { refreshCart } = useCart();
  const { success, error } = useToast();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartDiscounts, setCartDiscounts] = useState<CartDiscounts | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const loadCart = useCallback(
    async (applyCampaigns = true) => {
      try {
        setLoading(true);
        const response = await apiService.getCart();
        if (response.error) {
          error(response.error);
          setCartItems([]);
          setCartDiscounts(null);
        } else if (response.data) {
          setCartItems(response.data);

          // Apply campaigns if requested
          if (applyCampaigns && response.data.length > 0) {
            try {
              const campaignResponse = await apiService.applyCampaignsToCart();
              if (campaignResponse.data) {
                // Map campaign response items to CartItem format
                const campaignItems: CartItem[] =
                  campaignResponse.data.items.map(
                    (item: {
                      id: string;
                      product_id: string;
                      quantity: number;
                      name?: string;
                      sku?: string;
                      price?: number;
                      originalPrice?: number;
                      discountedPrice?: number;
                      discount?: number;
                      itemTotal?: number;
                      itemDiscount?: number;
                      campaign?: {
                        id: string;
                        name: string;
                        label?: string;
                        description?: string;
                        discountType: string;
                        discountValue: number;
                      };
                      main_image_url?: string;
                      status?: string;
                      stock_quantity?: number;
                    }) => ({
                      id: item.id,
                      product_id: item.product_id,
                      quantity: item.quantity,
                      name: item.name || "",
                      sku: item.sku || "",
                      price: item.originalPrice || item.price || 0,
                      originalPrice: item.originalPrice,
                      discountedPrice: item.discountedPrice,
                      discount: item.discount,
                      itemTotal: item.itemTotal,
                      itemDiscount: item.itemDiscount,
                      campaign: item.campaign,
                      main_image_url: item.main_image_url || "",
                      status: item.status || "active",
                      stock_quantity: item.stock_quantity || 0,
                    })
                  );
                setCartItems(campaignItems);
                setCartDiscounts({
                  subtotal: campaignResponse.data.subtotal,
                  totalDiscount: campaignResponse.data.totalDiscount,
                  freeShipping: campaignResponse.data.freeShipping,
                  appliedCampaigns: campaignResponse.data.appliedCampaigns,
                  finalTotal: campaignResponse.data.finalTotal,
                });
              }
            } catch (campaignError) {
              console.error("Failed to apply campaigns:", campaignError);
              // Continue without campaign discounts
            }
          }
        }
      } catch {
        error("カートの読み込みに失敗しました");
        setCartItems([]);
        setCartDiscounts(null);
      } finally {
        setLoading(false);
      }
    },
    [error]
  );

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

  // Calculate totals with campaign discounts
  const subtotal = cartDiscounts
    ? cartDiscounts.subtotal
    : cartItems.reduce(
        (sum, item) =>
          sum + (item.discountedPrice || item.price) * item.quantity,
        0
      );
  const totalDiscount = cartDiscounts?.totalDiscount || 0;
  const freeShipping = cartDiscounts?.freeShipping || false;
  const discountedSubtotal = subtotal - totalDiscount;
  const tax = Math.floor(discountedSubtotal * 0.1); // 10% tax on discounted amount
  const shipping = freeShipping || discountedSubtotal > 5000 ? 0 : 500; // Free shipping over 5000 yen or campaign
  const total = discountedSubtotal + tax + shipping;

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center">
          <Breadcrumbs
            items={[
              { label: "商品一覧", path: "/" },
              { label: "ショッピングカート" },
            ]}
          />
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
                            <div className="flex items-baseline gap-2">
                              <p className="text-2xl font-bold text-red-600">
                                ¥
                                {(
                                  item.discountedPrice || item.price
                                ).toLocaleString()}
                              </p>
                              {item.discountedPrice &&
                                item.discountedPrice < item.price && (
                                  <p className="text-sm text-gray-400 line-through">
                                    ¥{item.price.toLocaleString()}
                                  </p>
                                )}
                            </div>
                            <p className="text-xs text-gray-500">(税込)</p>
                            {item.campaign && (
                              <div className="mt-1">
                                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                                  {item.campaign.label || item.campaign.name}
                                </span>
                                {item.discount && item.discount > 0 && (
                                  <span className="ml-1 text-xs text-green-600">
                                    (¥{item.discount.toLocaleString()}割引)
                                  </span>
                                )}
                              </div>
                            )}
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
                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>キャンペーン割引</span>
                        <span className="font-bold">
                          -¥{totalDiscount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {cartDiscounts &&
                      cartDiscounts.appliedCampaigns.length > 0 && (
                        <div className="text-xs text-gray-500 bg-green-50 p-2 rounded">
                          {cartDiscounts.appliedCampaigns.map((campaign) => (
                            <div
                              key={campaign.id}
                              className="flex items-center gap-1 mb-1"
                            >
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              <span>{campaign.label || campaign.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
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
                    {!freeShipping && discountedSubtotal < 5000 && (
                      <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                        ¥{(5000 - discountedSubtotal).toLocaleString()}
                        以上で送料無料
                      </div>
                    )}
                    {freeShipping && (
                      <div className="text-xs text-green-600 bg-green-50 p-2 rounded font-medium">
                        キャンペーンで送料無料
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
                    className="w-full bg-[#e2603f] hover:bg-[#c95a42] text-white font-bold py-3 px-4 cursor-pointer transition-colors shadow-md"
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
