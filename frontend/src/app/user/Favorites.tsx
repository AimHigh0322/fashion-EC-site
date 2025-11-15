import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useFavorites } from "../../contexts/FavoritesContext";
import { useCart } from "../../contexts/CartContext";
import { useToast } from "../../contexts/ToastContext";
import { apiService } from "../../services/api";
import { UserLayout } from "../../components/layouts/UserLayout";
import { AddToCartButton } from "../../components/molecules/AddToCartButton";
import { Breadcrumbs } from "../../components/molecules/Breadcrumbs";

interface FavoriteProduct {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  price: number;
  main_image_url: string;
  image?: string;
  title?: string;
  description?: string;
  rating?: number;
  reviews?: number;
  status: string;
  stock_quantity: number;
}

export const Favorites = () => {
  const { isAuthenticated } = useAuth();
  const { favorites, toggleFavorite, isFavorited } = useFavorites();
  const { addToCart: addToCartContext, removeFromCart: removeFromCartContext } =
    useCart();
  const { success, error } = useToast();
  const [favoriteProducts, setFavoriteProducts] = useState<FavoriteProduct[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [cartProductIds, setCartProductIds] = useState<Set<string>>(new Set());

  const loadFavoriteProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getFavorites();

      if (response.data && Array.isArray(response.data)) {
        // Fetch product details for each favorite
        const productPromises = response.data.map(
          async (fav: { product_id: string }) => {
            try {
              const productResponse = await apiService.getProduct(
                fav.product_id
              );
              if (productResponse.data) {
                const product = productResponse.data;
                return {
                  id: fav.product_id,
                  product_id: fav.product_id,
                  name: product.name || "",
                  sku: product.sku || "",
                  price: product.price || 0,
                  main_image_url:
                    product.main_image_url ||
                    (product as { image?: string }).image ||
                    "",
                  image:
                    product.main_image_url ||
                    (product as { image?: string }).image ||
                    "",
                  title: product.name || "",
                  description: product.description || "",
                  rating: (product as { rating?: number }).rating || 0,
                  reviews: (product as { reviews?: number }).reviews || 0,
                  status: product.status || "active",
                  stock_quantity: product.stock_quantity || 0,
                } as FavoriteProduct;
              }
            } catch {
              return null;
            }
            return null;
          }
        );

        const products = await Promise.all(productPromises);
        const validProducts = products.filter(
          (p): p is FavoriteProduct => p !== null
        );
        setFavoriteProducts(validProducts);
      } else {
        setFavoriteProducts([]);
      }
    } catch {
      error("お気に入りの読み込みに失敗しました");
      setFavoriteProducts([]);
    } finally {
      setLoading(false);
    }
  }, [error]);

  const loadCartProductIds = useCallback(async () => {
    try {
      const cartResponse = await apiService.getCart();
      if (cartResponse.data && Array.isArray(cartResponse.data)) {
        const productIds = new Set(
          cartResponse.data.map(
            (item: { product_id: string }) => item.product_id
          )
        );
        setCartProductIds(productIds);
      } else {
        setCartProductIds(new Set());
      }
    } catch {
      setCartProductIds(new Set());
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadFavoriteProducts();
      loadCartProductIds();
    }
  }, [isAuthenticated, favorites, loadFavoriteProducts, loadCartProductIds]);

  const handleRemoveFavorite = async (productId: string) => {
    setRemoving(productId);
    try {
      const wasFavorited = isFavorited(productId);
      const toggleSuccess = await toggleFavorite(productId);

      if (toggleSuccess) {
        if (wasFavorited) {
          success("お気に入りから削除しました");
          // Remove from local state
          setFavoriteProducts((prev) =>
            prev.filter((p) => p.product_id !== productId)
          );
        }
      } else {
        error("お気に入りの削除に失敗しました");
      }
    } catch {
      error("お気に入りの削除に失敗しました");
    } finally {
      setRemoving(null);
    }
  };

  const showToast = (
    message: string,
    type: "success" | "error" | "warning" = "success"
  ) => {
    if (type === "success") {
      success(message);
    } else if (type === "error") {
      error(message);
    }
  };

  return (
    <UserLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <Breadcrumbs
            items={[{ label: "商品一覧", path: "/" }, { label: "お気に入り" }]}
          />
        </div>
        {/* Header Section - Japanese Design */}
        <div className="bg-[#e2603f] text-white py-8 sm:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-white/20 rounded-full p-3 sm:p-4">
                <Heart className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">
                  お気に入り
                </h1>
                <p className="text-sm sm:text-base text-white/90">
                  保存した商品を確認できます
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#e2603f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">読み込み中...</p>
              </div>
            </div>
          ) : favoriteProducts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 sm:p-16 text-center">
              <div className="max-w-md mx-auto">
                <div className="bg-gray-100 rounded-full w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center mx-auto mb-6">
                  <Heart className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                  お気に入りはまだありません
                </h2>
                <p className="text-gray-600 mb-8 text-sm sm:text-base">
                  気に入った商品にハートマークを付けて、後で簡単に見つけられるようにしましょう。
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center bg-[#e2603f] hover:bg-[#c95a42] text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  商品を見る
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Stats Bar */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      お気に入り商品数
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-[#e2603f]">
                      {favoriteProducts.length}
                      <span className="text-lg sm:text-xl text-gray-600 ml-2">
                        件
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Heart className="w-5 h-5 text-[#e2603f]" />
                    <span>あなたの大切な商品</span>
                  </div>
                </div>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {favoriteProducts.map((product) => (
                  <div
                    key={product.product_id}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group"
                  >
                    {/* Image Section */}
                    <div className="relative overflow-hidden bg-gray-100">
                      <Link
                        to={`/product/${product.product_id}`}
                        className="block"
                      >
                        <img
                          src={
                            product.image ||
                            product.main_image_url ||
                            "/placeholder-product.jpg"
                          }
                          alt={product.title || product.name}
                          className="w-full h-48 sm:h-56 md:h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </Link>

                      {/* Favorite Button */}
                      <button
                        onClick={() => handleRemoveFavorite(product.product_id)}
                        disabled={removing === product.product_id}
                        className="absolute top-3 right-3 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-all duration-200 hover:scale-110 disabled:opacity-50 cursor-pointer z-10"
                        title="お気に入りから削除"
                      >
                        {removing === product.product_id ? (
                          <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Heart className="w-5 h-5 text-red-500 fill-current" />
                        )}
                      </button>

                      {/* Stock Badge */}
                      {product.stock_quantity === 0 && (
                        <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                          在庫なし
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="p-4 sm:p-5 flex flex-col flex-grow">
                      {/* Title */}
                      <Link
                        to={`/product/${product.product_id}`}
                        className="block mb-2 group-hover:text-[#e2603f] transition-colors"
                      >
                        <h3 className="font-semibold text-sm sm:text-base text-gray-900 line-clamp-2 mb-2">
                          {product.title || product.name}
                        </h3>
                      </Link>

                      {/* Description */}
                      {product.description && (
                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-3">
                          {product.description}
                        </p>
                      )}

                      {/* Rating */}
                      {(product.rating || product.reviews) && (
                        <div className="flex items-center gap-1 mb-3">
                          {[...Array(5)].map((_, index) => (
                            <Star
                              key={index}
                              className={`w-3 h-3 sm:w-4 sm:h-4 ${
                                product.rating &&
                                index < Math.floor(product.rating)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "fill-none stroke-gray-300 text-gray-300"
                              }`}
                            />
                          ))}
                          {product.reviews && (
                            <span className="text-xs sm:text-sm text-gray-600 ml-1">
                              ({product.reviews}件)
                            </span>
                          )}
                        </div>
                      )}

                      {/* Price */}
                      <div className="mb-4">
                        <span className="text-lg sm:text-xl font-bold text-red-600">
                          ¥{product.price.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">
                          (税込)
                        </span>
                      </div>

                      {/* Add to Cart Button */}
                      <div className="mt-auto">
                        <AddToCartButton
                          productId={product.product_id}
                          isAuthenticated={isAuthenticated}
                          isAdding={addingToCart === product.product_id}
                          isInCart={cartProductIds.has(product.product_id)}
                          onAddToCart={async (productId) => {
                            if (!isAuthenticated) {
                              showToast("ログインが必要です", "warning");
                              return;
                            }
                            setAddingToCart(productId);
                            try {
                              const successResult = await addToCartContext(
                                productId,
                                1
                              );
                              if (successResult) {
                                success("カートに追加しました");
                                await loadCartProductIds();
                              } else {
                                error("カートへの追加に失敗しました");
                              }
                            } catch {
                              error("カートへの追加に失敗しました");
                            } finally {
                              setAddingToCart(null);
                            }
                          }}
                          onRemoveFromCart={async (productId) => {
                            if (!isAuthenticated) {
                              return;
                            }
                            setAddingToCart(productId);
                            try {
                              const successResult = await removeFromCartContext(
                                productId
                              );
                              if (successResult) {
                                success("カートから削除しました");
                                await loadCartProductIds();
                              } else {
                                error("カートからの削除に失敗しました");
                              }
                            } catch {
                              error("カートからの削除に失敗しました");
                            } finally {
                              setAddingToCart(null);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </UserLayout>
  );
};
