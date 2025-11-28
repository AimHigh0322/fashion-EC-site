import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit, Trash2, Calendar, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { apiService } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { ConfirmModal } from "../../components/molecules/modals/ConfirmModal";
import { Breadcrumbs } from "../../components/molecules/Breadcrumbs";

interface Campaign {
  id: string;
  name: string;
  description?: string;
  label?: string;
  type?: string;
  target_type?: "product" | "category" | "all";
  discount_type?: "percent" | "amount" | "freeShipping" | "points";
  discount_percent?: number;
  discount_value?: number;
  fixed_price?: number;
  minimum_purchase?: number;
  usage_limit?: number;
  user_limit?: number;
  current_usage?: number;
  status?: "active" | "inactive";
  start_date: string;
  end_date: string;
  is_active: boolean;
  target_ids?: string[];
  target_count?: number | string;
  products?: unknown[];
  categories?: unknown[];
  [key: string]: unknown;
}

export const Campaigns = () => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getCampaigns({
        status: statusFilter || undefined,
      });
      if (response.data) {
        let campaignsData: Campaign[] = [];
        if (Array.isArray(response.data)) {
          campaignsData = response.data;
        } else {
          const responseObj = response.data as {
            data?: Campaign[];
            campaigns?: Campaign[];
          };
          if (Array.isArray(responseObj.data)) {
            campaignsData = responseObj.data;
          } else if (Array.isArray(responseObj.campaigns)) {
            campaignsData = responseObj.campaigns;
          }
        }

        // Filter by search term
        if (searchTerm) {
          campaignsData = campaignsData.filter(
            (campaign) =>
              campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (campaign.description &&
                campaign.description
                  .toLowerCase()
                  .includes(searchTerm.toLowerCase()))
          );
        }

        setCampaigns(campaignsData);
      }
    } catch {
      showToast("キャンペーンの読み込みに失敗しました", "error");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, showToast]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleDelete = async (campaignId: string) => {
    setCampaignToDelete(campaignId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!campaignToDelete) return;

    setDeleting(true);
    try {
      const response = await apiService.deleteCampaign(campaignToDelete);
      if (response.error) {
        showToast(response.error, "error");
      } else {
        showToast("キャンペーンを削除しました", "success");
        await loadCampaigns();
      }
    } catch {
      showToast("キャンペーンの削除に失敗しました", "error");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setCampaignToDelete(null);
    }
  };

  const getStatusBadge = (campaign: Campaign) => {
    const now = new Date();
    const startDate = new Date(campaign.start_date);
    const endDate = new Date(campaign.end_date);
    const isActive = campaign.status === "active" && campaign.is_active;

    if (!isActive) {
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
          非アクティブ
        </span>
      );
    }
    if (now < startDate) {
      return (
        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
          開始待ち
        </span>
      );
    }
    if (now > endDate) {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
          終了
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
        アクティブ
      </span>
    );
  };

  const getDiscountDisplay = (campaign: Campaign) => {
    if (campaign.discount_type === "percent") {
      return `${
        campaign.discount_value || campaign.discount_percent || 0
      }% OFF`;
    } else if (campaign.discount_type === "amount") {
      return `¥${(campaign.discount_value || 0).toLocaleString()} OFF`;
    } else if (campaign.discount_type === "freeShipping") {
      return "送料無料";
    } else if (campaign.discount_type === "points") {
      return `+${campaign.discount_value || 0}P`;
    }
    return "割引なし";
  };

  const getTargetDisplay = (campaign: Campaign) => {
    if (campaign.target_type === "all") {
      return "全商品";
    } else if (campaign.target_type === "category") {
      return `カテゴリー (${campaign.target_count || 0}件)`;
    } else {
      return `商品 (${campaign.target_count || campaign.product_count || 0}件)`;
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <Breadcrumbs
          items={[
            { label: "ダッシュボード", path: "/admin" },
            { label: "キャンペーン管理" },
          ]}
        />

        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">キャンペーン管理</h1>
          <button
            onClick={() => navigate("/admin/campaigns/create")}
            className="flex items-center gap-2 px-4 py-2 bg-[#e2603f] text-white  hover:bg-[#c95a42] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            新規キャンペーン
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="キャンペーン名で検索..."
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
            <option value="active">アクティブ</option>
            <option value="inactive">非アクティブ</option>
          </select>
        </div>

        {/* Campaigns List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">読み込み中...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 bg-white  shadow-sm">
            <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">キャンペーンがありません</p>
          </div>
        ) : (
          <div className="bg-white shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    キャンペーン名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    割引
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    対象
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    期間
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    使用状況
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {campaign.name}
                        </div>
                        {campaign.label && (
                          <div className="text-xs text-gray-500">
                            {campaign.label}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 font-medium">
                        {getDiscountDisplay(campaign)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {getTargetDisplay(campaign)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(campaign.start_date).toLocaleDateString(
                            "ja-JP"
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          ～{" "}
                          {new Date(campaign.end_date).toLocaleDateString(
                            "ja-JP"
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(campaign)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {campaign.usage_limit ? (
                          <>
                            {campaign.current_usage || 0} /{" "}
                            {campaign.usage_limit}
                          </>
                        ) : (
                          <span className="text-gray-400">制限なし</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            navigate(`/admin/campaigns/${campaign.id}/edit`)
                          }
                          className="text-indigo-600 hover:text-indigo-900 cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(campaign.id)}
                          className="text-red-600 hover:text-red-900 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setCampaignToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="キャンペーンの削除"
          message="このキャンペーンを削除してもよろしいですか？この操作は取り消せません。"
          confirmText="削除"
          cancelText="キャンセル"
          loading={deleting}
        />
      </div>
    </AdminLayout>
  );
};
