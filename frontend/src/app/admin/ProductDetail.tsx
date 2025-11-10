import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Edit, Trash2, ChevronRight, ArrowLeft, X, ZoomIn, LayoutDashboard, Package } from "lucide-react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { apiService } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { ConfirmModal } from "../../components/molecules/modals/ConfirmModal";
import { AddProductModal } from "../../components/modals/AddProductModal";

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  compare_price?: number;
  cost_price?: number;
  stock_quantity: number;
  status: string;
  main_image_url?: string;
  product_url?: string;
  weight?: number;
  dimensions?: string;
  brand_name?: string;
  brand_id?: string;
  categories?: Array<{ id: string; name: string; is_primary: boolean }>;
  images?: Array<{ id: string; image_url: string; sort_order: number }>;
  attributes?: Array<{
    attribute_name: string;
    value: string;
    attribute_type: string;
  }>;
  campaigns?: Array<{ id: string; name: string }>;
  seo_title?: string;
  seo_description?: string;
  createdAt?: string;
  updatedAt?: string;
  is_featured?: boolean;
  [key: string]: unknown;
}

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const { showToast } = useToast();

  const loadProduct = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await apiService.getProduct(id);
      if (response.data) {
        const productData = Array.isArray(response.data)
          ? response.data[0]
          : (response.data as { data?: Product }).data || response.data;
        setProduct(productData as Product);
      } else {
        showToast("商品が見つかりませんでした", "error");
        navigate("/admin/products");
      }
    } catch {
      showToast("商品の読み込みに失敗しました", "error");
      navigate("/admin/products");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, showToast]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  // Handle ESC key to close image preview
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showImagePreview) {
        setShowImagePreview(false);
      }
    };

    if (showImagePreview) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden"; // Prevent body scroll when modal is open
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [showImagePreview]);

  const handleDelete = async () => {
    if (!id) return;

    setDeleting(true);
    try {
      const response = await apiService.deleteProduct(id);
      if (!response.error) {
        showToast("商品を削除しました", "success");
        navigate("/admin/products");
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
      import.meta.env.VITE_API_URL || "http://localhost:8888/api"
    ).replace(/\/api$/, "");

    const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
    return `${baseUrl}${path}`;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!product) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">商品が見つかりませんでした</div>
        </div>
      </AdminLayout>
    );
  }

  // Get all product images
  const allImages: string[] = [];
  if (product.main_image_url) {
    allImages.push(product.main_image_url);
  }
  if (product.images && product.images.length > 0) {
    product.images.forEach((img) => {
      if (img.image_url && !allImages.includes(img.image_url)) {
        allImages.push(img.image_url);
      }
    });
  }

  const selectedImageUrl = getImageUrl(
    allImages[selectedImageIndex] || allImages[0]
  );
  const primaryCategory =
    product.categories?.find((c) => c.is_primary) || product.categories?.[0];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600">
          <Link to="/admin" className="hover:text-gray-900 flex items-center space-x-1">
            <LayoutDashboard className="w-4 h-4" />
            <span>ダッシュボード</span>
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Link to="/admin/products" className="hover:text-gray-900 flex items-center space-x-1">
            <Package className="w-4 h-4" />
            <span>商品管理</span>
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-medium flex items-center space-x-1">
            <Package className="w-4 h-4" />
            <span>商品編集</span>
          </span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              商品詳細
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              作成日 {formatDate(product.createdAt)}
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/products")}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>戻る</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column - Images */}
          <div className="sticky top-6">
            {/* Main Image Display */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 mb-4">
              <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative group cursor-zoom-in">
                {selectedImageUrl ? (
                  <>
                    <img
                      src={selectedImageUrl}
                      alt={product.name}
                      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      onClick={() => setShowImagePreview(true)}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af"%3E画像なし%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    {/* Zoom Icon Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
                        <ZoomIn className="w-6 h-6 text-gray-700" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-gray-400 text-lg">画像なし</div>
                )}
                {/* Image Counter Badge */}
                {allImages.length > 1 && (
                  <div className="absolute top-4 right-4 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm z-10">
                    {selectedImageIndex + 1} / {allImages.length}
                  </div>
                )}
              </div>
            </div>

            {/* Thumbnail Gallery */}
            {allImages.length > 1 && (
              <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {allImages.map((imageUrl, index) => {
                    const thumbUrl = getImageUrl(imageUrl);
                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
                          selectedImageIndex === index
                            ? "border-blue-500 ring-4 ring-blue-100 scale-105 shadow-md"
                            : "border-gray-200 hover:border-gray-400 hover:shadow-sm"
                        }`}
                      >
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={`${product.name} - Image ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <span className="text-xs text-gray-400">画像</span>
                          </div>
                        )}
                        {/* Selected Indicator */}
                        {selectedImageIndex === index && (
                          <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Details */}
          <div className="space-y-5">
            {/* Product Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">
                  商品情報
                </h2>
              </div>
              <div className="p-6 space-y-5">
                {/* Product Name & ID */}
                <div className="pb-4 border-b border-gray-100">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {product.sku || product.id}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700">
                    {product.name}
                  </h3>
                  {primaryCategory && (
                    <p className="text-sm text-gray-500 mt-1">
                      {primaryCategory.name}
                    </p>
                  )}
                </div>

                {/* Information Grid */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between py-2 border-b border-gray-50">
                    <span className="text-sm font-medium text-gray-500">
                      SKU
                    </span>
                    <span className="text-sm font-semibold text-gray-900 text-right">
                      {product.sku}
                    </span>
                  </div>

                  {product.brand_name && (
                    <div className="flex items-start justify-between py-2 border-b border-gray-50">
                      <span className="text-sm font-medium text-gray-500">
                        ブランド
                      </span>
                      <span className="text-sm font-semibold text-gray-900 text-right">
                        {product.brand_name}
                      </span>
                    </div>
                  )}

                  {product.categories && product.categories.length > 0 && (
                    <div className="flex items-start justify-between py-2 border-b border-gray-50">
                      <span className="text-sm font-medium text-gray-500">
                        カテゴリ
                      </span>
                      <div className="flex flex-wrap gap-2 justify-end">
                        {product.categories.map((cat) => (
                          <span
                            key={cat.id}
                            className={`px-3 py-1 rounded-md text-xs font-medium ${
                              cat.is_primary
                                ? "bg-blue-500 text-white"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {cat.name}
                            {cat.is_primary && " (主)"}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {product.product_url && (
                    <div className="flex items-start justify-between py-2 border-b border-gray-50">
                      <span className="text-sm font-medium text-gray-500">
                        商品URL
                      </span>
                      <a
                        href={product.product_url as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline text-right max-w-xs truncate"
                      >
                        {product.product_url as string}
                      </a>
                    </div>
                  )}

                  <div className="flex items-start justify-between py-2 border-b border-gray-50">
                    <span className="text-sm font-medium text-gray-500">
                      作成日
                    </span>
                    <span className="text-sm font-semibold text-gray-900 text-right">
                      {formatDate(product.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-start justify-between py-2 border-b border-gray-50">
                    <span className="text-sm font-medium text-gray-500">
                      最終更新
                    </span>
                    <span className="text-sm font-semibold text-gray-900 text-right">
                      {formatDate(product.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-start justify-between py-2">
                    <span className="text-sm font-medium text-gray-500">
                      評価
                    </span>
                    <span className="text-sm font-semibold text-gray-900 text-right">
                      ★0.0 (0件のレビュー)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">
                  価格情報
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between py-3 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">
                    販売価格
                  </span>
                  <p className="text-2xl font-bold text-gray-900">
                    ¥
                    {typeof product.price === "number"
                      ? product.price.toLocaleString()
                      : parseFloat(String(product.price || 0)).toLocaleString()}
                  </p>
                </div>
                {product.compare_price && (
                  <div className="flex items-start justify-between py-3 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-500">
                      比較価格
                    </span>
                    <p className="text-lg font-medium text-gray-400 line-through">
                      ¥
                      {typeof product.compare_price === "number"
                        ? product.compare_price.toLocaleString()
                        : parseFloat(
                            String(product.compare_price)
                          ).toLocaleString()}
                    </p>
                  </div>
                )}
                {product.cost_price && (
                  <div className="flex items-start justify-between py-3">
                    <span className="text-sm font-medium text-gray-500">
                      原価
                    </span>
                    <p className="text-lg font-semibold text-gray-700">
                      ¥
                      {typeof product.cost_price === "number"
                        ? product.cost_price.toLocaleString()
                        : parseFloat(
                            String(product.cost_price)
                          ).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Inventory */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">
                  在庫
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="pb-4 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
                    在庫数量
                  </span>
                  <p className="text-4xl font-bold text-blue-600">
                    {product.stock_quantity || 0}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start justify-between py-2 border-b border-gray-50">
                    <span className="text-sm font-medium text-gray-500">
                      重量
                    </span>
                    <span className="text-sm font-semibold text-gray-900 text-right">
                      {product.weight ? `${product.weight} kg` : "-"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between py-2">
                    <span className="text-sm font-medium text-gray-500">
                      寸法
                    </span>
                    <span className="text-sm font-semibold text-gray-900 text-right">
                      {product.dimensions || "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Attributes */}
            {product.attributes && product.attributes.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">
                    属性
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {product.attributes.map((attr, index) => (
                      <div
                        key={index}
                        className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0"
                      >
                        <span className="text-sm font-medium text-gray-500">
                          {attr.attribute_name}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 text-right">
                          {attr.value || "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Campaigns */}
            {product.campaigns && product.campaigns.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">
                    キャンペーン
                  </h2>
                </div>
                <div className="p-6">
                  <div className="flex flex-wrap gap-2">
                    {product.campaigns.map((campaign) => (
                      <span
                        key={campaign.id}
                        className="px-3 py-1.5 bg-purple-500 text-white rounded-md text-sm font-medium"
                      >
                        {campaign.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SEO Information */}
            {(product.seo_title || product.seo_description) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">
                    SEO情報
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  {product.seo_title && (
                    <div className="flex items-start justify-between py-2 border-b border-gray-50">
                      <span className="text-sm font-medium text-gray-500">
                        SEOタイトル
                      </span>
                      <p className="text-sm font-semibold text-gray-900 text-right max-w-xs">
                        {product.seo_title}
                      </p>
                    </div>
                  )}
                  {product.seo_description && (
                    <div className="flex items-start justify-between py-2">
                      <span className="text-sm font-medium text-gray-500">
                        SEO説明
                      </span>
                      <p className="text-sm text-gray-700 text-right max-w-xs">
                        {product.seo_description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowEditModal(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium cursor-pointer"
              >
                <Edit className="w-5 h-5" />
                商品を編集
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium cursor-pointer"
              >
                <Trash2 className="w-5 h-5" />
                商品を削除
              </button>
            </div>

            {/* Description */}
            {product.description && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">
                    商品説明
                  </h2>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {product.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Image Preview Modal */}
        {showImagePreview && selectedImageUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowImagePreview(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {product.name}
                  </h3>
                  {allImages.length > 1 && (
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {selectedImageIndex + 1} / {allImages.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowImagePreview(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  aria-label="Close preview"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Image Container */}
              <div className="relative flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-8 min-h-[500px]">
                <img
                  src={selectedImageUrl}
                  alt={product.name}
                  className="max-w-full max-h-[calc(95vh-200px)] object-contain rounded-lg shadow-lg"
                />

                {/* Navigation Arrows */}
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedImageIndex(
                          selectedImageIndex > 0
                            ? selectedImageIndex - 1
                            : allImages.length - 1
                        );
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-50 shadow-lg border border-gray-200 text-gray-700 rounded-full p-3 transition-all hover:scale-110 cursor-pointer"
                      aria-label="Previous image"
                    >
                      <ChevronRight className="w-6 h-6 rotate-180" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedImageIndex(
                          selectedImageIndex < allImages.length - 1
                            ? selectedImageIndex + 1
                            : 0
                        );
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-50 shadow-lg border border-gray-200 text-gray-700 rounded-full p-3 transition-all hover:scale-110 cursor-pointer"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail Strip */}
              {allImages.length > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-white">
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                    {allImages.map((imageUrl, index) => {
                      const thumbUrl = getImageUrl(imageUrl);
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                            selectedImageIndex === index
                              ? "border-blue-500 ring-2 ring-blue-200 scale-105"
                              : "border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={`${product.name} - Image ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <span className="text-xs text-gray-400">
                                画像
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">SKU:</span> {product.sku}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowImagePreview(false)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && product && (
          <AddProductModal
            product={product}
            onClose={() => setShowEditModal(false)}
            onSave={() => {
              setShowEditModal(false);
              loadProduct();
            }}
          />
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            if (!deleting) {
              setShowDeleteConfirm(false);
            }
          }}
          onConfirm={handleDelete}
          title="商品の削除"
          message="この商品を削除してもよろしいですか？この操作は取り消せません。"
          confirmText="削除"
          cancelText="キャンセル"
          confirmButtonColor="red"
          loading={deleting}
        />
      </div>
    </AdminLayout>
  );
};
