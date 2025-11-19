import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Eye } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { apiService } from "../../services/api";
import { UserLayout } from "../../components/layouts/UserLayout";
import { Breadcrumbs } from "../../components/molecules/Breadcrumbs";

interface OrderItem {
  id: string;
  product_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status?: string;
  total_amount: number;
  createdAt: string;
  items?: OrderItem[];
}

export const Orders = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { error } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadOrders();
  }, [isAuthenticated, navigate, filter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params: { status?: string } = {};
      if (filter !== "all") {
        params.status = filter;
      }
      const response = await apiService.getOrders(params);
      if (response.error) {
        error(response.error);
        setOrders([]);
      } else if (response.data && Array.isArray(response.data)) {
        // Map the response data to ensure payment_status is included
        setOrders(
          response.data.map((order: Order) => ({
            ...order,
            payment_status: order.payment_status || "pending",
          }))
        );
      }
    } catch {
      error("注文の読み込みに失敗しました");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: {
        label: "処理待ち",
        className: "bg-yellow-100 text-yellow-800",
      },
      processing: { label: "処理中", className: "bg-blue-100 text-blue-800" },
      shipped: {
        label: "発送済み",
        className: "bg-purple-100 text-purple-800",
      },
      delivered: {
        label: "配達完了",
        className: "bg-green-100 text-green-800",
      },
      cancelled: { label: "キャンセル", className: "bg-red-100 text-red-800" },
    };

    const config = statusConfig[status] || {
      label: status,
      className: "bg-gray-100 text-gray-800",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-semibold ${config.className}`}
      >
        {config.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: "未払い", className: "bg-yellow-100 text-yellow-800" },
      paid: { label: "支払済", className: "bg-green-100 text-green-800" },
      refunded: { label: "返金済", className: "bg-gray-100 text-gray-800" },
    };

    const config = statusConfig[paymentStatus] || {
      label: paymentStatus,
      className: "bg-gray-100 text-gray-800",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-semibold ${config.className}`}
      >
        {config.label}
      </span>
    );
  };

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
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Breadcrumbs
              items={[{ label: "商品一覧", path: "/" }, { label: "注文履歴" }]}
            />
            <h1 className="text-2xl font-bold text-gray-900 flex items-center mt-4">
              <Package className="w-6 h-6 mr-2 text-[#e2603f]" />
              注文履歴
            </h1>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filter Tabs */}
          <div className="bg-white  shadow-sm mb-6">
            <div className="flex flex-wrap gap-2 p-4 border-b border-gray-200">
              {[
                { value: "all", label: "すべて" },
                { value: "processing", label: "処理中" },
                { value: "shipped", label: "発送済み" },
                { value: "delivered", label: "配達完了" },
                { value: "cancelled", label: "キャンセル" },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`px-4 py-2  font-medium transition-colors ${
                    filter === tab.value
                      ? "bg-[#e2603f] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          {orders.length === 0 ? (
            <div className="bg-white  shadow-sm p-12 text-center">
              <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                注文がありません
              </h2>
              <p className="text-gray-600 mb-6">
                {filter === "all"
                  ? "まだ注文をしていません"
                  : `${
                      [
                        { value: "processing", label: "処理中" },
                        { value: "shipped", label: "発送済み" },
                        { value: "delivered", label: "配達完了" },
                        { value: "cancelled", label: "キャンセル" },
                      ].find((t) => t.value === filter)?.label
                    }の注文はありません`}
              </p>
              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center px-6 py-3 bg-[#e2603f] hover:bg-[#c95a42] text-white font-medium  transition-colors"
              >
                商品を見る
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white  shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          注文番号: {order.order_number}
                        </h3>
                        <p className="text-sm text-gray-600">
                          注文日:{" "}
                          {new Date(order.createdAt).toLocaleDateString(
                            "ja-JP"
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {getStatusBadge(order.status)}
                        {getPaymentStatusBadge(
                          order.payment_status || "pending"
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-gray-200">
                      <div>
                        <p className="text-2xl font-bold text-red-600">
                          ¥{order.total_amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">(税込)</p>
                      </div>
                      <button
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="flex items-center px-4 py-2 bg-[#e2603f] hover:bg-[#c95a42] text-white font-medium  transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        詳細を見る
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};
