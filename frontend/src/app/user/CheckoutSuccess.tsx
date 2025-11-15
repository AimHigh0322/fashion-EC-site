import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, ShoppingBag, ArrowRight } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";
import { useToast } from "../../contexts/ToastContext";
import { UserLayout } from "../../components/layouts/UserLayout";
import { Breadcrumbs } from "../../components/molecules/Breadcrumbs";

export const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { refreshCart } = useCart();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get("session_id");
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // Only show toast once - use ref to prevent infinite loop
    if (hasShownToast.current) {
      setLoading(false);
      return;
    }

    if (sessionId) {
      // Payment was successful, show success message only once
      hasShownToast.current = true;
      success("お支払いが完了しました！");
      // Refresh cart count after successful checkout (cart should be cleared)
      refreshCart();
      setLoading(false);
    } else {
      hasShownToast.current = true;
      error("セッション情報が見つかりません");
      setLoading(false);
      setTimeout(() => navigate("/"), 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, isAuthenticated, navigate]); // success and error are stable functions but cause infinite loop if included

  if (loading) {
    return (
      <UserLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">読み込み中...</p>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto mb-6">
          <Breadcrumbs
            items={[
              { label: "商品一覧", path: "/" },
              { label: "ショッピングカート", path: "/cart" },
              { label: "お支払い完了" },
            ]}
          />
        </div>
        <div className="flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              お支払いが完了しました！
            </h1>

            <p className="text-gray-600 mb-8">
              ご注文ありがとうございます。注文確認メールを送信いたしました。
            </p>

            <div className="space-y-4">
              <button
                onClick={() => navigate("/")}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <ShoppingBag className="w-5 h-5" />
                <span>買い物を続ける</span>
              </button>

              <button
                onClick={() => navigate("/admin/orders")}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <span>注文履歴を見る</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};
