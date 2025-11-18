import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Package } from "lucide-react";
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
  const [verificationError, setVerificationError] = useState<string | null>(null);

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
      }
    } catch (err) {
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
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <XCircle className="w-20 h-20 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              エラーが発生しました
            </h1>
            <p className="text-gray-600 mb-6">{verificationError}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/orders")}
                className="w-full bg-[#e2603f] hover:bg-[#c95a42] text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                注文履歴を確認
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors"
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            ご注文ありがとうございます！
          </h1>
          <p className="text-gray-600 mb-6">
            ご注文を承りました。確認メールをお送りしました。
          </p>
          
          {orderData && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">注文番号</p>
              <p className="text-lg font-bold text-gray-900">
                {orderData.order_number}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(`/orders/${orderData?.order_id}`)}
              className="w-full bg-[#e2603f] hover:bg-[#c95a42] text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              <Package className="w-5 h-5 mr-2" />
              注文詳細を見る
            </button>
            <button
              onClick={() => navigate("/orders")}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              注文履歴を見る
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full text-[#e2603f] hover:text-[#c95a42] font-medium py-2 px-4 rounded-lg transition-colors"
            >
              お買い物を続ける
            </button>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

