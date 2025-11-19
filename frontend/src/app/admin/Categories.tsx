import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Edit, Trash2, Search, Loader2 } from "lucide-react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { apiService } from "../../services/api";
import { CategoryModal } from "../../components/modals/CategoryModal";
import { ConfirmModal } from "../../components/molecules/modals/ConfirmModal";
import { Breadcrumbs } from "../../components/molecules/Breadcrumbs";

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string;
  level: number;
  [key: string]: unknown;
}

type Gender = "male" | "female" | "all" | null;
type CategoryType =
  | "clothing"
  | "footwear"
  | "bags"
  | "wallets-handbags-accessories"
  | "fashion-accessories"
  | "all"
  | null;

const GENDER_OPTIONS = [
  { value: "male", label: "メンズ", slug: "mens" },
  { value: "female", label: "レディース", slug: "ladies" },
];

const CATEGORY_TYPE_OPTIONS = [
  {
    value: "clothing",
    label: "アパレル",
    slugs: ["tops", "bottoms", "outer", "dresses"],
  },
  { value: "footwear", label: "シューズ", slugs: ["shoes"] },
  { value: "bags", label: "バッグ", slugs: ["bags"] },
  {
    value: "wallets-handbags-accessories",
    label: "財布・ハンドバッグ・アクセサリー",
    slugs: ["wallets", "handbags"],
  },
  {
    value: "fashion-accessories",
    label: "ファッションアクセサリー",
    slugs: ["watches", "jewelry", "accessories"],
  },
];

export const Categories = () => {
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState<Gender>("all");
  const [categoryTypeFilter, setCategoryTypeFilter] =
    useState<CategoryType>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<"major" | "sub">("sub"); // "major" for level 2, "sub" for level 3

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await apiService.getCategories();
      if (response.data) {
        setAllCategories(response.data);
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get category hierarchy info
  const getCategoryInfo = useCallback(
    (category: Category) => {
      const parent = allCategories.find((cat) => cat.id === category.parent_id);
      const grandParent = parent
        ? allCategories.find((cat) => cat.id === parent.parent_id)
        : null;

      // For level 2 categories, parent is the gender category
      if (category.level === 2) {
        return {
          gender: parent
            ? parent.slug === "mens" || parent.name === "メンズ"
              ? "male"
              : parent.slug === "ladies" || parent.name === "レディース"
              ? "female"
              : null
            : null,
          type: null,
          parentName: parent?.name || "",
          grandParentName: "",
        };
      }

      // For level 3 categories
      return {
        gender: grandParent
          ? grandParent.slug === "mens" || grandParent.name === "メンズ"
            ? "male"
            : grandParent.slug === "ladies" || grandParent.name === "レディース"
            ? "female"
            : null
          : null,
        type: parent
          ? (() => {
              // First, try to match by parent name
              const matchedByName = CATEGORY_TYPE_OPTIONS.find(
                (opt) => opt.label === parent.name
              );
              if (matchedByName) {
                return matchedByName.value;
              }

              // Then, try to match by slug (remove gender prefix if present)
              const parentSlug = parent.slug.toLowerCase();
              const slugWithoutGender = parentSlug
                .replace(/^(mens|ladies)-/, "")
                .toLowerCase();

              const matchedBySlug = CATEGORY_TYPE_OPTIONS.find((opt) =>
                opt.slugs.some(
                  (slug) =>
                    parentSlug.includes(slug) ||
                    slugWithoutGender.includes(slug) ||
                    slugWithoutGender === slug
                )
              );

              if (matchedBySlug) {
                return matchedBySlug.value;
              }

              // Also check if slug contains common category type keywords
              // Map common slug patterns to category types
              const slugToTypeMap: Record<string, string> = {
                apparel: "clothing",
                clothing: "clothing",
                shoes: "footwear",
                footwear: "footwear",
                bags: "bags",
                bag: "bags",
                wallets: "wallets-handbags-accessories",
                handbags: "wallets-handbags-accessories",
                accessories: "fashion-accessories",
                watches: "fashion-accessories",
                jewelry: "fashion-accessories",
              };

              for (const [keyword, typeValue] of Object.entries(
                slugToTypeMap
              )) {
                if (
                  parentSlug.includes(keyword) ||
                  slugWithoutGender.includes(keyword)
                ) {
                  return typeValue;
                }
              }

              // Finally, check if slug contains the category type label (Japanese)
              const matchedByTypeName = CATEGORY_TYPE_OPTIONS.find((opt) => {
                const typeName = opt.label.toLowerCase();
                return (
                  parentSlug.includes(typeName) ||
                  slugWithoutGender.includes(typeName)
                );
              });

              return matchedByTypeName?.value || null;
            })()
          : null,
        parentName: parent?.name || "",
        grandParentName: grandParent?.name || "",
      };
    },
    [allCategories]
  );

  // Filter categories
  const filteredCategories = useMemo(() => {
    let filtered = allCategories.filter((cat) =>
      viewMode === "major" ? cat.level === 2 : cat.level === 3
    );

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (cat) =>
          cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cat.slug.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply gender filter
    if (genderFilter && genderFilter !== "all") {
      filtered = filtered.filter((cat) => {
        const info = getCategoryInfo(cat);
        return info.gender === genderFilter;
      });
    }

    // Apply category type filter
    if (categoryTypeFilter && categoryTypeFilter !== "all") {
      filtered = filtered.filter((cat) => {
        const info = getCategoryInfo(cat);
        return info.type === categoryTypeFilter;
      });
    }

    return filtered;
  }, [
    allCategories,
    searchTerm,
    genderFilter,
    categoryTypeFilter,
    viewMode,
    getCategoryInfo,
  ]);

  const handleCreate = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (categoryId: string) => {
    setCategoryToDelete(categoryId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    setDeleting(true);
    try {
      const response = await apiService.deleteCategory(categoryToDelete);
      if (!response.error) {
        await loadCategories();
        setDeleteConfirmOpen(false);
        setCategoryToDelete(null);
      } else {
        throw new Error(response.error || "Failed to delete category");
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
      alert(
        error instanceof Error ? error.message : "カテゴリの削除に失敗しました"
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleModalSuccess = () => {
    loadCategories();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumbs
          homePath="/admin"
          items={[
            { label: "ダッシュボード", path: "/admin" },
            { label: "カテゴリ管理" },
          ]}
        />
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              カテゴリ管理
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              商品をカテゴリに整理・管理
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white  hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>カテゴリ追加</span>
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="bg-white  shadow p-1">
          <div className="flex gap-1">
            <button
              onClick={() => {
                setViewMode("major");
                setCategoryTypeFilter("all");
              }}
              className={`flex-1 px-4 py-2 text-sm font-medium  transition-colors ${
                viewMode === "major"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              主要カテゴリ（アパレル・シューズ・バッグなど）
            </button>
            <button
              onClick={() => {
                setViewMode("sub");
                setCategoryTypeFilter("all");
              }}
              className={`flex-1 px-4 py-2 text-sm font-medium  transition-colors ${
                viewMode === "sub"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              サブカテゴリ
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white  shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="カテゴリを検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="flex-1">
              <select
                value={genderFilter || "all"}
                onChange={(e) => setGenderFilter(e.target.value as Gender)}
                className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors bg-white"
              >
                <option value="all">すべての性別</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {viewMode === "sub" && (
              <div className="flex-1">
                <select
                  value={categoryTypeFilter || "all"}
                  onChange={(e) =>
                    setCategoryTypeFilter(e.target.value as CategoryType)
                  }
                  className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors bg-white"
                >
                  <option value="all">すべてのタイプ</option>
                  {CATEGORY_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Categories Table */}
        <div className="bg-white  shadow overflow-hidden">
          {loading && filteredCategories.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">読み込み中...</span>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              カテゴリが見つかりませんでした。
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle sm:px-0">
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            カテゴリ名
                          </th>
                          <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            性別
                          </th>
                          {viewMode === "sub" && (
                            <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              タイプ
                            </th>
                          )}
                          <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                            スラッグ
                          </th>
                          <th className="px-2 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredCategories.map((category) => {
                          const info = getCategoryInfo(category);
                          return (
                            <tr key={category.id} className="hover:bg-gray-50">
                              <td className="px-2 sm:px-4 py-4">
                                <div className="text-xs sm:text-sm font-medium text-gray-900">
                                  {category.name}
                                </div>
                                <div className="md:hidden text-[10px] text-gray-400 mt-0.5">
                                  {category.slug}
                                </div>
                              </td>
                              <td className="px-2 sm:px-4 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium  bg-blue-100 text-blue-800">
                                  {info.gender === "male"
                                    ? "メンズ"
                                    : info.gender === "female"
                                    ? "レディース"
                                    : "-"}
                                </span>
                              </td>
                              {viewMode === "sub" && (
                                <td className="px-2 sm:px-4 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium  bg-indigo-100 text-indigo-800">
                                    {CATEGORY_TYPE_OPTIONS.find(
                                      (opt) => opt.value === info.type
                                    )?.label || "-"}
                                  </span>
                                </td>
                              )}
                              <td className="px-2 sm:px-4 py-4 whitespace-nowrap hidden md:table-cell">
                                <div className="text-xs sm:text-sm text-gray-500 font-mono truncate max-w-xs">
                                  {category.slug}
                                </div>
                              </td>
                              <td className="px-2 sm:px-4 py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                                <div className="flex items-center justify-end space-x-1 sm:space-x-2">
                                  <button
                                    onClick={() => handleEdit(category)}
                                    className="text-blue-600 hover:text-blue-900 p-1"
                                    title="編集"
                                  >
                                    <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteClick(category.id)
                                    }
                                    className="text-red-600 hover:text-red-900 p-1"
                                    title="削除"
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
            </>
          )}
        </div>
      </div>

      {/* Category Modal */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCategory(null);
        }}
        onSuccess={handleModalSuccess}
        editingCategory={editingCategory}
        allCategories={allCategories}
        apiService={apiService}
        defaultLevel={viewMode === "major" ? 2 : 3}
      />

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setCategoryToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="カテゴリの削除"
        message="このカテゴリを削除してもよろしいですか？この操作は元に戻せません。"
        confirmText="削除"
        cancelText="キャンセル"
        confirmButtonColor="red"
        loading={deleting}
      />
    </AdminLayout>
  );
};
