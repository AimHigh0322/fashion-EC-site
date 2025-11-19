import { useState, useEffect, useMemo } from "react";
import { X, Save, Loader2, Plus } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string;
  level: number;
  [key: string]: unknown;
}

type Gender = "male" | "female" | null;
type CategoryType = string | null; // Can be predefined type or custom category ID

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

interface ApiService {
  createCategory: (
    category: Partial<Category>
  ) => Promise<{ data?: Category; error?: string }>;
  updateCategory: (
    id: string,
    category: Partial<Category>
  ) => Promise<{ data?: Category; error?: string }>;
  getCategories: () => Promise<{ data?: Category[]; error?: string }>;
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingCategory?: Category | null;
  allCategories: Category[];
  apiService: ApiService;
  defaultLevel?: number; // Default level for new categories (2 or 3)
}

export const CategoryModal = ({
  isOpen,
  onClose,
  onSuccess,
  editingCategory,
  allCategories,
  apiService,
  defaultLevel = 3,
}: CategoryModalProps) => {
  const [gender, setGender] = useState<Gender>(null);
  const [categoryType, setCategoryType] = useState<CategoryType>(null);
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddTypeForm, setShowAddTypeForm] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [addingType, setAddingType] = useState(false);

  // Get available category types for selected gender
  const availableCategoryTypes = useMemo(() => {
    if (!gender) return [];

    const genderOption = GENDER_OPTIONS.find((opt) => opt.value === gender);
    if (!genderOption) return [];

    // Find gender category
    const genderCategory = allCategories.find(
      (cat) =>
        cat.level === 1 &&
        (cat.slug === genderOption.slug ||
          cat.slug === gender ||
          cat.name === genderOption.label)
    );

    if (!genderCategory) return [];

    // Get all level 2 categories (category types) under this gender
    const typeCategories = allCategories.filter(
      (cat) => cat.parent_id === genderCategory.id && cat.level === 2
    );

    // Combine predefined options with database categories
    const types: Array<{ value: string; label: string; isCustom: boolean }> =
      [];

    // Add predefined types (always show them, even if they exist in DB)
    CATEGORY_TYPE_OPTIONS.forEach((opt) => {
      // Check if this predefined type already exists in database
      const existingCategory = typeCategories.find((cat) =>
        opt.slugs.some(
          (slug) =>
            cat.slug.includes(slug) ||
            cat.slug === slug ||
            cat.slug === `${genderOption.slug}-${slug}`
        )
      );

      if (existingCategory) {
        // If it exists, use the database category ID
        types.push({
          value: existingCategory.id,
          label: opt.label,
          isCustom: false,
        });
      } else {
        // If it doesn't exist, use the predefined value
        types.push({ value: opt.value, label: opt.label, isCustom: false });
      }
    });

    // Add custom types from database (that are not predefined)
    typeCategories.forEach((cat) => {
      // Check if it's not already covered by predefined types
      const isPredefined = CATEGORY_TYPE_OPTIONS.some((opt) =>
        opt.slugs.some(
          (slug) =>
            cat.slug.includes(slug) ||
            cat.slug === slug ||
            cat.slug === `${genderOption.slug}-${slug}`
        )
      );
      if (!isPredefined) {
        types.push({ value: cat.id, label: cat.name, isCustom: true });
      }
    });

    return types;
  }, [gender, allCategories]);

  useEffect(() => {
    if (isOpen) {
      if (editingCategory) {
        // Check if editing level 2 category (major category)
        if (editingCategory.level === 2) {
          // For level 2, parent is the gender category
          const parentCategory = allCategories.find(
            (cat) => cat.id === editingCategory.parent_id
          );
          if (parentCategory) {
            // Determine gender
            if (
              parentCategory.slug === "mens" ||
              parentCategory.name === "メンズ"
            ) {
              setGender("male");
            } else if (
              parentCategory.slug === "ladies" ||
              parentCategory.name === "レディース"
            ) {
              setGender("female");
            }
          }
          setCategoryName(editingCategory.name);
          setCategoryType(null); // Not needed for level 2
        } else {
          // For level 3, determine gender and type from hierarchy
          const parentCategory = allCategories.find(
            (cat) => cat.id === editingCategory.parent_id
          );
          if (parentCategory) {
            const grandParentCategory = allCategories.find(
              (cat) => cat.id === parentCategory.parent_id
            );
            if (grandParentCategory) {
              // Determine gender
              if (
                grandParentCategory.slug === "mens" ||
                grandParentCategory.name === "メンズ"
              ) {
                setGender("male");
              } else if (
                grandParentCategory.slug === "ladies" ||
                grandParentCategory.name === "レディース"
              ) {
                setGender("female");
              }
              // Set category type to parent category ID
              setCategoryType(parentCategory.id);
            }
          }
          setCategoryName(editingCategory.name);
        }
      } else {
        // Reset for new category
        setGender(null);
        setCategoryType(null);
        setCategoryName("");
        setShowAddTypeForm(false);
        setNewTypeName("");
      }
      setError(null);
    }
  }, [isOpen, editingCategory, allCategories]);

  const handleAddType = async () => {
    if (!newTypeName.trim() || !gender) {
      setError("カテゴリタイプ名を入力してください");
      return;
    }

    setAddingType(true);
    setError(null);

    try {
      const genderOption = GENDER_OPTIONS.find((opt) => opt.value === gender);
      if (!genderOption) {
        throw new Error("Invalid gender selection");
      }

      // Find or create gender category
      let genderCategory = allCategories.find(
        (cat) =>
          cat.level === 1 &&
          (cat.slug === genderOption.slug ||
            cat.slug === gender ||
            cat.name === genderOption.label)
      );

      if (!genderCategory) {
        const genderResponse = await apiService.createCategory({
          name: genderOption.label,
          slug: genderOption.slug,
          level: 1,
        });
        if (genderResponse.data) {
          genderCategory = genderResponse.data;
        } else {
          throw new Error(
            genderResponse.error || "Failed to create gender category"
          );
        }
      }

      if (!genderCategory) {
        throw new Error("Failed to get or create gender category");
      }

      // Create new category type
      const typeSlug = `${genderOption.slug}-${newTypeName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")}`;
      const typeResponse = await apiService.createCategory({
        name: newTypeName.trim(),
        slug: typeSlug,
        parent_id: genderCategory.id,
        level: 2,
      });

      if (typeResponse.error) {
        throw new Error(typeResponse.error || "Failed to create category type");
      }

      // Refresh categories and select the new type
      await onSuccess();
      if (typeResponse.data) {
        setCategoryType(typeResponse.data.id);
      }
      setShowAddTypeForm(false);
      setNewTypeName("");
    } catch (error) {
      console.error("Failed to add category type:", error);
      setError(
        error instanceof Error
          ? error.message
          : "カテゴリタイプの追加に失敗しました"
      );
    } finally {
      setAddingType(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if editing or creating level 2 category
    const isLevel2 =
      editingCategory?.level === 2 || (!editingCategory && defaultLevel === 2);

    if (!categoryName.trim() || !gender) {
      setError("すべてのフィールドを入力してください");
      return;
    }

    // For level 3, categoryType is required
    if (!isLevel2 && !categoryType) {
      setError("すべてのフィールドを入力してください");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const genderOption = GENDER_OPTIONS.find((opt) => opt.value === gender);
      if (!genderOption) {
        throw new Error("Invalid gender selection");
      }

      // Find or create gender category
      let genderCategory = allCategories.find(
        (cat) =>
          cat.level === 1 &&
          (cat.slug === genderOption.slug ||
            cat.slug === gender ||
            cat.name === genderOption.label)
      );

      if (!genderCategory) {
        const genderResponse = await apiService.createCategory({
          name: genderOption.label,
          slug: genderOption.slug,
          level: 1,
        });
        if (genderResponse.data) {
          genderCategory = genderResponse.data;
        } else {
          throw new Error(
            genderResponse.error || "Failed to create gender category"
          );
        }
      }

      if (!genderCategory) {
        throw new Error("Failed to get or create gender category");
      }

      if (isLevel2) {
        // Update level 2 category (major category)
        if (editingCategory) {
          const categorySlug = `${genderOption.slug}-${categoryName
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")}`;
          const response = await apiService.updateCategory(editingCategory.id, {
            name: categoryName.trim(),
            slug: categorySlug,
          });

          if (response.error) {
            throw new Error(response.error || "Failed to update category");
          }
        } else {
          // Create new level 2 category
          const categorySlug = `${genderOption.slug}-${categoryName
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")}`;
          const response = await apiService.createCategory({
            name: categoryName.trim(),
            slug: categorySlug,
            parent_id: genderCategory.id,
            level: 2,
          });

          if (response.error) {
            throw new Error(response.error || "Failed to create category");
          }
        }
      } else {
        // Handle level 3 category
        // Find or create category type
        let typeCategory: Category | null = null;

        // Check if categoryType is a predefined type or a custom category ID
        const predefinedType = CATEGORY_TYPE_OPTIONS.find(
          (opt) => opt.value === categoryType
        );

        if (predefinedType) {
          // It's a predefined type, find or create it
          const foundCategory = allCategories.find(
            (cat) =>
              cat.parent_id === genderCategory.id &&
              cat.level === 2 &&
              predefinedType.slugs.some(
                (slug) =>
                  cat.slug.includes(slug) ||
                  cat.slug === slug ||
                  cat.slug === `${genderOption.slug}-${slug}`
              )
          );

          if (foundCategory) {
            typeCategory = foundCategory;
          } else {
            const typeSlug = `${genderOption.slug}-${predefinedType.slugs[0]}`;
            const typeResponse = await apiService.createCategory({
              name: predefinedType.label,
              slug: typeSlug,
              parent_id: genderCategory.id,
              level: 2,
            });
            if (typeResponse.data) {
              typeCategory = typeResponse.data;
            } else {
              throw new Error(
                typeResponse.error || "Failed to create category type"
              );
            }
          }
        } else {
          // It's a custom category ID
          const foundCategory = allCategories.find(
            (cat) => cat.id === categoryType
          );
          if (foundCategory) {
            typeCategory = foundCategory;
          } else {
            throw new Error("Invalid category type selection");
          }
        }

        if (!typeCategory) {
          throw new Error("Failed to get or create category type");
        }

        if (editingCategory) {
          // Update existing category
          const response = await apiService.updateCategory(editingCategory.id, {
            name: categoryName.trim(),
            slug: categoryName.trim().toLowerCase().replace(/\s+/g, "-"),
          });

          if (response.error) {
            throw new Error(response.error || "Failed to update category");
          }
        } else {
          // Create new category
          if (!typeCategory) {
            throw new Error("Category type is required");
          }
          const categorySlug = `${typeCategory.slug}-${categoryName
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")}`;
          const response = await apiService.createCategory({
            name: categoryName.trim(),
            slug: categorySlug,
            parent_id: typeCategory.id,
            level: 3,
          });

          if (response.error) {
            throw new Error(response.error || "Failed to create category");
          }
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to save category:", error);
      setError(
        error instanceof Error ? error.message : "カテゴリの保存に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white  max-w-2xl w-full shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {editingCategory ? "カテゴリを編集" : "カテゴリを追加"}
          </h2>
          {!loading && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="閉じる"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3  text-sm">
              {error}
            </div>
          )}

          {/* Gender Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              性別を選択 <span className="text-red-500">*</span>
            </label>
            <select
              value={gender || ""}
              onChange={(e) => {
                setGender(e.target.value as Gender);
                setCategoryType(null);
              }}
              className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors bg-white"
              disabled={loading}
            >
              <option value="">選択してください</option>
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category Type Selection - Only for level 3 categories */}
          {gender &&
            editingCategory?.level !== 2 &&
            !editingCategory &&
            defaultLevel === 3 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    カテゴリタイプを選択 <span className="text-red-500">*</span>
                  </label>
                  {!showAddTypeForm && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddTypeForm(true);
                        setNewTypeName("");
                        setError(null);
                      }}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                      disabled={loading || addingType}
                    >
                      <Plus className="w-4 h-4" />
                      <span>カテゴリタイプを追加</span>
                    </button>
                  )}
                </div>

                {!showAddTypeForm ? (
                  <select
                    value={categoryType || ""}
                    onChange={(e) =>
                      setCategoryType(e.target.value as CategoryType)
                    }
                    className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors bg-white"
                    disabled={loading || addingType}
                  >
                    <option value="">選択してください</option>
                    {availableCategoryTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        placeholder="新しいカテゴリタイプ名を入力"
                        className="flex-1 px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors"
                        disabled={addingType}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddType}
                        disabled={addingType || !newTypeName.trim()}
                        className="px-4 py-2 bg-green-600 text-white  hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      >
                        {addingType ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>追加中...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>追加</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddTypeForm(false);
                          setNewTypeName("");
                          setError(null);
                        }}
                        disabled={addingType}
                        className="px-4 py-2 border border-gray-300  text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* Category Name Input */}
          {gender &&
            (editingCategory?.level === 2 ||
              (!editingCategory && defaultLevel === 2) ||
              categoryType) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  カテゴリ名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="カテゴリ名を入力"
                  className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors"
                  disabled={loading}
                  autoFocus
                />
              </div>
            )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300  text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={
                loading ||
                !categoryName.trim() ||
                !gender ||
                (editingCategory?.level !== 2 &&
                  !editingCategory &&
                  defaultLevel !== 2 &&
                  !categoryType)
              }
              className="px-4 py-2 bg-blue-600 text-white  hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{editingCategory ? "更新" : "作成"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
