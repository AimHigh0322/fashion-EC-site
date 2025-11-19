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

export const Dashboard = () => {
  const { user } = useAuth();

  const stats = [
    {
      name: "総売上",
      value: "¥12,345,678",
      change: "+12.5%",
      changeType: "positive",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      name: "総注文数",
      value: "1,234",
      change: "+8.2%",
      changeType: "positive",
      icon: ShoppingCart,
      color: "text-blue-600",
    },
    {
      name: "総商品数",
      value: "456",
      change: "+5.1%",
      changeType: "positive",
      icon: Package,
      color: "text-purple-600",
    },
    {
      name: "総顧客数",
      value: "5,678",
      change: "+15.3%",
      changeType: "positive",
      icon: Users,
      color: "text-[#e2603f]",
    },
  ];

  const recentOrders = [
    { id: "ORD-001", customer: "田中太郎", amount: 19800, status: "pending" },
    { id: "ORD-002", customer: "佐藤花子", amount: 5980, status: "processing" },
    { id: "ORD-003", customer: "鈴木一郎", amount: 3980, status: "shipped" },
  ];

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.name} className="bg-white  shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 bg-gray-100 `}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <span className="text-sm font-medium text-green-600 flex items-center">
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
          <div className="bg-white  shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              最近の注文
            </h2>
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-gray-50 "
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {order.id}
                    </p>
                    <p className="text-xs text-gray-500">{order.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      ¥{order.amount.toLocaleString()}
                    </p>
                    <span
                      className={`text-xs px-2 py-1  ${
                        order.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : order.status === "processing"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {order.status === "pending"
                        ? "保留中"
                        : order.status === "processing"
                        ? "処理中"
                        : order.status === "shipped"
                        ? "発送済み"
                        : order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
