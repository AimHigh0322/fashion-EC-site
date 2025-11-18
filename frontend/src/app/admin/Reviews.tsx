import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import {
  Star,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  Filter,
  Search,
} from "lucide-react";

export function Reviews() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [filter]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (filter !== "all") {
        filters.status = filter;
      }
      const data = await apiService.getAllReviews(filters, 50, 0);
      setReviews(data.reviews || []);
      setTotal(data.total || 0);
    } catch (error: any) {
      showToast(error.message || "レビューの読み込みに失敗しました", "error");
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error: any) {
      showToast(error.message || "レビューの更新に失敗しました", "error");
    }
  };

  const handleOpenReplyModal = (review: any) => {
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
    } catch (error: any) {
      showToast(error.message || "返信の送信に失敗しました", "error");
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

  const filteredReviews = reviews.filter((review) =>
    searchTerm
      ? review.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.comment?.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  const statusTabs = [
    { value: "all", label: "すべて", icon: Filter },
    { value: "pending", label: "審査待ち", icon: Clock },
    { value: "approved", label: "承認済み", icon: CheckCircle },
    { value: "rejected", label: "却下", icon: XCircle },
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e2603f]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          レビュー管理
        </h1>
        <p className="text-gray-600">
          商品レビューの承認・却下・返信を管理
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {statusTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
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
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="商品名、ユーザー名、コメントで検索..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e2603f] focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">全レビュー</p>
              <p className="text-2xl font-bold text-gray-800">{total}</p>
            </div>
            <Filter className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600">審査待ち</p>
              <p className="text-2xl font-bold text-yellow-800">
                {reviews.filter((r) => r.status === "pending").length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">承認済み</p>
              <p className="text-2xl font-bold text-green-800">
                {reviews.filter((r) => r.status === "approved").length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600">却下</p>
              <p className="text-2xl font-bold text-red-800">
                {reviews.filter((r) => r.status === "rejected").length}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
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
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#e2603f] transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {review.product_name}
                    </h3>
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
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>SKU: {review.product_sku}</span>
                    <span>投稿者: {review.username || "匿名"}</span>
                    <span>投稿日: {formatDate(review.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                {renderStars(review.rating)}
                {review.title && (
                  <h4 className="font-medium text-gray-800 mt-2 mb-1">
                    {review.title}
                  </h4>
                )}
                {review.comment && (
                  <p className="text-gray-700">{review.comment}</p>
                )}
              </div>

              {review.admin_reply && (
                <div className="mb-4 p-4 bg-orange-50 border-l-4 border-[#e2603f] rounded">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    ショップからの返信:
                  </p>
                  <p className="text-sm text-gray-600">{review.admin_reply}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    返信日: {formatDate(review.admin_reply_at)}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                {review.status !== "approved" && (
                  <button
                    onClick={() => handleModerateReview(review.id, "approved")}
                    className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    承認
                  </button>
                )}
                {review.status !== "rejected" && (
                  <button
                    onClick={() => handleModerateReview(review.id, "rejected")}
                    className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    却下
                  </button>
                )}
                {review.status === "approved" && (
                  <button
                    onClick={() => handleModerateReview(review.id, "pending")}
                    className="flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    審査待ちに戻す
                  </button>
                )}
                <button
                  onClick={() => handleOpenReplyModal(review)}
                  className="flex items-center px-4 py-2 bg-[#e2603f] hover:bg-[#c95a42] text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {review.admin_reply ? "返信を編集" : "返信する"}
                </button>
                <button
                  onClick={() =>
                    navigate(`/admin/products/${review.product_id}`)
                  }
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                >
                  商品を見る
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              レビューへの返信
            </h3>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
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
              <p className="text-sm text-gray-700">{selectedReview.comment}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                返信内容
              </label>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#e2603f] focus:border-transparent resize-none"
                placeholder="お客様へのメッセージを入力してください..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowReplyModal(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 font-medium rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmitReply}
                disabled={submitting || !reply.trim()}
                className="flex-1 px-4 py-2 bg-[#e2603f] hover:bg-[#c95a42] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {submitting ? "送信中..." : "返信を送信"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

