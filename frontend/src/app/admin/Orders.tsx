import { useState, useEffect, useCallback } from "react";
import { Search, Eye, Package, Download } from "lucide-react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { apiService } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

interface Order {
  id: string;
  order_number: string;
  customer_email?: string;
  email?: string;
  total_amount: number;
  status: string;
  createdAt: string;
}

export const Orders = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { showToast } = useToast();

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getOrders({
        status: statusFilter || undefined,
        limit: 100,
      });
      if (response.data) {
        // Handle both response.data.data and response.data formats
        const ordersData = Array.isArray(response.data)
          ? response.data
          : (response.data as { data?: Order[] }).data || [];
        setOrders(ordersData);
      }
    } catch {
      showToast("注文の読み込みに失敗しました", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      const response = await apiService.updateOrderStatus(orderId, status);
      if (!response.error) {
        showToast("ステータスを更新しました", "success");
        loadOrders();
      } else {
        showToast(response.error, "error");
      }
    } catch {
      showToast("更新に失敗しました", "error");
    }
  };

  const handleExport = async () => {
    try {
      await apiService.exportOrders();
      showToast("エクスポートが完了しました", "success");
    } catch {
      showToast("エクスポートに失敗しました", "error");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "shipped":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (searchTerm) {
      return (
        order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              注文管理
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              注文の確認・管理・配送追跡
            </p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-5 h-5" />
            <span>エクスポート</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">総注文数</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {orders.length}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">保留中</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {orders.filter((o) => o.status === "pending").length}
                </p>
              </div>
              <Package className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">処理中</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {orders.filter((o) => o.status === "processing").length}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">配送済み</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {orders.filter((o) => o.status === "delivered").length}
                </p>
              </div>
              <Package className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="注文番号・メールアドレスで検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">すべてのステータス</option>
              <option value="pending">保留中</option>
              <option value="processing">処理中</option>
              <option value="shipped">発送済み</option>
              <option value="delivered">配送済み</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">読み込み中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      注文番号
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      顧客
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      金額
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ステータス
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      日付
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {order.order_number}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {order.customer_email || order.email}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ¥
                          {typeof order.total_amount === "number"
                            ? order.total_amount.toLocaleString()
                            : parseFloat(
                                String(order.total_amount || 0)
                              ).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <select
                          value={order.status}
                          onChange={(e) =>
                            handleStatusUpdate(order.id, e.target.value)
                          }
                          className={`px-2 py-1 text-xs font-medium rounded-full border-0 ${getStatusColor(
                            order.status
                          )}`}
                        >
                          <option value="pending">保留中</option>
                          <option value="processing">処理中</option>
                          <option value="shipped">発送済み</option>
                          <option value="delivered">配送済み</option>
                        </select>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(order.createdAt).toLocaleDateString(
                            "ja-JP"
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Order Detail Modal */}
        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
};

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
}

const OrderDetailModal = ({ order, onClose }: OrderDetailModalProps) => {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const { showToast } = useToast();

  const handleAddTracking = async () => {
    if (!trackingNumber || !carrier) {
      showToast("追跡番号と運送会社を入力してください", "error");
      return;
    }

    try {
      const response = await apiService.addShippingTracking(order.id, {
        tracking_number: trackingNumber,
        carrier: carrier,
        carrier_url: `https://tracking.${carrier.toLowerCase()}.com/${trackingNumber}`,
      });

      if (!response.error) {
        showToast("追跡情報を追加しました", "success");
        onClose();
      } else {
        showToast(response.error, "error");
      }
    } catch {
      showToast("追加に失敗しました", "error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">注文詳細</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h3 className="font-semibold mb-2">注文情報</h3>
            <p>注文番号: {order.order_number}</p>
            <p>ステータス: {order.status}</p>
            <p>
              合計金額: ¥
              {typeof order.total_amount === "number"
                ? order.total_amount.toLocaleString()
                : parseFloat(String(order.total_amount || 0)).toLocaleString()}
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">配送追跡情報追加</h3>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="追跡番号"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="運送会社"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <button
                onClick={handleAddTracking}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                追跡情報を追加
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
