import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Upload,
  Download,
  X,
  ChevronRight,
  Home,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { apiService } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { ConfirmModal } from "../../components/molecules/modals/ConfirmModal";
import { AddProductModal } from "../../components/modals/AddProductModal";
import { Pagination } from "../../components/atom/Pagination";

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  compare_price?: number;
  cost_price?: number;
  stock_quantity: number;
  status: string;
  main_image_url?: string;
  description?: string;
  brand_name?: string;
  brand_id?: string;
  category_count?: number;
  category_names?: string;
  product_url?: string;
  weight?: number;
  dimensions?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export const Products = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showBulkStatus, setShowBulkStatus] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set()
  );
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 6;
  const { showToast } = useToast();

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const response = await apiService.getProducts({
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        limit: itemsPerPage,
        offset: offset,
      });
      if (response.data) {
        // Backend returns: { success: true, data: [...], total: ... }
        // API service wraps it: { data: { success: true, data: [...], total: ... } }
        let productsData: Product[] = [];
        let total = 0;

        if (Array.isArray(response.data)) {
          productsData = response.data;
        } else {
          const responseObj = response.data as {
            success?: boolean;
            data?: Product[];
            products?: Product[];
            total?: number;
            count?: number;
          };

          // Handle nested data structure
          if (Array.isArray(responseObj.data)) {
            productsData = responseObj.data;
          } else if (Array.isArray(responseObj.products)) {
            productsData = responseObj.products;
          }

          total = responseObj.total || 0;
        }

        setProducts(productsData);
        // Don't clear selections when products are reloaded (to maintain cross-page selections)
        // Only clear if filters changed (handled in useEffect)

        // Set total items
        if (total > 0) {
          setTotalItems(total);
        } else {
          // If no total from backend, use actual count of returned products
          // This means we only have one page of data
          setTotalItems(productsData.length);
        }
      }
    } catch {
      showToast("商品の読み込みに失敗しました", "error");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, currentPage, itemsPerPage, showToast]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
    setSelectedProducts(new Set()); // Clear selections when filters change
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Fetch all product IDs that match current filters (for select all across pages)
  const fetchAllProductIds = useCallback(async () => {
    try {
      const response = await apiService.getProducts({
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        // Don't set limit/offset to get all products
      });

      if (response.data) {
        let productsData: Product[] = [];

        if (Array.isArray(response.data)) {
          productsData = response.data;
        } else {
          const responseObj = response.data as {
            data?: Product[];
            products?: Product[];
          };

          if (Array.isArray(responseObj.data)) {
            productsData = responseObj.data;
          } else if (Array.isArray(responseObj.products)) {
            productsData = responseObj.products;
          }
        }

        const ids = new Set(productsData.map((p) => p.id));
        return ids;
      }
      return new Set<string>();
    } catch (error) {
      console.error("Error fetching all product IDs:", error);
      return new Set<string>();
    }
  }, [searchTerm, statusFilter]);

  const handleDeleteClick = (id: string) => {
    setProductToDelete(id);
    setDeleting(false); // Reset deleting state when opening modal
    setShowDeleteConfirm(true);
  };

  const handleSelectProduct = (id: string) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = async (checked: boolean) => {
    if (checked) {
      setIsSelectingAll(true);
      try {
        // Fetch all product IDs that match current filters
        const allIds = await fetchAllProductIds();
        setSelectedProducts(allIds);
        showToast(`${allIds.size}件の商品を選択しました`, "success");
      } catch (error) {
        console.error("Error selecting all products:", error);
        // Fallback to selecting only current page
        setSelectedProducts(new Set(products.map((p) => p.id)));
        showToast(
          "全商品の取得に失敗しました。現在のページのみ選択しました",
          "error"
        );
      } finally {
        setIsSelectingAll(false);
      }
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleDeleteSelected = () => {
    if (selectedProducts.size === 0) return;
    setProductToDelete(null); // Clear single delete
    setDeleting(false);
    setShowDeleteConfirm(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedProducts.size === 0) return;

    setDeleting(true);
    const productIds = Array.from(selectedProducts);
    let successCount = 0;
    let failCount = 0;

    try {
      // Delete products sequentially to avoid overwhelming the server
      for (const id of productIds) {
        try {
          const response = await apiService.deleteProduct(id);
          if (!response.error) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }

      if (successCount > 0) {
        showToast(
          `${successCount}件の商品を削除しました${
            failCount > 0 ? ` (${failCount}件失敗)` : ""
          }`,
          successCount === productIds.length ? "success" : "error"
        );
      } else {
        showToast("削除に失敗しました", "error");
      }

      setShowDeleteConfirm(false);
      setSelectedProducts(new Set());
      setDeleting(false);
      loadProducts();
    } catch {
      showToast("削除に失敗しました", "error");
      setDeleting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    // Check if it's a bulk delete
    if (selectedProducts.size > 0) {
      await handleBulkDeleteConfirm();
      return;
    }

    // Single product delete
    if (!productToDelete) return;

    setDeleting(true);
    try {
      const response = await apiService.deleteProduct(productToDelete);
      if (!response.error) {
        showToast("商品を削除しました", "success");
        setShowDeleteConfirm(false);
        setProductToDelete(null);
        setDeleting(false);
        // Remove from selection if it was selected
        setSelectedProducts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(productToDelete);
          return newSet;
        });
        loadProducts();
      } else {
        showToast(response.error, "error");
        setDeleting(false);
      }
    } catch {
      showToast("削除に失敗しました", "error");
      setDeleting(false);
    }
  };

  const handleBulkUpload = async (file: File) => {
    try {
      const response = await apiService.bulkUploadProducts(file);
      if (!response.error) {
        showToast("一括アップロードが完了しました", "success");
        setShowBulkUpload(false);
        loadProducts();
      } else {
        showToast(response.error, "error");
      }
    } catch {
      showToast("アップロードに失敗しました", "error");
    }
  };

  const handleBulkStatusUpdate = async (file: File) => {
    try {
      const response = await apiService.bulkUpdateStatus(file);
      if (!response.error) {
        showToast("ステータス一括更新が完了しました", "success");
        setShowBulkStatus(false);
        loadProducts();
      } else {
        showToast(response.error, "error");
      }
    } catch {
      showToast("更新に失敗しました", "error");
    }
  };

  const handleExport = async () => {
    try {
      const response = await apiService.exportProducts();
      if (response.error) {
        showToast(response.error, "error");
      } else {
        showToast("エクスポートが完了しました", "success");
      }
    } catch (error) {
      console.error("Export error:", error);
      showToast("エクスポートに失敗しました", "error");
    }
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
            <span>ダッシュボード</span>
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-pink-600 font-medium">商品管理</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              商品管理
            </h1>
            <p className="text-sm text-gray-600 mt-1">商品の登録・編集・管理</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedProducts.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Trash2 className="w-5 h-5" />
                <span>選択した商品を削除 ({selectedProducts.size})</span>
              </button>
            )}
            <button
              onClick={() => setShowBulkUpload(true)}
              className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Upload className="w-5 h-5" />
              <span>CSV一括登録</span>
            </button>
            <button
              onClick={() => setShowBulkStatus(true)}
              className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Upload className="w-5 h-5" />
              <span>ステータス一括更新</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-5 h-5" />
              <span>CSVエクスポート</span>
            </button>
            <button
              onClick={() => {
                setEditingProduct(null);
                setShowModal(true);
              }}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              <span>商品追加</span>
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
                placeholder="商品名・SKUで検索..."
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
              <option value="active">有効（販売中）</option>
              <option value="out_of_stock">在庫不足</option>
              <option value="inactive">非公開（販売停止）</option>
              <option value="reservation">予約受付中</option>
              <option value="draft">下書き</option>
            </select>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">読み込み中...</div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle sm:px-0">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10 sm:w-12">
                          <input
                            type="checkbox"
                            checked={
                              products.length > 0 &&
                              products.every((p) =>
                                selectedProducts.has(p.id)
                              ) &&
                              selectedProducts.size > 0
                            }
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            disabled={isSelectingAll}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                            title={
                              selectedProducts.size > 0
                                ? `${selectedProducts.size}件選択中`
                                : "すべて選択"
                            }
                          />
                          {isSelectingAll && (
                            <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs text-gray-500">
                              読み込み中...
                            </span>
                          )}
                        </th>
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">
                          画像
                        </th>
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          商品
                        </th>
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                          SKU
                        </th>
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          価格
                        </th>
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">
                          比較価格
                        </th>
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden xl:table-cell">
                          原価
                        </th>
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          在庫
                        </th>
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">
                          カテゴリ
                        </th>
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden xl:table-cell">
                          商品URL
                        </th>
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          ステータス
                        </th>
                        <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden xl:table-cell">
                          作成日
                        </th>
                        <th className="px-2 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map((product) => {
                        // Construct image URL - images are served from /uploads, not /api/uploads
                        const getImageUrl = (imagePath: string | undefined) => {
                          if (!imagePath) return null;
                          if (imagePath.startsWith("http")) return imagePath;

                          // Remove /api from base URL if present, since static files are served directly
                          const baseUrl = (
                            import.meta.env.VITE_API_URL ||
                            "http://localhost:8888/api"
                          ).replace(/\/api$/, "");

                          // Ensure imagePath starts with /
                          const path = imagePath.startsWith("/")
                            ? imagePath
                            : `/${imagePath}`;
                          return `${baseUrl}${path}`;
                        };

                        const imageUrl = getImageUrl(product.main_image_url);
                        const isSelected = selectedProducts.has(product.id);
                        return (
                          <tr
                            key={product.id}
                            className={`hover:bg-gray-50 ${
                              isSelected ? "bg-blue-50" : ""
                            }`}
                          >
                            <td className="px-2 sm:px-4 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectProduct(product.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-2 sm:px-4 py-4 whitespace-nowrap hidden sm:table-cell">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={product.name}
                                  className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded border border-gray-200"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src =
                                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="10"%3E画像なし%3C/text%3E%3C/svg%3E';
                                  }}
                                />
                              ) : (
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                                  <span className="text-[10px] sm:text-xs text-gray-400">
                                    画像なし
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-2 sm:px-4 py-4">
                              <div>
                                <div className="text-xs sm:text-sm font-medium text-gray-900">
                                  {product.name}
                                </div>
                                {product.description && (
                                  <div
                                    className="text-[10px] sm:text-xs text-gray-500 truncate max-w-xs"
                                    title={product.description}
                                  >
                                    {product.description}
                                  </div>
                                )}
                                <div className="md:hidden mt-1">
                                  <span className="text-[10px] text-gray-500">
                                    SKU: {product.sku}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-4 whitespace-nowrap hidden md:table-cell">
                              <div className="text-xs sm:text-sm text-gray-900">
                                {product.sku}
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-4 whitespace-nowrap">
                              <div className="text-xs sm:text-sm font-medium text-gray-900">
                                ¥
                                {typeof product.price === "number"
                                  ? product.price.toLocaleString()
                                  : parseFloat(
                                      String(product.price || 0)
                                    ).toLocaleString()}
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-4 whitespace-nowrap hidden lg:table-cell">
                              <div className="text-xs sm:text-sm text-gray-500">
                                {product.compare_price
                                  ? `¥${
                                      typeof product.compare_price === "number"
                                        ? product.compare_price.toLocaleString()
                                        : parseFloat(
                                            String(product.compare_price)
                                          ).toLocaleString()
                                    }`
                                  : "-"}
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-4 whitespace-nowrap hidden xl:table-cell">
                              <div className="text-xs sm:text-sm text-gray-500">
                                {product.cost_price
                                  ? `¥${
                                      typeof product.cost_price === "number"
                                        ? product.cost_price.toLocaleString()
                                        : parseFloat(
                                            String(product.cost_price)
                                          ).toLocaleString()
                                    }`
                                  : "-"}
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-4 whitespace-nowrap">
                              <div className="text-xs sm:text-sm text-gray-900">
                                {product.stock_quantity || 0}
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-4 whitespace-nowrap hidden lg:table-cell">
                              <div className="text-xs sm:text-sm text-gray-900">
                                {product.category_names ? (
                                  <span
                                    className="truncate max-w-xs block"
                                    title={product.category_names}
                                  >
                                    {product.category_names}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-4 whitespace-nowrap hidden xl:table-cell">
                              <div
                                className="text-xs sm:text-sm text-gray-900 truncate max-w-xs"
                                title={(product.product_url as string) || ""}
                              >
                                {product.product_url ? (
                                  <a
                                    href={product.product_url as string}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    {product.product_url as string}
                                  </a>
                                ) : (
                                  "-"
                                )}
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-4 whitespace-nowrap">
                              <span
                                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${
                                  product.status === "active"
                                    ? "bg-green-100 text-green-800"
                                    : product.status === "out_of_stock"
                                    ? "bg-red-100 text-red-800"
                                    : product.status === "reservation"
                                    ? "bg-blue-100 text-blue-800"
                                    : product.status === "inactive"
                                    ? "bg-gray-100 text-gray-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {product.status === "active"
                                  ? "有効"
                                  : product.status === "out_of_stock"
                                  ? "在庫不足"
                                  : product.status === "inactive"
                                  ? "非公開"
                                  : product.status === "reservation"
                                  ? "予約"
                                  : "下書き"}
                              </span>
                            </td>
                            <td className="px-2 sm:px-4 py-4 whitespace-nowrap hidden xl:table-cell">
                              <div className="text-xs sm:text-sm text-gray-500">
                                {product.createdAt
                                  ? new Date(
                                      product.createdAt
                                    ).toLocaleDateString("ja-JP")
                                  : "-"}
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                              <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                                <button
                                  onClick={() => {
                                    navigate(`/admin/products/${product.id}`);
                                  }}
                                  className="text-gray-600 hover:text-gray-900 p-1"
                                >
                                  <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(product.id)}
                                  className="text-red-600 hover:text-red-900 p-1"
                                >
                                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
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

        {/* Product Modal */}
        {showModal && (
          <AddProductModal
            product={editingProduct}
            onClose={() => {
              setShowModal(false);
              setEditingProduct(null);
            }}
            onSave={() => {
              setShowModal(false);
              setEditingProduct(null);
              loadProducts();
            }}
          />
        )}

        {/* Bulk Upload Modal */}
        {showBulkUpload && (
          <BulkUploadModal
            onClose={() => setShowBulkUpload(false)}
            onUpload={handleBulkUpload}
            title="CSV一括登録"
          />
        )}

        {/* Bulk Status Update Modal */}
        {showBulkStatus && (
          <BulkUploadModal
            onClose={() => setShowBulkStatus(false)}
            onUpload={handleBulkStatusUpdate}
            title="ステータス一括更新"
          />
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            if (!deleting) {
              setShowDeleteConfirm(false);
              setProductToDelete(null);
              setDeleting(false); // Reset deleting state when closing modal
            }
          }}
          onConfirm={handleDeleteConfirm}
          title="商品の削除"
          message={
            selectedProducts.size > 0
              ? `選択した${selectedProducts.size}件の商品を削除してもよろしいですか？この操作は取り消せません。`
              : "この商品を削除してもよろしいですか？この操作は取り消せません。"
          }
          confirmText="削除"
          cancelText="キャンセル"
          confirmButtonColor="red"
          loading={deleting}
        />
      </div>
    </AdminLayout>
  );
};

interface BulkUploadModalProps {
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  title: string;
}

// Bulk Upload Modal
const BulkUploadModal = ({
  onClose,
  onUpload,
  title,
}: BulkUploadModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    await onUpload(file);
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSVファイル
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? "アップロード中..." : "アップロード"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
