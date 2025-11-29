import { useState, useEffect } from "react";
import {  Download, TrendingUp, Package, DollarSign } from "lucide-react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { apiService } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { Breadcrumbs } from "../../components/molecules/Breadcrumbs";

interface SalesFilters {
  startDate: string;
  endDate: string;
  productId?: string;
  categoryId?: string;
  groupBy: "daily" | "monthly" | "product" | "category";
}

interface DailySalesData {
  date: string;
  order_count: number;
  total_sales: number;
  avg_order_amount: number;
  unique_products_sold: number;
  total_items_sold: number;
}

interface MonthlySalesData {
  month: string;
  order_count: number;
  total_sales: number;
  avg_order_amount: number;
  unique_products_sold: number;
  total_items_sold: number;
}

interface ProductSalesData {
  id: string;
  sku: string;
  name: string;
  category_names: string;
  order_count: number;
  total_quantity_sold: number;
  total_sales: number;
  avg_price: number;
  min_price: number;
  max_price: number;
}

interface CategorySalesData {
  id: string;
  name: string;
  slug: string;
  order_count: number;
  unique_products: number;
  total_quantity_sold: number;
  total_sales: number;
  avg_order_value: number;
}

export const SalesAnalytics = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SalesFilters>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    groupBy: "daily",
  });
  const [dailyData, setDailyData] = useState<DailySalesData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlySalesData[]>([]);
  const [productData, setProductData] = useState<ProductSalesData[]>([]);
  const [categoryData, setCategoryData] = useState<CategorySalesData[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  // Load products and categories for filters
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          apiService.getProducts({ limit: 1000 }),
          apiService.getCategories(),
        ]);
        if (productsRes.data && Array.isArray(productsRes.data)) {
          setProducts(
            productsRes.data.map((p: { id: string; name: string }) => ({
              id: p.id,
              name: p.name,
            }))
          );
        }
        if (categoriesRes.data && Array.isArray(categoriesRes.data)) {
          setCategories(
            categoriesRes.data.map((c: { id: string; name: string }) => ({
              id: c.id,
              name: c.name,
            }))
          );
        }
      } catch (error) {
        console.error("Failed to load filters:", error);
      }
    };
    loadFilters();
  }, []);

  // Load sales data
  useEffect(() => {
    loadSalesData();
  }, [filters]);

  const loadSalesData = async () => {
    setLoading(true);
    try {
      const params: any = {
        start_date: filters.startDate,
        end_date: filters.endDate,
      };

      if (filters.productId) params.product_id = filters.productId;
      if (filters.categoryId) params.category_id = filters.categoryId;

      switch (filters.groupBy) {
        case "daily":
          const dailyRes = await apiService.getDailySales(params);
          if (dailyRes.data) setDailyData(dailyRes.data);
          break;
        case "monthly":
          const monthlyRes = await apiService.getMonthlySales({
            start_month: filters.startDate.substring(0, 7),
            end_month: filters.endDate.substring(0, 7),
            product_id: filters.productId,
            category_id: filters.categoryId,
          });
          if (monthlyRes.data) setMonthlyData(monthlyRes.data);
          break;
        case "product":
          const productRes = await apiService.getProductSales(params);
          if (productRes.data) setProductData(productRes.data);
          break;
        case "category":
          const categoryRes = await apiService.getCategorySales(params);
          if (categoryRes.data) setCategoryData(categoryRes.data);
          break;
      }
    } catch (error) {
      console.error("Failed to load sales data:", error);
      showToast("売上データの読み込みに失敗しました", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `¥${Math.round(amount).toLocaleString()}`;
  };

  const exportToCSV = () => {
    let csvContent = "";
    let headers: string[] = [];
    let rows: any[] = [];

    switch (filters.groupBy) {
      case "daily":
        headers = ["日付", "注文数", "売上高", "平均注文額", "販売商品数", "販売数量"];
        rows = dailyData.map((d) => [
          d.date,
          d.order_count,
          d.total_sales,
          d.avg_order_amount,
          d.unique_products_sold,
          d.total_items_sold,
        ]);
        break;
      case "monthly":
        headers = ["月", "注文数", "売上高", "平均注文額", "販売商品数", "販売数量"];
        rows = monthlyData.map((d) => [
          d.month,
          d.order_count,
          d.total_sales,
          d.avg_order_amount,
          d.unique_products_sold,
          d.total_items_sold,
        ]);
        break;
      case "product":
        headers = [
          "SKU",
          "商品名",
          "カテゴリ",
          "注文数",
          "販売数量",
          "売上高",
          "平均価格",
          "最低価格",
          "最高価格",
        ];
        rows = productData.map((d) => [
          d.sku,
          d.name,
          d.category_names || "",
          d.order_count,
          d.total_quantity_sold,
          d.total_sales,
          d.avg_price,
          d.min_price,
          d.max_price,
        ]);
        break;
      case "category":
        headers = [
          "カテゴリ名",
          "注文数",
          "販売商品数",
          "販売数量",
          "売上高",
          "平均注文額",
        ];
        rows = categoryData.map((d) => [
          d.name,
          d.order_count,
          d.unique_products,
          d.total_quantity_sold,
          d.total_sales,
          d.avg_order_value,
        ]);
        break;
    }

    csvContent = headers.join(",") + "\n";
    rows.forEach((row) => {
      csvContent += row.map((cell: any) => `"${cell}"`).join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_${filters.groupBy}_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSVファイルをダウンロードしました", "success");
  };

  const getSummaryStats = () => {
    switch (filters.groupBy) {
      case "daily":
        return {
          totalSales: dailyData.reduce((sum, d) => sum + d.total_sales, 0),
          totalOrders: dailyData.reduce((sum, d) => sum + d.order_count, 0),
          avgOrderAmount:
            dailyData.length > 0
              ? dailyData.reduce((sum, d) => sum + d.avg_order_amount, 0) /
                dailyData.length
              : 0,
        };
      case "monthly":
        return {
          totalSales: monthlyData.reduce((sum, d) => sum + d.total_sales, 0),
          totalOrders: monthlyData.reduce((sum, d) => sum + d.order_count, 0),
          avgOrderAmount:
            monthlyData.length > 0
              ? monthlyData.reduce((sum, d) => sum + d.avg_order_amount, 0) /
                monthlyData.length
              : 0,
        };
      case "product":
        return {
          totalSales: productData.reduce((sum, d) => sum + d.total_sales, 0),
          totalOrders: productData.reduce((sum, d) => sum + d.order_count, 0),
          avgOrderAmount: 0,
        };
      case "category":
        return {
          totalSales: categoryData.reduce((sum, d) => sum + d.total_sales, 0),
          totalOrders: categoryData.reduce((sum, d) => sum + d.order_count, 0),
          avgOrderAmount:
            categoryData.length > 0
              ? categoryData.reduce((sum, d) => sum + d.avg_order_value, 0) /
                categoryData.length
              : 0,
        };
      default:
        return { totalSales: 0, totalOrders: 0, avgOrderAmount: 0 };
    }
  };

  const summary = getSummaryStats();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Breadcrumbs
          homePath="/admin"
          items={[
            { label: "ダッシュボード", path: "/admin" },
            { label: "売上分析" },
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              売上分析
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              売上データの集計・分析・可視化
            </p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Download className="w-5 h-5" />
            <span>CSVエクスポート</span>
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">総売上高</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(summary.totalSales)}
              </p>
            </div>
          </div>
          <div className="bg-white shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">総注文数</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.totalOrders.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="bg-white shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-100 rounded">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">平均注文額</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(summary.avgOrderAmount)}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                集計方法
              </label>
              <select
                value={filters.groupBy}
                onChange={(e) =>
                  setFilters({ ...filters, groupBy: e.target.value as any })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              >
                <option value="daily">日別</option>
                <option value="monthly">月別</option>
                <option value="product">商品別</option>
                <option value="category">カテゴリ別</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                開始日
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                終了日
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            {filters.groupBy !== "category" && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  商品で絞り込み
                </label>
                <select
                  value={filters.productId || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      productId: e.target.value || undefined,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                >
                  <option value="">すべての商品</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {filters.groupBy !== "product" && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  カテゴリで絞り込み
                </label>
                <select
                  value={filters.categoryId || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      categoryId: e.target.value || undefined,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                >
                  <option value="">すべてのカテゴリ</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">読み込み中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {filters.groupBy === "daily" && (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          日付
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          注文数
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          売上高
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          平均注文額
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          販売商品数
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          販売数量
                        </th>
                      </>
                    )}
                    {filters.groupBy === "monthly" && (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          月
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          注文数
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          売上高
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          平均注文額
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          販売商品数
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          販売数量
                        </th>
                      </>
                    )}
                    {filters.groupBy === "product" && (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          SKU
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          商品名
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          カテゴリ
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          注文数
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          販売数量
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          売上高
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          平均価格
                        </th>
                      </>
                    )}
                    {filters.groupBy === "category" && (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          カテゴリ名
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          注文数
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          販売商品数
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          販売数量
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          売上高
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          平均注文額
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filters.groupBy === "daily" &&
                    (dailyData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          データがありません
                        </td>
                      </tr>
                    ) : (
                      dailyData.map((row) => (
                        <tr key={row.date} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.date}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.order_count}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(row.total_sales)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(row.avg_order_amount)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.unique_products_sold}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.total_items_sold}
                          </td>
                        </tr>
                      ))
                    ))}
                  {filters.groupBy === "monthly" &&
                    (monthlyData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          データがありません
                        </td>
                      </tr>
                    ) : (
                      monthlyData.map((row) => (
                        <tr key={row.month} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.month}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.order_count}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(row.total_sales)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(row.avg_order_amount)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.unique_products_sold}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.total_items_sold}
                          </td>
                        </tr>
                      ))
                    ))}
                  {filters.groupBy === "product" &&
                    (productData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          データがありません
                        </td>
                      </tr>
                    ) : (
                      productData.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.sku}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">{row.name}</td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {row.category_names || "-"}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.order_count}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.total_quantity_sold}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(row.total_sales)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(row.avg_price)}
                          </td>
                        </tr>
                      ))
                    ))}
                  {filters.groupBy === "category" &&
                    (categoryData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          データがありません
                        </td>
                      </tr>
                    ) : (
                      categoryData.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm font-medium text-gray-900">
                            {row.name}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.order_count}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.unique_products}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.total_quantity_sold}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(row.total_sales)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(row.avg_order_value)}
                          </td>
                        </tr>
                      ))
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

