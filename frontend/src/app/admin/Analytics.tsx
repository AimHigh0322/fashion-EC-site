import { TrendingUp, DollarSign, ShoppingCart, Users } from "lucide-react";
import { AdminLayout } from "../../components/layouts/AdminLayout";

export const Analytics = () => {
  const stats = [
    {
      name: "Total Revenue",
      value: "¥12,345,678",
      change: "+12.5%",
      changeType: "positive",
      icon: DollarSign,
    },
    {
      name: "Total Orders",
      value: "1,234",
      change: "+8.2%",
      changeType: "positive",
      icon: ShoppingCart,
    },
    {
      name: "Total Customers",
      value: "5,678",
      change: "+15.3%",
      changeType: "positive",
      icon: Users,
    },
    {
      name: "Growth Rate",
      value: "18.7%",
      change: "+3.2%",
      changeType: "positive",
      icon: TrendingUp,
    },
  ];

  const recentActivity = [
    { id: 1, action: "New order received", time: "2 minutes ago" },
    { id: 2, action: "Product added", time: "15 minutes ago" },
    { id: 3, action: "User registered", time: "1 hour ago" },
    { id: 4, action: "Order shipped", time: "2 hours ago" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Analytics
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Track your business performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <span
                  className={`text-sm font-medium ${
                    stat.changeType === "positive"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue Overview
          </h2>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-500">Chart will be displayed here</p>
          </div>
        </div>

        {/* Orders Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Orders Overview
          </h2>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-500">Chart will be displayed here</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>
        <div className="space-y-4">
          {recentActivity.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <p className="text-sm text-gray-900">{activity.action}</p>
              <p className="text-xs text-gray-500">{activity.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
    </AdminLayout>
  );
};

