import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, MapPin, Plus, Check } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
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

interface ShippingAddress {
  id: string;
  name: string;
  postal_code: string;
  prefecture: string;
  city: string;
  address_line1: string;
  address_line2?: string;
  phone: string;
  is_default: boolean;
}

export const Checkout = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { error } = useToast();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingMethod, setShippingMethod] = useState<string>("standard");
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cartResponse, addressResponse] = await Promise.all([
        apiService.getCart(),
        apiService.getShippingAddresses(),
      ]);

      if (cartResponse.error) {
        error(cartResponse.error);
        setCartItems([]);
      } else if (cartResponse.data) {
        setCartItems(cartResponse.data);
      }

      if (addressResponse.error) {
        error(addressResponse.error);
        setAddresses([]);
      } else if (addressResponse.data) {
        setAddresses(addressResponse.data);
        // Auto-select default address
        const defaultAddress = addressResponse.data.find(
          (addr) => addr.is_default
        );
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
          calculateShippingForAddress(defaultAddress);
        }
      }
    } catch {
      error("データの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const calculateShippingForAddress = async (address: ShippingAddress) => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const response = await apiService.calculateShipping(
      address.prefecture,
      subtotal
    );
    if (response.data) {
      let baseShipping = response.data.shipping_cost || 0;
      // Add express shipping cost if selected
      if (shippingMethod === "express") {
        baseShipping += 500; // Express shipping costs 500 yen more
      }
      setShippingCost(baseShipping);
    }
  };

  const handleShippingMethodChange = (method: string) => {
    setShippingMethod(method);
    if (selectedAddressId) {
      const address = addresses.find((addr) => addr.id === selectedAddressId);
      if (address) {
        calculateShippingForAddress(address);
      }
    }
  };

  const handleAddressSelect = async (addressId: string) => {
    setSelectedAddressId(addressId);
    const address = addresses.find((addr) => addr.id === addressId);
    if (address) {
      calculateShippingForAddress(address);
    }
  };

  const handleCheckout = async () => {
    if (!selectedAddressId) {
      error("配送先を選択してください");
      return;
    }

    if (cartItems.length === 0) {
      error("カートが空です");
      return;
    }

    // Show confirmation first
    setShowConfirmation(true);
  };

  const handleConfirmOrder = async () => {
    setProcessing(true);
    try {
      // Use Stripe checkout
      const response = await apiService.createCheckoutSession(
        selectedAddressId
      );
      if (response.error) {
        error(response.error);
      } else if (response.data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = response.data.url;
      }
    } catch {
      error("決済セッションの作成に失敗しました");
    } finally {
      setProcessing(false);
      setShowConfirmation(false);
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
  const tax = Math.floor(subtotal * 0.1);
  const total = subtotal + tax + shippingCost;

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
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Breadcrumbs
              items={[
                { label: "商品一覧", path: "/" },
                { label: "カート", path: "/cart" },
                { label: "お支払い" },
              ]}
            />
            <h1 className="text-2xl font-bold text-gray-900 flex items-center mt-4">
              <CreditCard className="w-6 h-6 mr-2 text-[#e2603f]" />
              お支払い
            </h1>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Address Selection */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Address */}
              <div className="bg-white  shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-[#e2603f]" />
                    配送先
                  </h2>
                  <button
                    onClick={() => navigate("/shipping-addresses/new")}
                    className="flex items-center text-[#e2603f] hover:text-[#c95a42] text-sm font-medium"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    新しい住所を追加
                  </button>
                </div>

                {addresses.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                      配送先が登録されていません
                    </p>
                    <button
                      onClick={() => navigate("/shipping-addresses/new")}
                      className="inline-flex items-center px-4 py-2 bg-[#e2603f] hover:bg-[#c95a42] text-white font-medium  transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      配送先を追加
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        onClick={() => handleAddressSelect(address.id)}
                        className={`border-2  p-4 cursor-pointer transition-all ${
                          selectedAddressId === address.id
                            ? "border-[#e2603f] bg-orange-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-semibold text-gray-900">
                                {address.name}
                              </p>
                              {address.is_default && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                  デフォルト
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              〒{address.postal_code}
                            </p>
                            <p className="text-sm text-gray-600">
                              {address.prefecture} {address.city}
                            </p>
                            <p className="text-sm text-gray-600">
                              {address.address_line1}
                            </p>
                            {address.address_line2 && (
                              <p className="text-sm text-gray-600">
                                {address.address_line2}
                              </p>
                            )}
                            <p className="text-sm text-gray-600 mt-1">
                              電話: {address.phone}
                            </p>
                          </div>
                          {selectedAddressId === address.id && (
                            <div className="flex-shrink-0 ml-4">
                              <div className="w-6 h-6 bg-[#e2603f] rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Method Selection */}
              <div className="bg-white border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-[#e2603f]" />
                  お支払い方法
                </h2>
                <div className="bg-gray-50 border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💳</span>
                    <div>
                      <p className="font-medium text-gray-900">
                        クレジットカード (Stripe)
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        安全なオンライン決済
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Method Selection */}
              <div className="bg-white  shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-[#e2603f]" />
                  配送方法
                </h2>
                <div className="space-y-3">
                  {[
                    {
                      value: "standard",
                      label: "通常配送",
                      description: "1-3営業日でお届け",
                      cost: 0,
                    },
                    {
                      value: "express",
                      label: "速達配送",
                      description: "翌日お届け",
                      cost: 500,
                    },
                  ].map((method) => (
                    <div
                      key={method.value}
                      onClick={() => handleShippingMethodChange(method.value)}
                      className={`border-2  p-4 cursor-pointer transition-all ${
                        shippingMethod === method.value
                          ? "border-[#e2603f] bg-orange-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {method.label}
                            </span>
                            {method.cost > 0 && (
                              <span className="text-sm text-gray-600">
                                (+¥{method.cost.toLocaleString()})
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {method.description}
                          </p>
                        </div>
                        {shippingMethod === method.value && (
                          <div className="w-6 h-6 bg-[#e2603f] rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-white  shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  注文内容 ({cartItems.length}点)
                </h2>
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 border-b border-gray-200 pb-4 last:border-0"
                    >
                      <img
                        src={getImageUrl(item.main_image_url)}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "/img/model/model (1).png";
                        }}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          数量: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">
                          ¥{(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white  shadow-sm p-6 sticky top-4">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  注文内容
                </h2>

                <div className="space-y-3 mb-6">
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
                        shippingCost === 0 ? "text-green-600 font-semibold" : ""
                      }
                    >
                      {shippingCost === 0
                        ? "無料"
                        : `¥${shippingCost.toLocaleString()}`}
                    </span>
                  </div>
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
                  disabled={
                    processing || !selectedAddressId || cartItems.length === 0
                  }
                  className="w-full bg-[#e2603f] hover:bg-[#c95a42] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4  transition-colors shadow-md flex items-center justify-center"
                >
                  {processing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      処理中...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      注文を確認する
                    </>
                  )}
                </button>

                <div className="mt-4 text-xs text-gray-500 text-center">
                  <p>Stripe決済を使用します</p>
                  <p className="mt-1">安全なオンライン決済</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white  shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                注文内容の確認
              </h2>

              {/* Order Summary */}
              <div className="space-y-4 mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">注文商品</h3>
                  <div className="space-y-2">
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between text-sm text-gray-600"
                      >
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                        <span>
                          ¥{(item.price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">配送先</h3>
                  {addresses.find((addr) => addr.id === selectedAddressId)
                    ?.name && (
                    <div className="text-sm text-gray-600">
                      <p>
                        {
                          addresses.find(
                            (addr) => addr.id === selectedAddressId
                          )?.name
                        }
                      </p>
                      <p>
                        〒
                        {
                          addresses.find(
                            (addr) => addr.id === selectedAddressId
                          )?.postal_code
                        }
                      </p>
                      <p>
                        {
                          addresses.find(
                            (addr) => addr.id === selectedAddressId
                          )?.prefecture
                        }{" "}
                        {
                          addresses.find(
                            (addr) => addr.id === selectedAddressId
                          )?.city
                        }
                      </p>
                      <p>
                        {
                          addresses.find(
                            (addr) => addr.id === selectedAddressId
                          )?.address_line1
                        }
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    お支払い方法
                  </h3>
                  <p className="text-sm text-gray-600">
                    クレジットカード (Stripe) - 安全なオンライン決済
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">配送方法</h3>
                  <p className="text-sm text-gray-600">
                    {shippingMethod === "standard" ? "通常配送" : "速達配送"}
                  </p>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">小計</span>
                    <span className="text-gray-900">
                      ¥{subtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">消費税 (10%)</span>
                    <span className="text-gray-900">
                      ¥{tax.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">送料</span>
                    <span className="text-gray-900">
                      {shippingCost === 0
                        ? "無料"
                        : `¥${shippingCost.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span className="text-gray-900">合計</span>
                    <span className="text-red-600">
                      ¥{total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium  transition-colors"
                >
                  戻る
                </button>
                <button
                  onClick={handleConfirmOrder}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-[#e2603f] hover:bg-[#c95a42] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold  transition-colors flex items-center justify-center"
                >
                  {processing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      処理中...
                    </>
                  ) : (
                    "注文を確定する"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
};
