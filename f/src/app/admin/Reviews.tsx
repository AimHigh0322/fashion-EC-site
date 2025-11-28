import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { Pagination } from "../../components/atom/Pagination";
import {
  Star,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Review {
  id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  user_id: string;
  username?: string;
  order_id: string;
  rating: number;
  title?: string;
  comment?: string;
  status: string;
  admin_reply?: string;
  admin_reply_at?: string;
  createdAt: string;
}

export function Reviews() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(
    new Set()
  );
  const [allReviews, setAllReviews] = useState<Review[]>([]);

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      const filters: { status?: string } = {};
      if (filter !== "all") {
        filters.status = filter;
      }
      // Load a large number of reviews to group by product
      const response = await apiService.getAllReviews(filters, 1000, 0);
      if (response.data) {
        const reviewsData = (response.data.reviews || []) as Review[];
        setAllReviews(reviewsData);
        setTotal(response.data.total || 0);
      } else {
        setAllReviews([]);
        setTotal(0);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "レビューの読み込みに失敗しました";
      showToast(errorMessage, "error");
      setAllReviews([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  const handleModerateReview = async (reviewId: string, status: string) => {
    try {
      await apiService.moderateReview(reviewId, status);
      showToast(
        status === "approved"
          ? "レビューを承認しました"
          : status === "rejected"
          ? "レビューを却下しました"
          : "レビューのステータスを更新しました",
        "success"
      );
      loadReviews();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "レビューの更新に失敗しました";
      showToast(errorMessage, "error");
    }
  };

  const handleOpenReplyModal = (review: Review) => {
    setSelectedReview(review);
    setReply(review.admin_reply || "");
    setShowReplyModal(true);
  };

  const handleSubmitReply = async () => {
    if (!selectedReview || !reply.trim()) {
      showToast("返信内容を入力してください", "error");
      return;
    }

    try {
      setSubmitting(true);
      await apiService.addAdminReplyToReview(selectedReview.id, reply);
      showToast("返信を送信しました", "success");
      setShowReplyModal(false);
      loadReviews();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "返信の送信に失敗しました";
      showToast(errorMessage, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-none stroke-gray-300 text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP");
  };

  // Group reviews by product_id
  const groupedReviews = allReviews.reduce((acc, review) => {
    const productId = review.product_id;
    if (!acc[productId]) {
      acc[productId] = [];
    }
    acc[productId].push(review);
    return acc;
  }, {} as Record<string, Review[]>);

  // Get unique products with their review counts
  const productGroups = Object.entries(groupedReviews).map(
    ([productId, reviews]) => {
      // Sort reviews by createdAt (most recent first)
      const sortedReviews = [...reviews].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return {
        productId,
        productName: sortedReviews[0].product_name || "不明な商品",
        productSku: sortedReviews[0].product_sku || "",
        reviews: sortedReviews,
        reviewCount: sortedReviews.length,
        latestReview: sortedReviews[0], // Most recent review
      };
    }
  );

  // Filter by search term
  const filteredProductGroups = productGroups.filter((group) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      group.productName.toLowerCase().includes(searchLower) ||
      group.productSku.toLowerCase().includes(searchLower) ||
      group.reviews.some(
        (r) =>
          r.username?.toLowerCase().includes(searchLower) ||
          r.comment?.toLowerCase().includes(searchLower)
      )
    );
  });

  // Sort by latest review date (most recent first)
  filteredProductGroups.sort(
    (a, b) =>
      new Date(b.latestReview.createdAt).getTime() -
      new Date(a.latestReview.createdAt).getTime()
  );

  // Paginate unique products
  const totalProducts = filteredProductGroups.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProductGroups = filteredProductGroups.slice(
    startIndex,
    endIndex
  );

  const toggleProductExpansion = (productId: string) => {
    setExpandedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const statusTabs = [
    { value: "all", label: "すべて", icon: Filter },
    { value: "pending", label: "審査待ち", icon: Clock },
    { value: "approved", label: "承認済み", icon: CheckCircle },
    { value: "rejected", label: "却下", icon: XCircle },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e2603f]"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            レビュー管理
          </h1>
          <p className="text-gray-600">商品レビューの承認・却下・返信を管理</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {statusTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`flex items-center px-4 py-2  font-medium transition-colors cursor-pointer ${
                  filter === tab.value
                    ? "bg-[#e2603f] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="商品名、ユーザー名、コメントで検索..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200  p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">全レビュー</p>
                <p className="text-2xl font-bold text-gray-800">{total}</p>
              </div>
              <Filter className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200  p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">審査待ち</p>
                <p className="text-2xl font-bold text-yellow-800">
                  {allReviews.filter((r) => r.status === "pending").length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          <div className="bg-green-50 border border-green-200  p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">承認済み</p>
                <p className="text-2xl font-bold text-green-800">
                  {allReviews.filter((r) => r.status === "approved").length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-red-50 border border-red-200  p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">却下</p>
                <p className="text-2xl font-bold text-red-800">
                  {allReviews.filter((r) => r.status === "rejected").length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {paginatedProductGroups.length === 0 ? (
          <div className="bg-white  shadow-sm p-12 text-center">
            <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              レビューがありません
            </h3>
            <p className="text-gray-500">
              {searchTerm
                ? "検索条件に一致するレビューが見つかりません"
                : "まだレビューが投稿されていません"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedProductGroups.map((group) => {
              const isExpanded = expandedProducts.has(group.productId);
              const reviewsToShow = isExpanded
                ? group.reviews
                : [group.latestReview];

              return (
                <div
                  key={group.productId}
                  className="bg-white border border-gray-200  p-6 hover:border-[#e2603f] transition-colors"
                >
                  {/* Reviews for this product */}
                  <div className="space-y-4">
                    {reviewsToShow.map((review, index) => (
                      <div
                        key={review.id}
                        className={`${
                          index > 0 ? "border-t border-gray-200 pt-4 mt-4" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Left Side - Product and Review Content */}
                          <div className="flex-1">
                            {/* Product Header */}
                            <div className="mb-4">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-800">
                                  {group.productName}
                                </h3>
                                <span className="px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                  {group.reviewCount}件のレビュー
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                <span>SKU: {group.productSku}</span>
                              </div>
                            </div>

                            {/* Reviewer Info */}
                            <div className="mb-3 flex items-center gap-3">
                              <span className="text-sm text-gray-600">
                                投稿者: {review.username || "匿名"}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                                  review.status === "approved"
                                    ? "bg-green-100 text-green-800"
                                    : review.status === "rejected"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {review.status === "approved"
                                  ? "承認済み"
                                  : review.status === "rejected"
                                  ? "却下"
                                  : "審査待ち"}
                              </span>
                            </div>

                            {/* Rating and Comment */}
                            <div className="mb-4">
                              {renderStars(review.rating)}
                              {review.title && (
                                <h4 className="font-medium text-gray-800 mt-2 mb-1">
                                  {review.title}
                                </h4>
                              )}
                              {review.comment && (
                                <p className="text-gray-700">
                                  {review.comment}
                                </p>
                              )}
                            </div>

                            {/* Admin Reply */}
                            {review.admin_reply && (
                              <div className="mb-4 p-4 bg-orange-50 border-l-4 border-[#e2603f] rounded">
                                <p className="text-sm font-medium text-gray-700 mb-1">
                                  ショップからの返信:
                                </p>
                                <p className="text-sm text-gray-600">
                                  {review.admin_reply}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                  返信日:{" "}
                                  {review.admin_reply_at
                                    ? formatDate(review.admin_reply_at)
                                    : ""}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Right Side - Date */}
                          <div className="flex flex-col items-end gap-3">
                            {/* Date */}
                            <span className="text-sm text-gray-600">
                              投稿日: {formatDate(review.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons and See All Link - Bottom Row */}
                        <div className="flex items-center justify-between mt-4">
                          {/* Action Buttons - Left */}
                          <div className="flex flex-row gap-2 flex-wrap">
                            {review.status !== "approved" && (
                              <button
                                onClick={() =>
                                  handleModerateReview(review.id, "approved")
                                }
                                className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium  transition-colors cursor-pointer"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                承認
                              </button>
                            )}
                            {review.status !== "rejected" && (
                              <button
                                onClick={() =>
                                  handleModerateReview(
                                    review.id || "",
                                    "rejected"
                                  )
                                }
                                className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium  transition-colors cursor-pointer"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                却下
                              </button>
                            )}
                            {review.status === "approved" && (
                              <button
                                onClick={() =>
                                  handleModerateReview(
                                    review.id || "",
                                    "pending"
                                  )
                                }
                                className="flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium  transition-colors cursor-pointer"
                              >
                                <Clock className="w-4 h-4 mr-2" />
                                審査待ちに戻す
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenReplyModal(review)}
                              className="flex items-center px-4 py-2 bg-[#e2603f] hover:bg-[#c95a42] text-white text-sm font-medium  transition-colors cursor-pointer"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              {review.admin_reply ? "返信を編集" : "返信する"}
                            </button>
                            <button
                              onClick={() =>
                                navigate(`/admin/products/${review.product_id}`)
                              }
                              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium  transition-colors cursor-pointer"
                            >
                              商品を見る
                            </button>
                          </div>

                          {/* See All Link - Right */}
                          {index === 0 && group.reviewCount > 1 && (
                            <button
                              onClick={() =>
                                toggleProductExpansion(group.productId)
                              }
                              className="flex items-center gap-1 cursor-pointer hover:underline text-[#e2603f] hover:text-[#c95a42] font-medium text-sm"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-4 h-4" />
                                  レビューを折りたたむ
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4" />
                                  すべて表示 ({group.reviewCount}件)
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalProducts > itemsPerPage && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalProducts / itemsPerPage)}
            totalItems={totalProducts}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}

        {/* Reply Modal */}
        {showReplyModal && selectedReview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white shadow-xl max-w-2xl w-full p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                レビューへの返信
              </h3>

              <div className="mb-4 p-4 bg-gray-50 ">
                <div className="flex items-center gap-2 mb-2">
                  {renderStars(selectedReview.rating)}
                  <span className="text-sm text-gray-600">
                    {selectedReview.username || "匿名"}
                  </span>
                </div>
                {selectedReview.title && (
                  <h4 className="font-medium text-gray-800 mb-1">
                    {selectedReview.title}
                  </h4>
                )}
                <p className="text-sm text-gray-700">
                  {selectedReview.comment}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  返信内容
                </label>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  placeholder="お客様へのメッセージを入力してください..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowReplyModal(false)}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 font-medium  transition-colors cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSubmitReply}
                  disabled={submitting || !reply.trim()}
                  className="flex-1 px-4 py-2 bg-[#e2603f] hover:bg-[#c95a42] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium  transition-colors cursor-pointer"
                >
                  {submitting ? "送信中..." : "返信を送信"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
