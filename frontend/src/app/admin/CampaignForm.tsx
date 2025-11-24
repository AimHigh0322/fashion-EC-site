import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { apiService } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { Breadcrumbs } from "../../components/molecules/Breadcrumbs";

interface Campaign {
  id: string;
  name: string;
  description?: string;
  label?: string;
  target_type?: "product" | "category" | "all";
  discount_type?: "percent" | "amount" | "freeShipping" | "points";
  discount_value?: number;
  minimum_purchase?: number;
  usage_limit?: number;
  user_limit?: number;
  status?: "active" | "inactive";
  start_date: string;
  end_date: string;
}

export const CampaignForm = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    label: "",
    target_type: "all" as "product" | "category" | "all",
    discount_type: "percent" as "percent" | "amount" | "freeShipping" | "points",
    discount_value: 0,
    minimum_purchase: 0,
    usage_limit: "",
    user_limit: "",
    start_date: "",
    end_date: "",
    status: "active" as "active" | "inactive",
  });

  useEffect(() => {
    if (isEdit && id) {
      const loadCampaign = async () => {
        setLoading(true);
        try {
          const response = await apiService.getCampaigns();
          if (response.data && Array.isArray(response.data)) {
            const campaign = response.data.find((c: Campaign) => c.id === id);
            if (campaign) {
              setFormData({
                name: campaign.name || "",
                description: campaign.description || "",
                label: campaign.label || "",
                target_type: campaign.target_type || "all",
                discount_type: campaign.discount_type || "percent",
                discount_value: campaign.discount_value || 0,
                minimum_purchase: campaign.minimum_purchase || 0,
                usage_limit: campaign.usage_limit?.toString() || "",
                user_limit: campaign.user_limit?.toString() || "",
                start_date: campaign.start_date ? new Date(campaign.start_date).toISOString().slice(0, 16) : "",
                end_date: campaign.end_date ? new Date(campaign.end_date).toISOString().slice(0, 16) : "",
                status: campaign.status || "active",
              });
            }
          }
        } catch (error) {
          console.error("Failed to load campaign:", error);
          showToast("キャンペーンの読み込みに失敗しました", "error");
        } finally {
          setLoading(false);
        }
      };
      loadCampaign();
    }
  }, [isEdit, id, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const campaignData = {
        ...formData,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        user_limit: formData.user_limit ? parseInt(formData.user_limit) : null,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
      };

      if (isEdit && id) {
        const response = await apiService.updateCampaign(id, campaignData);
        if (response.error) {
          showToast(response.error, "error");
        } else {
          showToast("キャンペーンを更新しました", "success");
          navigate("/admin/campaigns");
        }
      } else {
        const response = await apiService.createCampaign(campaignData);
        if (response.error) {
          showToast(response.error, "error");
        } else {
          showToast("キャンペーンを作成しました", "success");
          navigate("/admin/campaigns");
        }
      }
    } catch (error) {
      showToast("キャンペーンの保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">読み込み中...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <Breadcrumbs
          items={[
            { label: "ダッシュボード", path: "/admin" },
            { label: "キャンペーン管理", path: "/admin/campaigns" },
            { label: isEdit ? "編集" : "新規作成" },
          ]}
        />

        <div className="mb-6">
          <button
            onClick={() => navigate("/admin/campaigns")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            キャンペーン一覧に戻る
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? "キャンペーン編集" : "新規キャンペーン作成"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">基本情報</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                キャンペーン名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ラベル（表示用）
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="例: 20%OFF"
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                説明
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Target Settings */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">対象設定</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                対象タイプ <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.target_type}
                onChange={(e) =>
                  setFormData({ ...formData, target_type: e.target.value as "product" | "category" | "all" })
                }
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="all">全商品</option>
                <option value="product">特定商品</option>
                <option value="category">特定カテゴリー</option>
              </select>
            </div>
          </div>

          {/* Discount Settings */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">割引設定</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                割引タイプ <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.discount_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discount_type: e.target.value as "percent" | "amount" | "freeShipping" | "points",
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="percent">パーセント割引</option>
                <option value="amount">固定額割引</option>
                <option value="freeShipping">送料無料</option>
                <option value="points">ポイント付与</option>
              </select>
            </div>

            {formData.discount_type !== "freeShipping" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  割引値 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder={
                    formData.discount_type === "percent"
                      ? "20 (20%OFF)"
                      : formData.discount_type === "amount"
                      ? "1000 (¥1,000割引)"
                      : "100 (100ポイント)"
                  }
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最小購入金額
              </label>
              <input
                type="number"
                min="0"
                value={formData.minimum_purchase}
                onChange={(e) => setFormData({ ...formData, minimum_purchase: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="0"
              />
            </div>
          </div>

          {/* Date Settings */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">期間設定</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始日時 <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  終了日時 <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Limits */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">制限設定</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  使用回数制限（全体）
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="制限なし（空欄）"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ユーザーごとの使用回数制限
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.user_limit}
                  onChange={(e) => setFormData({ ...formData, user_limit: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="制限なし（空欄）"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "inactive" })}
              className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="active">アクティブ</option>
              <option value="inactive">非アクティブ</option>
            </select>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate("/admin/campaigns")}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#e2603f] text-white rounded-md hover:bg-[#c95a42] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? "保存中..." : isEdit ? "更新" : "作成"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

