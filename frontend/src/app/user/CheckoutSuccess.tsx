import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle, Package, Mail, Home } from "lucide-react";
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
  }, [isAuthenticated, navigate, searchParams]);

  const verifyPayment = async (sessionId: string) => {
    try {
      setLoading(true);
      const response = await apiService.verifyPaymentAndCreateOrder(sessionId);

      if (response.error) {
        setVerificationError(response.error);
        error(response.error);
      } else if (response.data) {
        setOrderData(response.data);
        success("ご注文ありがとうございます！");
        // Refresh cart count
        await refreshCart();
        // Load order details
        if (response.data.order_id) {
          try {
            const orderResponse = await apiService.getOrder(
              response.data.order_id
            );
            if (orderResponse.data) {
              setOrderDetails(orderResponse.data);
            }
          } catch {
            // Silently fail - order details are optional
          }
        }
      }
    } catch {
      setVerificationError("決済の確認中にエラーが発生しました");
      error("決済の確認中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">決済を確認しています...</p>
          </div>
        </div>
      </UserLayout>
    );
  }

  if (verificationError) {
    return (
      <UserLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white  shadow-lg p-8 max-w-md w-full text-center">
            <XCircle className="w-20 h-20 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              エラーが発生しました
            </h1>
            <p className="text-gray-600 mb-6">{verificationError}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/orders")}
                className="w-full bg-[#e2603f] hover:bg-[#c95a42] text-white font-medium py-2 px-4  transition-colors"
              >
                注文履歴を確認
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4  transition-colors"
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
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white  shadow-lg p-8 text-center mb-6">
            <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ご注文ありがとうございます！
            </h1>
            <p className="text-gray-600 mb-6">
              ご注文を承りました。確認メールをお送りしました。
            </p>

            {orderData && (
              <div className="bg-gray-50  p-6 mb-6">
                <p className="text-sm text-gray-600 mb-2">注文番号</p>
                <p className="text-2xl font-bold text-gray-900 mb-4">
                  {orderData.order_number}
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>確認メールを送信しました</span>
                </div>
              </div>
            )}

            {orderDetails && (
              <div className="bg-blue-50 border border-blue-200  p-6 mb-6 text-left">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  注文内容
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">合計金額</span>
                    <span className="font-bold text-gray-900">
                      ¥{orderDetails.total_amount?.toLocaleString() || "0"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">支払い方法</span>
                    <span className="text-gray-900">
                      {orderDetails.payment_method === "stripe"
                        ? "クレジットカード"
                        : orderDetails.payment_method || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">注文ステータス</span>
                    <span className="text-gray-900">
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

            <div className="flex flex-col gap-3">
              <Link
                to={`/orders/${orderData?.order_id}`}
                className="w-full bg-[#e2603f] hover:bg-[#c95a42] text-white font-medium py-3 px-4  transition-colors flex items-center justify-center"
              >
                <Package className="w-5 h-5 mr-2" />
                注文詳細を見る
              </Link>
              <Link
                to="/orders"
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4  transition-colors"
              >
                注文履歴を見る
              </Link>
              <Link
                to="/"
                className="w-full text-[#e2603f] hover:text-[#c95a42] font-medium py-2 px-4  transition-colors flex items-center justify-center"
              >
                <Home className="w-4 h-4 mr-2" />
                お買い物を続ける
              </Link>
            </div>
          </div>

          <div className="bg-white  shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              次のステップ
            </h2>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-[#e2603f] text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium text-gray-900">確認メールを確認</p>
                  <p>注文確認メールをご確認ください</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-[#e2603f] text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium text-gray-900">商品の発送を待つ</p>
                  <p>商品の発送準備が整い次第、発送いたします</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-[#e2603f] text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium text-gray-900">商品を受け取る</p>
                  <p>商品到着後、レビューを投稿いただけます</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};
