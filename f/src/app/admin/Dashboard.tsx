import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Breadcrumbs } from "../../components/molecules/Breadcrumbs";
import { apiService } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  salesChange: number;
  ordersChange: number;
  productsChange: number;
  customersChange: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customer: string;
  amount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

export const Dashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [statsResponse, ordersResponse] = await Promise.all([
          apiService.getDashboardStats(),
          apiService.getRecentOrders(5),
        ]);

        if (statsResponse.data) {
          setStats(statsResponse.data);
        }

        if (ordersResponse.data) {
          setRecentOrders(ordersResponse.data);
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        showToast("ダッシュボードデータの読み込みに失敗しました", "error");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [showToast]);

  const formatCurrency = (amount: number) => {
    return `¥${Math.round(amount).toLocaleString()}`;
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: "保留中",
      processing: "処理中",
      shipped: "発送済み",
      delivered: "配送済み",
      cancelled: "キャンセル",
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colorMap[status] || "bg-gray-100 text-gray-800";
  };

  const dashboardStats = stats
    ? [
        {
          name: "総売上",
          value: formatCurrency(stats.totalSales),
          change: formatChange(stats.salesChange),
          changeType: stats.salesChange >= 0 ? "positive" : "negative",
          icon: DollarSign,
          color: "text-green-600",
        },
        {
          name: "総注文数",
          value: stats.totalOrders.toLocaleString(),
          change: formatChange(stats.ordersChange),
          changeType: stats.ordersChange >= 0 ? "positive" : "negative",
          icon: ShoppingCart,
          color: "text-blue-600",
        },
        {
          name: "総商品数",
          value: stats.totalProducts.toLocaleString(),
          change: formatChange(stats.productsChange),
          changeType: stats.productsChange >= 0 ? "positive" : "negative",
          icon: Package,
          color: "text-purple-600",
        },
        {
          name: "総顧客数",
          value: stats.totalCustomers.toLocaleString(),
          change: formatChange(stats.customersChange),
          changeType: stats.customersChange >= 0 ? "positive" : "negative",
          icon: Users,
          color: "text-[#e2603f]",
        },
      ]
    : [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumbs homePath="/admin" items={[{ label: "ダッシュボード" }]} />
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            ダッシュボード
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            おかえりなさい、{user?.username}さん！
          </p>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white shadow p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashboardStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.name} className="bg-white shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 bg-gray-100`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <span
                      className={`text-sm font-medium flex items-center ${
                        stat.changeType === "positive"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {stat.changeType === "positive" ? (
                        <TrendingUp className="w-4 h-4 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 mr-1" />
                      )}
                      {stat.change}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.name}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Information */}
          <div className="bg-white  shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              ユーザー情報
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  ユーザー名
                </dt>
                <dd className="text-sm text-gray-900 mt-1">{user?.username}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  メールアドレス
                </dt>
                <dd className="text-sm text-gray-900 mt-1">{user?.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">ロール</dt>
                <dd className="text-sm text-gray-900 mt-1 capitalize">
                  {user?.role}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  ユーザーID
                </dt>
                <dd className="text-sm text-gray-900 mt-1">{user?.id}</dd>
              </div>
              {user?.createdAt && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">登録日</dt>
                  <dd className="text-sm text-gray-900 mt-1">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Recent Orders */}
          <div className="bg-white shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              最近の注文
            </h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>注文がありません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {order.orderNumber}
                      </p>
                      <p className="text-xs text-gray-500">{order.customer}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(order.createdAt).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(order.amount)}
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
