import { useState, useEffect, useCallback } from "react";
import { Search, Eye, Package, Download, Truck } from "lucide-react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { apiService } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { Breadcrumbs } from "../../components/molecules/Breadcrumbs";

interface ShippingTracking {
  id: string;
  tracking_number: string;
  carrier: string;
  carrier_url?: string;
  status: string;
  shipped_at: string;
  delivered_at?: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_email?: string;
  email?: string;
  total_amount: number;
  status: string;
  createdAt: string;
  tracking?: ShippingTracking;
}

export const Orders = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { showToast } = useToast();

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getOrders({
        status: statusFilter || undefined,
        payment_status: paymentFilter || undefined,
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
  }, [statusFilter, paymentFilter, showToast]);

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
      case "cancelled":
        return "bg-red-100 text-red-800";
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
        {/* Breadcrumb */}
        <Breadcrumbs
          homePath="/admin"
          items={[
            { label: "ダッシュボード", path: "/admin" },
            { label: "注文管理" },
          ]}
        />
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
            className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300  hover:bg-gray-50 cursor-pointer"
          >
            <Download className="w-5 h-5" />
            <span>エクスポート</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white  shadow p-4">
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
          <div className="bg-white  shadow p-4">
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
          <div className="bg-white  shadow p-4">
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
          <div className="bg-white  shadow p-4">
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
        <div className="bg-white  shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="注文番号・メールアドレスで検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">すべてのステータス</option>
              <option value="pending">保留中</option>
              <option value="processing">処理中</option>
              <option value="shipped">発送済み</option>
              <option value="delivered">配送済み</option>
              <option value="cancelled">キャンセル</option>
            </select>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">すべての支払い</option>
              <option value="pending">未払い</option>
              <option value="paid">支払済</option>
              <option value="refunded">返金済</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white  shadow overflow-hidden">
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
                          className={`px-2 py-1 text-xs font-medium  border-0 ${getStatusColor(
                            order.status
                          )}`}
                        >
                          <option value="pending">保留中</option>
                          <option value="processing">処理中</option>
                          <option value="shipped">発送済み</option>
                          <option value="delivered">配送済み</option>
                          <option value="cancelled">キャンセル</option>
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
                          className="text-blue-600 hover:text-blue-900 p-1 cursor-pointer"
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

// Carrier options with common Japanese carriers
const carrierOptions = [
  { value: "", label: "配送業者を選択" },
  {
    value: "ヤマト運輸",
    label: "ヤマト運輸",
    url: "https://toi.kuronekoyamato.co.jp/cgi-bin/tneko",
  },
  {
    value: "佐川急便",
    label: "佐川急便",
    url: "https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do",
  },
  {
    value: "日本郵便",
    label: "日本郵便",
    url: "https://trackings.post.japanpost.jp/services/srv/search/",
  },
  {
    value: "西濃運輸",
    label: "西濃運輸",
    url: "https://track.seino.co.jp/cgi-bin/gnpquery.pgm",
  },
  {
    value: "福山通運",
    label: "福山通運",
    url: "https://corp.fukutsu.co.jp/situation/tracking_no_hunt/",
  },
  { value: "その他", label: "その他" },
];

const trackingStatusOptions = [
  { value: "shipped", label: "発送済み" },
  { value: "in_transit", label: "配送中" },
  { value: "out_for_delivery", label: "配達中" },
  { value: "delivered", label: "配達完了" },
];

const OrderDetailModal = ({
  order: initialOrder,
  onClose,
}: OrderDetailModalProps) => {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [customCarrier, setCustomCarrier] = useState("");
  const [carrierUrl, setCarrierUrl] = useState("");
  const [trackingStatus, setTrackingStatus] = useState("shipped");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (order.tracking) {
      setTrackingNumber(order.tracking.tracking_number);
      // Check if carrier is one of the predefined options
      const isPredefinedCarrier = carrierOptions.some(
        (opt) => opt.value === order.tracking!.carrier && opt.value !== "その他"
      );
      if (isPredefinedCarrier) {
        setCarrier(order.tracking.carrier);
        setCustomCarrier("");
      } else {
        setCarrier("その他");
        setCustomCarrier(order.tracking.carrier);
      }
      setCarrierUrl(order.tracking.carrier_url || "");
      setTrackingStatus(order.tracking.status);
    }
  }, [order]);

  const handleCarrierChange = (selectedCarrier: string) => {
    setCarrier(selectedCarrier);
    if (selectedCarrier !== "その他") {
      setCustomCarrier("");
      const option = carrierOptions.find(
        (opt) => opt.value === selectedCarrier
      );
      if (option && option.url) {
        setCarrierUrl(option.url);
      }
    } else {
      setCarrierUrl("");
    }
  };

  const loadOrderDetails = async () => {
    try {
      const response = await apiService.getOrder(order.id);
      if (response.data) {
        setOrder(response.data as unknown as Order);
      }
    } catch (error) {
      console.error("Failed to load order details:", error);
    }
  };

  const handleAddTracking = async () => {
    const finalCarrier = carrier === "その他" ? customCarrier : carrier;
    if (!trackingNumber || !finalCarrier) {
      showToast("追跡番号と配送業者を入力してください", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.addShippingTracking(order.id, {
        tracking_number: trackingNumber,
        carrier: finalCarrier,
        carrier_url: carrierUrl || undefined,
        status: trackingStatus,
      });

      if (!response.error) {
        showToast("追跡情報を追加しました", "success");
        await loadOrderDetails();
      } else {
        showToast(response.error, "error");
      }
    } catch {
      showToast("追加に失敗しました", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTracking = async () => {
    if (!order.tracking) return;

    const finalCarrier = carrier === "その他" ? customCarrier : carrier;
    if (!trackingNumber || !finalCarrier) {
      showToast("追跡番号と配送業者を入力してください", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.updateShippingTracking(
        order.tracking.id,
        {
          tracking_number: trackingNumber,
          carrier: finalCarrier,
          carrier_url: carrierUrl || undefined,
          status: trackingStatus,
          delivered_at:
            trackingStatus === "delivered"
              ? new Date().toISOString()
              : undefined,
        }
      );

      if (!response.error) {
        showToast("追跡情報を更新しました", "success");
        await loadOrderDetails();
      } else {
        showToast(response.error, "error");
      }
    } catch {
      showToast("更新に失敗しました", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white  max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold flex items-center">
            <Package className="w-5 h-5 mr-2 text-blue-600" />
            注文詳細
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none cursor-pointer"
          >
            ×
          </button>
        </div>
        <div className="p-6 space-y-6">
          {/* Order Information */}
          <div className="bg-gray-50  p-4">
            <h3 className="font-semibold mb-3 flex items-center">
              <Package className="w-4 h-4 mr-2" />
              注文情報
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">注文番号</p>
                <p className="font-medium">{order.order_number}</p>
              </div>
              <div>
                <p className="text-gray-600">ステータス</p>
                <p className="font-medium">{order.status}</p>
              </div>
              <div>
                <p className="text-gray-600">合計金額</p>
                <p className="font-medium">
                  ¥
                  {typeof order.total_amount === "number"
                    ? order.total_amount.toLocaleString()
                    : parseFloat(
                        String(order.total_amount || 0)
                      ).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-600">注文日</p>
                <p className="font-medium">
                  {new Date(order.createdAt).toLocaleDateString("ja-JP")}
                </p>
              </div>
            </div>
          </div>

          {/* Current Tracking Information */}
          {order.tracking && (
            <div className="bg-blue-50  p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <Truck className="w-4 h-4 mr-2 text-blue-600" />
                現在の配送追跡情報
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">追跡番号</p>
                  <p className="font-medium">
                    {order.tracking.tracking_number}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">配送業者</p>
                  <p className="font-medium">{order.tracking.carrier}</p>
                </div>
                <div>
                  <p className="text-gray-600">配送状況</p>
                  <p className="font-medium">
                    {trackingStatusOptions.find(
                      (opt) => opt.value === order.tracking!.status
                    )?.label || order.tracking.status}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">発送日</p>
                  <p className="font-medium">
                    {new Date(order.tracking.shipped_at).toLocaleDateString(
                      "ja-JP"
                    )}
                  </p>
                </div>
                {order.tracking.delivered_at && (
                  <div>
                    <p className="text-gray-600">配達日</p>
                    <p className="font-medium">
                      {new Date(order.tracking.delivered_at).toLocaleDateString(
                        "ja-JP"
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tracking Form */}
          <div className="border border-gray-200  p-4">
            <h3 className="font-semibold mb-3 flex items-center">
              <Truck className="w-4 h-4 mr-2" />
              {order.tracking ? "配送追跡情報を更新" : "配送追跡情報を追加"}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  追跡番号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="1234567890"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  配送業者 <span className="text-red-500">*</span>
                </label>
                <select
                  value={carrier}
                  onChange={(e) => handleCarrierChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {carrierOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {carrier === "その他" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    配送業者名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="配送業者名を入力"
                    value={customCarrier}
                    onChange={(e) => setCustomCarrier(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  追跡URL（任意）
                </label>
                <input
                  type="url"
                  placeholder="https://tracking.example.com/..."
                  value={carrierUrl}
                  onChange={(e) => setCarrierUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  配送状況 <span className="text-red-500">*</span>
                </label>
                <select
                  value={trackingStatus}
                  onChange={(e) => setTrackingStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {trackingStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={
                  order.tracking ? handleUpdateTracking : handleAddTracking
                }
                disabled={
                  loading ||
                  !trackingNumber ||
                  !(carrier === "その他" ? customCarrier : carrier)
                }
                className="w-full px-4 py-2 bg-blue-600 text-white  hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    処理中...
                  </>
                ) : order.tracking ? (
                  "更新"
                ) : (
                  "追加"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
