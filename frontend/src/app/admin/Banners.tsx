import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Trash2, Plus, ChevronRight, Home, Edit } from "lucide-react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { apiService } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { ConfirmModal } from "../../components/molecules/modals/ConfirmModal";
import { Pagination } from "../../components/atom/Pagination";

interface Banner {
  id: string;
  title: string;
  title_color?: string;
  description?: string;
  description_color?: string;
  image_url: string;
  page_url?: string;
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
  // Legacy fields for backward compatibility
  name?: string;
  link_url?: string;
  is_active?: boolean;
  [key: string]: unknown;
}

export const Banners = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 6;
  const { showToast } = useToast();

  const loadBanners = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const response = await apiService.getBanners({
        limit: itemsPerPage,
        offset: offset,
      });

      if (response.data) {
        let bannersData: Banner[] = [];
        let total = 0;

        if (Array.isArray(response.data)) {
          bannersData = response.data;
        } else {
          const responseObj = response.data as {
            success?: boolean;
            data?: Banner[];
            banners?: Banner[];
            total?: number;
            count?: number;
          };

          if (Array.isArray(responseObj.data)) {
            bannersData = responseObj.data;
          } else if (Array.isArray(responseObj.banners)) {
            bannersData = responseObj.banners;
          }

          total = responseObj.total || 0;
        }

        // Filter by search term if provided
        if (searchTerm) {
          bannersData = bannersData.filter(
            (banner) =>
              (banner.title || banner.name || "")
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              (banner.description &&
                banner.description
                  .toLowerCase()
                  .includes(searchTerm.toLowerCase()))
          );
        }

        setBanners(bannersData);
        setTotalItems(total > 0 ? total : bannersData.length);
      }
    } catch {
      showToast("バナーの読み込みに失敗しました", "error");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, currentPage, itemsPerPage, showToast]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  const handleDeleteClick = (id: string) => {
    setBannerToDelete(id);
    setDeleting(false);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!bannerToDelete) return;

    setDeleting(true);
    try {
      const response = await apiService.deleteBanner(bannerToDelete);
      if (!response.error) {
        showToast("バナーを削除しました", "success");
        setShowDeleteConfirm(false);
        setBannerToDelete(null);
        setDeleting(false);
        loadBanners();
      } else {
        showToast(response.error, "error");
        setDeleting(false);
      }
    } catch {
      showToast("削除に失敗しました", "error");
      setDeleting(false);
    }
  };

  const getImageUrl = (imagePath: string | undefined) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;

    const baseUrl = (
      import.meta.env.VITE_API_URL || "http://localhost:4000/api"
    ).replace(/\/api$/, "");

    const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
    return `${baseUrl}${path}`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600">
          <Link
            to="/admin"
            className="hover:text-purple-600 flex items-center space-x-1"
          >
            <Home className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-pink-600 font-medium">Promotions</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              バナー管理
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              バナーの登録・編集・管理
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate("/admin/banners/create")}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>バナー作成</span>
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="バナー名・説明で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Banners Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">読み込み中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      画像
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      タイトル
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      説明
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ページURL
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ステータス
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      作成日
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {banners.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        バナーがありません
                      </td>
                    </tr>
                  ) : (
                    banners.map((banner) => {
                      const imageUrl = getImageUrl(banner.image_url);
                      return (
                        <tr
                          key={banner.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-2 sm:px-4 py-2 sm:py-4 whitespace-nowrap">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={banner.name || banner.title || "Banner"}
                                className="min-w-10 min-h-6 sm:min-w-12 sm:min-h-8 md:min-w-16 md:min-h-10 object-cover rounded border border-gray-200"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src =
                                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="48"%3E%3Crect width="64" height="48" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="8"%3E画像なし%3C/text%3E%3C/svg%3E';
                                }}
                              />
                            ) : (
                              <div className="min-w-10 min-h-6 sm:min-w-12 sm:min-h-8 md:min-w-16 md:min-h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                                <span className="text-[8px] sm:text-[10px] text-gray-400">
                                  画像なし
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {banner.title || banner.name || "-"}
                              {banner.title_color && (
                                <span className="ml-2 text-xs font-normal text-gray-500">
                                  ({banner.title_color})
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div
                              className="text-sm text-gray-500 truncate max-w-xs"
                              title={banner.description || ""}
                            >
                              {banner.description || "-"}
                              {banner.description &&
                                banner.description_color && (
                                  <span className="ml-2 text-xs font-normal text-gray-400">
                                    ({banner.description_color})
                                  </span>
                                )}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div
                              className="text-sm text-gray-900 truncate max-w-xs"
                              title={
                                ((banner.page_url ||
                                  banner.link_url) as string) || ""
                              }
                            >
                              {banner.page_url || banner.link_url ? (
                                <a
                                  href={
                                    (banner.page_url ||
                                      banner.link_url) as string
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {banner.page_url || banner.link_url}
                                </a>
                              ) : (
                                "-"
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                banner.status === "active" || banner.is_active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {banner.status === "active" || banner.is_active
                                ? "有効"
                                : "無効"}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {banner.createdAt
                                ? new Date(banner.createdAt).toLocaleDateString(
                                    "ja-JP"
                                  )
                                : "-"}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() =>
                                  navigate(`/admin/banners/edit/${banner.id}`)
                                }
                                className="text-blue-600 hover:text-blue-900 p-1"
                                title="編集"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(banner.id)}
                                className="text-red-600 hover:text-red-900 p-1"
                                title="削除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
          {!loading &&
            totalItems > itemsPerPage &&
            Math.ceil(totalItems / itemsPerPage) > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalItems / itemsPerPage)}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            )}
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            if (!deleting) {
              setShowDeleteConfirm(false);
              setBannerToDelete(null);
              setDeleting(false);
            }
          }}
          onConfirm={handleDeleteConfirm}
          title="バナーの削除"
          message="このバナーを削除してもよろしいですか？この操作は取り消せません。"
          confirmText="削除"
          cancelText="キャンセル"
          confirmButtonColor="red"
          loading={deleting}
        />
      </div>
    </AdminLayout>
  );
};
