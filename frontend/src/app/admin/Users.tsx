import { useState, useEffect, useCallback } from "react";
import { Search, Ban, UserCheck, Trash2, Loader2 } from "lucide-react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { apiService } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { ConfirmModal } from "../../components/molecules/modals/ConfirmModal";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  orders: number;
  createdAt: string;
  updatedAt: string;
}

export const Users = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [userToBlock, setUserToBlock] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;
  const { success, error } = useToast();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const response = await apiService.getUsers({
        search: searchTerm || undefined,
        limit: itemsPerPage,
        offset: offset,
        sortBy: "createdAt",
        sortOrder: "ASC",
      });

      if (response.error) {
        error(response.error);
        return;
      }

      if (response.data) {
        setUsers(response.data.users || []);
        setTotalItems(response.data.total || 0);
      }
    } catch (err) {
      console.error("Error loading users:", err);
      error("ユーザーの読み込み中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, currentPage, error]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleDelete = async (userId: string) => {
    setUserToDelete(userId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    setDeleting(true);
    try {
      const response = await apiService.deleteUser(userToDelete);
      if (response.error) {
        error(response.error);
      } else {
        success("ユーザーが正常に削除されました。");
        loadUsers();
      }
    } catch (err) {
      console.error("Error deleting user:", err);
      error("ユーザーの削除中にエラーが発生しました。");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  const handleBlock = async (userId: string) => {
    setUserToBlock(userId);
    setBlocking(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:8888/api"
        }/users/${userId}/block`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        error(data.error || "ユーザーのブロック中にエラーが発生しました。");
      } else {
        success(data.message || "ユーザーのステータスが更新されました。");
        loadUsers();
      }
    } catch (err) {
      console.error("Error blocking user:", err);
      error("ユーザーのブロック中にエラーが発生しました。");
    } finally {
      setBlocking(false);
      setUserToBlock(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            ユーザー管理
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            ユーザーアカウントと権限の管理
          </p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ユーザーを検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">読み込み中...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              ユーザーが見つかりませんでした。
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle sm:px-0">
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ユーザー
                          </th>
                          <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                            メール
                          </th>
                          <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ロール
                          </th>
                          <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ステータス
                          </th>
                          <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                            注文数
                          </th>
                          <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                            登録日
                          </th>
                          <th className="px-2 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-2 sm:px-4 py-4">
                              <div className="flex items-center space-x-2 sm:space-x-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-blue-600 font-medium text-xs sm:text-sm">
                                    {user.username.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                    {user.username}
                                  </div>
                                  <div className="text-[10px] sm:text-xs text-gray-500 truncate">
                                    {user.email}
                                  </div>
                                  <div className="md:hidden text-[10px] text-gray-400 mt-0.5">
                                    注文: {user.orders}件
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-4 whitespace-nowrap hidden md:table-cell">
                              <div className="text-xs sm:text-sm text-gray-900 truncate max-w-xs">
                                {user.email}
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-4 whitespace-nowrap">
                              <span
                                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-md ${
                                  user.role === "admin"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {user.role === "admin" ? "管理者" : "顧客"}
                              </span>
                            </td>
                            <td className="px-2 sm:px-4 py-4 whitespace-nowrap">
                              <span
                                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-md ${
                                  user.status === "active"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {user.status === "active"
                                  ? "アクティブ"
                                  : "非アクティブ"}
                              </span>
                            </td>
                            <td className="px-2 sm:px-4 py-4 whitespace-nowrap hidden lg:table-cell">
                              <div className="text-xs sm:text-sm text-gray-900">
                                {user.orders}
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-4 whitespace-nowrap hidden xl:table-cell">
                              <div className="text-xs sm:text-sm text-gray-900">
                                {formatDate(user.createdAt)}
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                              <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                                <button
                                  onClick={() => handleBlock(user.id)}
                                  disabled={blocking && userToBlock === user.id}
                                  className={`p-1 ${
                                    user.status === "blocked"
                                      ? "text-green-600 hover:text-green-900"
                                      : "text-[#e2603f] hover:text-[#8a3d2a]"
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                  title={
                                    user.status === "blocked"
                                      ? "アンブロック"
                                      : "ブロック"
                                  }
                                >
                                  {user.status === "blocked" ? (
                                    <UserCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                                  ) : (
                                    <Ban className="w-3 h-3 sm:w-4 sm:h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDelete(user.id)}
                                  className="text-red-600 hover:text-red-900 p-1"
                                  title="削除"
                                >
                                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    {totalItems}件中 {(currentPage - 1) * itemsPerPage + 1}-
                    {Math.min(currentPage * itemsPerPage, totalItems)}件を表示
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      前へ
                    </button>
                    <span className="px-3 py-1 text-sm text-gray-700">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      次へ
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          if (!deleting) {
            setShowDeleteConfirm(false);
            setUserToDelete(null);
          }
        }}
        onConfirm={confirmDelete}
        title="ユーザー削除"
        message={`このユーザーを削除してもよろしいですか？この操作は元に戻せません。`}
        confirmText="削除"
        cancelText="キャンセル"
        confirmButtonColor="red"
        loading={deleting}
      />
    </AdminLayout>
  );
};
