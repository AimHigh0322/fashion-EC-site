import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import {
  AlertTriangle,
  Package,
  TrendingDown,
  Edit,
  RefreshCw,
  Calendar,
  Plus,
  Minus,
} from "lucide-react";

export function StockAlerts() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [stockForm, setStockForm] = useState({
    quantityChange: 0,
    changeType: "restock",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadLowStockProducts();
  }, []);

  const loadLowStockProducts = async () => {
    try {
      setLoading(true);
      const response = await apiService.getLowStockProducts();
      if (response.data && Array.isArray(response.data)) {
        setLowStockProducts(response.data);
      } else {
        setLowStockProducts([]);
      }
    } catch (error: any) {
      showToast(
        error.message || "在庫アラートの読み込みに失敗しました",
        "error"
      );
      setLowStockProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (product: any) => {
    setSelectedProduct(product);
    setStockForm({
      quantityChange: 0,
      changeType: "restock",
      notes: "",
    });
    setShowModal(true);
  };

  const handleSubmitStockUpdate = async () => {
    if (!selectedProduct || stockForm.quantityChange === 0) {
      showToast("変更数を入力してください", "error");
      return;
    }

    try {
      setSubmitting(true);
      await apiService.updateProductStock(selectedProduct.id, {
        quantityChange: stockForm.quantityChange,
        changeType: stockForm.changeType,
        notes: stockForm.notes,
      });

      showToast("在庫を更新しました", "success");
      setShowModal(false);
      loadLowStockProducts();
    } catch (error: any) {
      showToast(error.message || "在庫の更新に失敗しました", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "未定";
    return new Date(dateString).toLocaleDateString("ja-JP");
  };

  const getStockStatus = (product: any) => {
    if (product.is_out_of_stock) {
      return {
        label: "在庫切れ",
        color: "bg-red-100 text-red-800",
        icon: AlertTriangle,
      };
    }
    if (product.is_low_stock) {
      return {
        label: "低在庫",
        color: "bg-yellow-100 text-yellow-800",
        icon: TrendingDown,
      };
    }
    return {
      label: "在庫あり",
      color: "bg-[#e2603f] text-white",
      icon: Package,
    };
  };

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <AlertTriangle className="w-7 h-7 mr-2 text-[#e2603f]" />
            在庫アラート
          </h1>
          <p className="text-gray-600 mt-1">低在庫および在庫切れの商品を管理</p>
        </div>
        <button
          onClick={loadLowStockProducts}
          className="flex items-center px-4 py-2 bg-[#e2603f] hover:bg-[#c95a42] text-white font-medium  transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          更新
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200  p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">在庫切れ</p>
              <p className="text-2xl font-bold text-red-800 mt-1">
                {lowStockProducts.filter((p) => p.is_out_of_stock).length}
              </p>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200  p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">低在庫</p>
              <p className="text-2xl font-bold text-yellow-800 mt-1">
                {
                  lowStockProducts.filter(
                    (p) => !p.is_out_of_stock && p.is_low_stock
                  ).length
                }
              </p>
            </div>
            <TrendingDown className="w-10 h-10 text-yellow-400" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200  p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">入荷予定あり</p>
              <p className="text-2xl font-bold text-blue-800 mt-1">
                {lowStockProducts.filter((p) => p.restock_date).length}
              </p>
            </div>
            <Calendar className="w-10 h-10 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Products Table */}
      {lowStockProducts.length === 0 ? (
        <div className="bg-white  shadow-sm p-12 text-center">
          <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            在庫アラートはありません
          </h3>
          <p className="text-gray-500">すべての商品の在庫が十分にあります</p>
        </div>
      ) : (
        <div className="bg-white  shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    商品
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    現在の在庫
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    しきい値
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    入荷予定
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lowStockProducts.map((product) => {
                  const status = getStockStatus(product);
                  const StatusIcon = status.icon;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {product.main_image_url ? (
                            <img
                              src={product.main_image_url}
                              alt={product.name}
                              className="w-10 h-10 rounded object-cover mr-3"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center mr-3">
                              <Package className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {product.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              ¥{product.price?.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {product.sku}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`text-lg font-bold ${
                            product.is_out_of_stock
                              ? "text-red-600"
                              : product.is_low_stock
                              ? "text-yellow-600"
                              : "text-green-600"
                          }`}
                        >
                          {product.stock_quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-600">
                          {product.low_stock_threshold}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900">
                          {formatDate(product.restock_date)}
                        </div>
                        {product.restock_quantity && (
                          <div className="text-xs text-gray-500">
                            {product.restock_quantity}個
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handleOpenModal(product)}
                            className="inline-flex items-center px-3 py-1.5 bg-[#e2603f] hover:bg-[#c95a42] text-white text-sm font-medium rounded transition-colors"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            在庫更新
                          </button>
                          <button
                            onClick={() =>
                              navigate(`/admin/products/${product.id}`)
                            }
                            className="inline-flex items-center px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded transition-colors"
                          >
                            詳細
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
      )}

      {/* Stock Update Modal */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white  shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              在庫更新: {selectedProduct.name}
            </h3>

            <div className="mb-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">現在の在庫:</span>
                <span className="text-lg font-bold text-gray-800">
                  {selectedProduct.stock_quantity}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  変更タイプ
                </label>
                <select
                  value={stockForm.changeType}
                  onChange={(e) =>
                    setStockForm({ ...stockForm, changeType: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="restock">入荷</option>
                  <option value="adjustment">調整</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  変更数
                </label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() =>
                      setStockForm({
                        ...stockForm,
                        quantityChange: Math.max(
                          stockForm.quantityChange - 10,
                          -selectedProduct.stock_quantity
                        ),
                      })
                    }
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300  transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={stockForm.quantityChange}
                    onChange={(e) =>
                      setStockForm({
                        ...stockForm,
                        quantityChange: parseInt(e.target.value) || 0,
                      })
                    }
                    className="flex-1 px-4 py-2 border border-gray-300  text-center focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setStockForm({
                        ...stockForm,
                        quantityChange: stockForm.quantityChange + 10,
                      })
                    }
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300  transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                  <span className="text-sm text-gray-600">更新後の在庫:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {selectedProduct.stock_quantity + stockForm.quantityChange}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メモ（任意）
                </label>
                <textarea
                  value={stockForm.notes}
                  onChange={(e) =>
                    setStockForm({ ...stockForm, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  placeholder="変更理由や備考を入力..."
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 font-medium  transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmitStockUpdate}
                disabled={submitting || stockForm.quantityChange === 0}
                className="flex-1 px-4 py-2 bg-[#e2603f] hover:bg-[#c95a42] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium  transition-colors"
              >
                {submitting ? "更新中..." : "更新"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
