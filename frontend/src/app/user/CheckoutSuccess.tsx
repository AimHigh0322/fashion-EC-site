import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  XCircle,
  Package,
  Mail,
  Home,
  ShoppingBag,
  CreditCard,
  Truck,
  Calendar,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";
import { useToast } from "../../contexts/ToastContext";
import { apiService } from "../../services/api";
import { UserLayout } from "../../components/layouts/UserLayout";

export const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { refreshCart } = useCart();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState<{
    order_id: string;
    order_number: string;
  } | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const [orderDetails, setOrderDetails] = useState<{
    total_amount?: number;
    payment_method?: string;
    status?: string;
  } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setVerificationError("セッションIDが見つかりません");
      setLoading(false);
      return;
    }

    verifyPayment(sessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate, searchParams]);

  const verifyPayment = async (sessionId: string) => {
    try {
      setLoading(true);
      const response = await apiService.verifyPaymentAndCreateOrder(sessionId);

      if (response.error) {
        setVerificationError(response.error);
        // Only show error toast once, not duplicate
        error(response.error);
      } else if (response.data) {
        setOrderData(response.data);
        success("ご注文ありがとうございます！");
        // Refresh cart count
        await refreshCart();
        // Load order details - with retry logic and better error handling
        if (response.data.order_id) {
          // Add a small delay to ensure order is fully committed to database
          await new Promise((resolve) => setTimeout(resolve, 500));

          try {
            const orderResponse = await apiService.getOrder(
              response.data.order_id
            );
            if (orderResponse.error) {
              // Silently fail - order details are optional, don't show error
              console.warn("Order details not available:", orderResponse.error);
            } else if (orderResponse.data) {
              setOrderDetails(orderResponse.data);
            }
          } catch (err) {
            // Silently fail - order details are optional
            console.warn("Failed to load order details:", err);
          }
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "決済の確認中にエラーが発生しました";
      setVerificationError(errorMessage);
      // Only show error toast once
      error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="min-h-screen bg-gradient-to-br  from-gray-50 to-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#e2603f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-700 text-lg font-medium">
              決済を確認しています...
            </p>
          </div>
        </div>
      </UserLayout>
    );
  }

  if (verificationError) {
    return (
      <UserLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="bg-white shadow-xl  p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-red-50  flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              エラーが発生しました
            </h1>
            <p className="text-gray-600 mb-8 leading-relaxed">
              {verificationError}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/orders")}
                className="w-full bg-[#e2603f] hover:bg-[#c95a42] text-white font-semibold py-3 px-6  transition-all shadow-md hover:shadow-lg"
              >
                注文履歴を確認
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 px-6  transition-all"
              >
                ホームへ戻る
              </button>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Success Header */}
          <div className="bg-white shadow-xl  p-8 md:p-12 text-center mb-6 overflow-hidden relative">
            {/* Decorative background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#e2603f]/5 to-transparent  -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#e2603f]/5 to-transparent  -ml-24 -mb-24"></div>

            <div className="relative z-10">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                ご注文ありがとうございます！
              </h1>
              <p className="text-gray-600 text-lg mb-8">
                ご注文を承りました。確認メールをお送りしました。
              </p>

              {orderData && (
                <div className="bg-gradient-to-r from-gray-50 to-gray-100  p-6 mb-6 border border-gray-200">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <Package className="w-5 h-5 text-[#e2603f]" />
                    <p className="text-sm font-semibold text-gray-700">
                      注文番号
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-4 tracking-wider">
                    {orderData.order_number}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600 bg-white  py-2 px-4 mx-auto w-fit">
                    <Mail className="w-4 h-4 text-[#e2603f]" />
                    <span>確認メールを送信しました</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Order Summary Card */}
            {orderDetails && (
              <div className="bg-white shadow-xl  p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-[#e2603f]/10  flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-[#e2603f]" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">注文内容</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">合計金額</span>
                    <span className="text-2xl font-bold text-[#e2603f]">
                      ¥{orderDetails.total_amount?.toLocaleString() || "0"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <div className="flex items-center gap-2 text-gray-600">
                      <CreditCard className="w-4 h-4" />
                      <span>支払い方法</span>
                    </div>
                    <span className="text-gray-900 font-semibold">
                      {orderDetails.payment_method === "stripe"
                        ? "クレジットカード"
                        : orderDetails.payment_method || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Truck className="w-4 h-4" />
                      <span>注文ステータス</span>
                    </div>
                    <span className="px-3 py-1 bg-blue-50 text-blue-700  text-sm font-semibold">
                      {orderDetails.status === "pending"
                        ? "処理待ち"
                        : orderDetails.status === "processing"
                        ? "処理中"
                        : orderDetails.status || "-"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Next Steps Card */}
            <div className="bg-white shadow-xl  p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50  flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  次のステップ
                </h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#e2603f] to-[#c95a42] text-white  flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-md">
                    1
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="font-semibold text-gray-900 mb-1">
                      確認メールを確認
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      注文確認メールをご確認ください
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#e2603f] to-[#c95a42] text-white  flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-md">
                    2
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="font-semibold text-gray-900 mb-1">
                      商品の発送を待つ
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      商品の発送準備が整い次第、発送いたします
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#e2603f] to-[#c95a42] text-white  flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-md">
                    3
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="font-semibold text-gray-900 mb-1">
                      商品を受け取る
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      商品到着後、レビューを投稿いただけます
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white shadow-xl  p-6 border border-gray-100">
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to={`/orders/${orderData?.order_id}`}
                className="flex-1 bg-gradient-to-r from-[#e2603f] to-[#c95a42] hover:from-[#c95a42] hover:to-[#b8503a] text-white font-semibold py-4 px-6  transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <Package className="w-5 h-5" />
                注文詳細を見る
              </Link>
              <Link
                to="/orders"
                className="flex-1 bg-white border-2 border-gray-200 hover:border-[#e2603f] text-gray-900 hover:text-[#e2603f] font-semibold py-4 px-6  transition-all flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-5 h-5" />
                注文履歴を見る
              </Link>
              <Link
                to="/"
                className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-900 font-semibold py-4 px-6  transition-all flex items-center justify-center gap-2 border border-gray-200"
              >
                <Home className="w-5 h-5" />
                お買い物を続ける
              </Link>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};
