import { Plus, Edit, Trash2, FolderTree } from "lucide-react";
import { AdminLayout } from "../../components/layouts/AdminLayout";

export const Categories = () => {
  // Mock data
  const categories = [
    {
      id: 1,
      name: "メンズファッション",
      slug: "mens-fashion",
      products: 245,
      subcategories: 8,
    },
    {
      id: 2,
      name: "レディースファッション",
      slug: "ladies-fashion",
      products: 312,
      subcategories: 10,
    },
    {
      id: 3,
      name: "トップス",
      slug: "tops",
      products: 189,
      subcategories: 5,
    },
    {
      id: 4,
      name: "ボトムス",
      slug: "bottoms",
      products: 156,
      subcategories: 4,
    },
    {
      id: 5,
      name: "シューズ",
      slug: "shoes",
      products: 98,
      subcategories: 6,
    },
    {
      id: 6,
      name: "バッグ・小物",
      slug: "bags-accessories",
      products: 134,
      subcategories: 7,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              カテゴリ管理
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              商品をカテゴリに整理
            </p>
          </div>
          <button className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-5 h-5" />
            <span>カテゴリ追加</span>
          </button>
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">総カテゴリ数</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {categories.length}
              </p>
            </div>
            <FolderTree className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FolderTree className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {category.name}
                    </h3>
                    <p className="text-xs text-gray-500">{category.slug}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button className="text-gray-600 hover:text-gray-900 p-1">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="text-red-600 hover:text-red-900 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-600">商品数</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {category.products}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">サブカテゴリ</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {category.subcategories}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};
