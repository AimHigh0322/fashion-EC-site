import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Package,
  MapPin,
  Truck,
  XCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Star,
  MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

interface ShippingAddress {
  name: string;
  postal_code: string;
  prefecture: string;
  city: string;
  address_line1: string;
  address_line2?: string;
  phone: string;
}

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
  status: string;
  payment_status: string;
  payment_method: string;
  total_amount: number;
  shipping_cost: number;
  tax_amount: number;
  createdAt: string;
  items: OrderItem[];
  shipping_address: string | ShippingAddress;
  tracking?: ShippingTracking;
}

export const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { success, error } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedProductForReview, setSelectedProductForReview] =
    useState<OrderItem | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadOrder = useCallback(
    async (orderId: string) => {
      try {
        setLoading(true);
        const response = await apiService.getOrder(orderId);
        if (response.error) {
          error(response.error);
        } else if (response.data) {
          setOrder(response.data as unknown as Order);
        }
      } catch {
        error("注文の読み込みに失敗しました");
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
    if (id) {
      loadOrder(id);
    }
  }, [isAuthenticated, navigate, id, loadOrder]);

  const handleCancelOrder = async () => {
    if (!order) return;

    if (
      !confirm("本当にこの注文をキャンセルしますか？この操作は取り消せません。")
    ) {
      return;
    }

    setCancelling(true);
    try {
      const response = await apiService.cancelOrder(order.id);
      if (response.error) {
        error(response.error);
      } else {
        success("注文をキャンセルしました");
        // Reload order to see updated status
        await loadOrder(order.id);
      }
    } catch {
      error("注文のキャンセルに失敗しました");
    } finally {
      setCancelling(false);
    }
  };

  const handleWriteReview = (item: OrderItem) => {
    setSelectedProductForReview(item);
    setReviewRating(5);
    setReviewTitle("");
    setReviewComment("");
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedProductForReview || !order) return;

    if (!reviewTitle.trim()) {
      error("レビュータイトルを入力してください");
      return;
    }

    setSubmittingReview(true);
    try {
      const response = await apiService.createReview({
        productId: selectedProductForReview.product_id,
        orderId: order.id,
        rating: reviewRating,
        title: reviewTitle,
        comment: reviewComment,
      });

      if (response.error) {
        error(response.error);
      } else {
        success("レビューを投稿しました");
        setShowReviewModal(false);
        setSelectedProductForReview(null);
      }
    } catch {
      error("レビューの投稿に失敗しました");
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { label: string; icon: LucideIcon; className: string }
    > = {
      pending: {
        label: "処理待ち",
        icon: Clock,
        className: "bg-yellow-100 text-yellow-800",
      },
      processing: {
        label: "処理中",
        icon: Package,
        className: "bg-blue-100 text-blue-800",
      },
      shipped: {
        label: "発送済み",
        icon: Truck,
        className: "bg-purple-100 text-purple-800",
      },
      delivered: {
        label: "配達完了",
        icon: CheckCircle,
        className: "bg-green-100 text-green-800",
      },
      cancelled: {
        label: "キャンセル",
        icon: XCircle,
        className: "bg-red-100 text-red-800",
      },
    };

    const config = statusConfig[status] || {
      label: status,
      icon: Package,
      className: "bg-gray-100 text-gray-800",
    };
    const Icon = config.icon;

    return (
      <div
        className={`inline-flex items-center px-3 py-2  text-sm font-semibold ${config.className}`}
      >
        <Icon className="w-4 h-4 mr-2" />
        {config.label}
      </div>
    );
  };

  const parseAddress = (
    address: string | ShippingAddress
  ): ShippingAddress | null => {
    if (typeof address === "string") {
      try {
        return JSON.parse(address);
      } catch {
        return null;
      }
    }
    return address;
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

  if (!order) {
    return (
      <UserLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              注文が見つかりません
            </h2>
            <button
              onClick={() => navigate("/orders")}
              className="mt-4 px-6 py-2 bg-[#e2603f] hover:bg-[#c95a42] text-white font-medium  transition-colors"
            >
              注文履歴へ戻る
            </button>
          </div>
        </div>
      </UserLayout>
    );
  }

  const shippingAddress = parseAddress(order.shipping_address);
  const canCancel = order.status === "pending" || order.status === "processing";

  return (
    <UserLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Breadcrumbs
              items={[
                { label: "商品一覧", path: "/" },
                { label: "注文履歴", path: "/orders" },
                { label: "注文詳細" },
              ]}
            />
            <div className="flex flex-col md:flex-row md:items-center justify-between mt-4 gap-4">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Package className="w-6 h-6 mr-2 text-[#e2603f]" />
                注文詳細
              </h1>
              {getStatusBadge(order.status)}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Info */}
              <div className="bg-white  shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  注文情報
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">注文番号</p>
                    <p className="font-semibold text-gray-900">
                      {order.order_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">注文日</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(order.createdAt).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">支払い状況</p>
                    <p className="font-semibold text-gray-900">
                      {order.payment_status === "paid"
                        ? "支払済"
                        : order.payment_status === "pending"
                        ? "未払い"
                        : "返金済"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">支払い方法</p>
                    <p className="font-semibold text-gray-900">
                      {order.payment_method === "stripe"
                        ? "クレジットカード"
                        : order.payment_method || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Shipping Tracking */}
              {order.tracking && (
                <div className="bg-white  shadow-sm p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <Truck className="w-5 h-5 mr-2 text-[#e2603f]" />
                    配送追跡
                  </h2>
                  <div className="space-y-4">
                    {/* Tracking Status */}
                    <div>
                      <p className="text-sm text-gray-600 mb-2">配送状況</p>
                      {(() => {
                        const trackingStatus = order.tracking.status;
                        const statusConfig: Record<
                          string,
                          { label: string; icon: LucideIcon; className: string }
                        > = {
                          shipped: {
                            label: "発送済み",
                            icon: Truck,
                            className: "bg-blue-100 text-blue-800",
                          },
                          in_transit: {
                            label: "配送中",
                            icon: Truck,
                            className: "bg-purple-100 text-purple-800",
                          },
                          out_for_delivery: {
                            label: "配達中",
                            icon: Truck,
                            className: "bg-indigo-100 text-indigo-800",
                          },
                          delivered: {
                            label: "配達完了",
                            icon: CheckCircle,
                            className: "bg-green-100 text-green-800",
                          },
                        };
                        const config = statusConfig[trackingStatus] || {
                          label: trackingStatus,
                          icon: Truck,
                          className: "bg-gray-100 text-gray-800",
                        };
                        const Icon = config.icon;
                        return (
                          <div
                            className={`inline-flex items-center px-3 py-2  text-sm font-semibold ${config.className}`}
                          >
                            <Icon className="w-4 h-4 mr-2" />
                            {config.label}
                          </div>
                        );
                      })()}
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">追跡番号</p>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          {order.tracking.tracking_number}
                        </p>
                        {order.tracking.carrier_url && (
                          <a
                            href={order.tracking.carrier_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#e2603f] hover:text-[#c95a42] flex items-center text-sm"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            追跡
                          </a>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">配送業者</p>
                      <p className="font-semibold text-gray-900">
                        {order.tracking.carrier}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">発送日</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(order.tracking.shipped_at).toLocaleDateString(
                          "ja-JP",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                    {order.tracking.delivered_at && (
                      <div>
                        <p className="text-sm text-gray-600">配達日</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(
                            order.tracking.delivered_at
                          ).toLocaleDateString("ja-JP", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              {shippingAddress && (
                <div className="bg-white  shadow-sm p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-[#e2603f]" />
                    配送先
                  </h2>
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900">
                      {shippingAddress.name}
                    </p>
                    <p className="text-gray-600">
                      〒{shippingAddress.postal_code}
                    </p>
                    <p className="text-gray-600">
                      {shippingAddress.prefecture} {shippingAddress.city}
                    </p>
                    <p className="text-gray-600">
                      {shippingAddress.address_line1}
                    </p>
                    {shippingAddress.address_line2 && (
                      <p className="text-gray-600">
                        {shippingAddress.address_line2}
                      </p>
                    )}
                    <p className="text-gray-600 pt-2">
                      電話: {shippingAddress.phone}
                    </p>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="bg-white  shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  注文商品 ({order.items.length}点)
                </h2>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start border-b border-gray-200 pb-4 last:border-0"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {item.product_name}
                          </h3>
                          {order.status === "delivered" && (
                            <button
                              onClick={() => handleWriteReview(item)}
                              className="flex items-center gap-1 text-sm cursor-pointer text-[#e2603f] hover:text-[#c95b42] transition-colors"
                            >
                              <MessageSquare className="w-4 h-4" />
                              レビューを書く
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          ¥{item.price.toLocaleString()} × {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">
                          ¥{item.total.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Order Summary */}
              <div className="bg-white  shadow-sm p-6 sticky top-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  注文内容
                </h2>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-gray-600">
                    <span>小計</span>
                    <span>
                      ¥
                      {(
                        order.total_amount -
                        order.tax_amount -
                        order.shipping_cost
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>消費税</span>
                    <span>¥{order.tax_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>送料</span>
                    <span>
                      {order.shipping_cost === 0
                        ? "無料"
                        : `¥${order.shipping_cost.toLocaleString()}`}
                    </span>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">
                      合計
                    </span>
                    <span className="text-2xl font-bold text-red-600">
                      ¥{order.total_amount.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">(税込)</p>
                </div>

                {/* Actions */}
                {canCancel && (
                  <button
                    onClick={handleCancelOrder}
                    disabled={cancelling}
                    className="w-full flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium  transition-colors mb-3"
                  >
                    {cancelling ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        キャンセル中...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        注文をキャンセル
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => navigate("/orders")}
                  className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium  transition-colors"
                >
                  注文履歴へ戻る
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedProductForReview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-lg">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                レビューを書く
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                {selectedProductForReview.product_name}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    評価
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setReviewRating(rating)}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            rating <= reviewRating
                              ? "fill-yellow-400 text-yellow-400"
                              : "fill-gray-200 text-gray-200"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-gray-600">
                      {reviewRating}/5
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    タイトル <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    placeholder="レビューのタイトルを入力"
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    コメント
                  </label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="商品のレビューを入力（任意）"
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setSelectedProductForReview(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium  transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview || !reviewTitle.trim()}
                  className="flex-1 px-4 py-2 bg-[#e2603f] hover:bg-[#c95a42] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold  transition-colors flex items-center justify-center"
                >
                  {submittingReview ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      投稿中...
                    </>
                  ) : (
                    "レビューを投稿"
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
