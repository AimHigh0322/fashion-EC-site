import { useState } from "react";
import { Save, Bell, Globe, Shield } from "lucide-react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { Breadcrumbs } from "../../components/molecules/Breadcrumbs";

export const Settings = () => {
  const [settings, setSettings] = useState({
    siteName: "Fashion EC Site",
    siteEmail: "admin@fashion-ec.com",
    currency: "JPY",
    timezone: "Asia/Tokyo",
    notifications: {
      email: true,
      sms: false,
      push: true,
    },
    security: {
      twoFactor: false,
      sessionTimeout: 30,
    },
  });

  const handleSave = () => {
    // Handle save logic here
    console.log("Settings saved:", settings);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumbs
          homePath="/admin"
          items={[
            { label: "ダッシュボード", path: "/admin" },
            { label: "設定" },
          ]}
        />
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              設定
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              サイト設定と環境設定の管理
            </p>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white  hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Save className="w-5 h-5" />
            <span>変更を保存</span>
          </button>
        </div>

        {/* General Settings */}
        <div className="bg-white  shadow p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Globe className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">一般設定</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                サイト名
              </label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) =>
                  setSettings({ ...settings, siteName: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                サイトメール
              </label>
              <input
                type="email"
                value={settings.siteEmail}
                onChange={(e) =>
                  setSettings({ ...settings, siteEmail: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  通貨
                </label>
                <select
                  value={settings.currency}
                  onChange={(e) =>
                    setSettings({ ...settings, currency: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="JPY">JPY (¥)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  タイムゾーン
                </label>
                <select
                  value={settings.timezone}
                  onChange={(e) =>
                    setSettings({ ...settings, timezone: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white  shadow p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Bell className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">通知設定</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">メール通知</p>
                <p className="text-xs text-gray-500">メールで通知を受信</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.email}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        email: e.target.checked,
                      },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">SMS通知</p>
                <p className="text-xs text-gray-500">SMSで通知を受信</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.sms}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        sms: e.target.checked,
                      },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  プッシュ通知
                </p>
                <p className="text-xs text-gray-500">プッシュ通知を受信</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.push}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        push: e.target.checked,
                      },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white  shadow p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Shield className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              セキュリティ
            </h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">二要素認証</p>
                <p className="text-xs text-gray-500">
                  セキュリティの追加レイヤー
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.security.twoFactor}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        twoFactor: e.target.checked,
                      },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                セッションタイムアウト（分）
              </label>
              <input
                type="number"
                value={settings.security.sessionTimeout}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      sessionTimeout: parseInt(e.target.value),
                    },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
