import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Heart, Star, ChevronDown } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useFavorites } from "../../contexts/FavoritesContext";
import { useCart } from "../../contexts/CartContext";
import { useToast } from "../../contexts/ToastContext";
import { useCategory } from "../../contexts/CategoryContext";
import { useNavigate } from "react-router-dom";
import { apiService } from "../../services/api";
import { AddToCartButton } from "../../components/molecules/AddToCartButton";
import { UserLayout } from "../../components/layouts/UserLayout";

interface Category {
  id: string;
  name: string;
  level: number;
  parent_id?: string;
  children?: Category[];
}

interface Product {
  id: string;
  sku: string;
  title: string;
  name?: string;
  description: string;
  price: number;
  compare_price: number | null;
  stock_quantity: number;
  status: string;
  brand_name: string;
  rating: number;
  reviews: number;
  image: string;
  main_image_url?: string;
  badges: string[];
  delivery: string;
  product_url: string;
  weight: number | null;
  dimensions: string | null;
  category_names: string;
  category_ids: string[];
  createdAt: string;
  updatedAt: string;
}

export const Products = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites();
  const { addToCart: addToCartContext, removeFromCart: removeFromCartContext } = useCart();
  const { showToast, success, error } = useToast();
  const { selectedCategoryId, setSelectedCategoryId, setSelectedCategoryName } = useCategory();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cartProductIds, setCartProductIds] = useState<Set<string>>(new Set());
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await apiService.getCategoryTree();
        if (response.data && Array.isArray(response.data)) {
          setCategories(response.data);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, []);

  // Load cart product IDs
  useEffect(() => {
    const loadCartData = async () => {
      if (isAuthenticated) {
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
      } else {
        setCartProductIds(new Set());
      }
    };
    loadCartData();
  }, [isAuthenticated]);

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        let allProducts: Array<{
          id: string;
          sku?: string;
          name?: string;
          description?: string;
          price?: number;
          compare_price?: number;
          stock_quantity?: number;
          status?: string;
          brand_name?: string;
          main_image_url?: string;
          product_url?: string;
          weight?: number;
          dimensions?: string;
          category_names?: string;
          category_ids?: string[];
          categories?: Array<{ id: string; name: string; level: number }>;
          createdAt?: string;
          updatedAt?: string;
          [key: string]: unknown;
        }> = [];

        let offset = 0;
        const limit = 100;
        let hasMore = true;

        while (hasMore) {
          const response = await apiService.getProducts({
            limit,
            offset,
            category_id: selectedCategoryId || undefined,
          });

          if (response.data && Array.isArray(response.data)) {
            allProducts = [...allProducts, ...response.data];
            if (response.data.length < limit) {
              hasMore = false;
            } else {
              offset += limit;
            }
          } else {
            hasMore = false;
          }
        }

        if (allProducts.length > 0) {
          const baseUrl = (
            import.meta.env.VITE_API_URL || "http://localhost:8888/api"
          ).replace(/\/api$/, "");

          const formattedProducts = allProducts.map((product) => {
            let imageUrl = product.main_image_url || "";
            if (imageUrl && !imageUrl.startsWith("http")) {
              const cleanPath = imageUrl.startsWith("/")
                ? imageUrl
                : `/${imageUrl}`;
              imageUrl = `${baseUrl}${cleanPath}`;
            }

            const badges: string[] = [];
            if (product.stock_quantity && product.stock_quantity > 0) {
              badges.push("送料無料");
            }
            if (product.is_featured) {
              badges.push("おすすめ");
            }
            if (
              product.compare_price &&
              product.price &&
              product.compare_price > product.price
            ) {
              badges.push("セール");
            }

            const categories = Array.isArray(product.categories)
              ? product.categories
              : [];
            const categoryIds =
              product.category_ids && Array.isArray(product.category_ids)
                ? product.category_ids
                : categories
                    .map((cat: { id?: string }) => cat.id || "")
                    .filter(Boolean);

            return {
              id: product.id,
              sku: product.sku || "",
              title: product.name || "",
              description: product.description || "",
              price: product.price || 0,
              compare_price: product.compare_price || null,
              stock_quantity: product.stock_quantity || 0,
              status: product.status || "draft",
              brand_name: product.brand_name || "",
              rating: Number(product.average_rating) || 0,
              reviews: Number(product.review_count) || 0,
              image: imageUrl || "/img/model/model (1).png",
              badges: badges.length > 0 ? badges : ["送料無料"],
              delivery: product.description || "",
              product_url: product.product_url || "",
              weight: product.weight || null,
              dimensions: product.dimensions || null,
              category_names: product.category_names || "",
              category_ids: categoryIds,
              createdAt: product.createdAt || "",
              updatedAt: product.updatedAt || "",
            };
          });

          setProducts(formattedProducts);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error("Failed to load products:", error);
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, [selectedCategoryId]);

  const handleCategoryClick = (categoryId: string, categoryName: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedCategoryName(categoryName);
  };

  const handleClearFilter = () => {
    setSelectedCategoryId(null);
    setSelectedCategoryName(null);
  };

  // Get gender categories (level 1)
  const genderCategories = useMemo(() => {
    return categories.filter((cat) => cat.level === 1);
  }, [categories]);

  // Get subcategories for a main category (level 3)
  const getSubcategories = (categoryId: string): Category[] => {
    for (const genderCat of categories) {
      if (genderCat.children) {
        for (const mainCat of genderCat.children) {
          if (mainCat.id === categoryId) {
            return mainCat.children || [];
          }
        }
      }
    }
    return [];
  };

  // Toggle dropdown
  const toggleDropdown = (categoryId: string) => {
    setOpenDropdowns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenDropdowns(new Set());
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <UserLayout>
      <div className="max-w-[1440px] mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Side - Categories Dropdown */}
          <div className="lg:w-64 xl:w-80 flex-shrink-0" ref={dropdownRef}>
            <div className="bg-white border border-gray-200 rounded-lg p-4 sticky top-4">
              <h2 className="text-lg font-bold mb-4">カテゴリー</h2>
              {loadingCategories ? (
                <div className="text-sm text-gray-500">読み込み中...</div>
              ) : genderCategories.length === 0 ? (
                <div className="text-sm text-gray-500">カテゴリーがありません</div>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/products"
                    onClick={handleClearFilter}
                    className={`w-full text-left px-3 py-2.5 rounded text-base transition-colors block ${
                      !selectedCategoryId
                        ? "bg-[#e2603f] text-white font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    すべてのカテゴリー
                  </Link>
                  
                  {/* Gender Categories with Main Categories */}
                  {genderCategories.map((gender) => (
                    <div key={gender.id} className="space-y-1">
                      <button
                        onClick={() => {
                          setSelectedGender(
                            selectedGender === gender.id ? null : gender.id
                          );
                          setOpenDropdowns(new Set());
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded text-base transition-colors flex items-center justify-between ${
                          selectedGender === gender.id
                            ? "bg-[#e2603f] text-white font-medium"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <span>{gender.name}</span>
                        <ChevronDown
                          className={`w-5 h-5 transition-transform duration-200 ${
                            selectedGender === gender.id ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      
                      {/* Main Categories - Always Visible */}
                      {gender.children && gender.children.length > 0 && (
                        <div className="pl-4 space-y-1">
                          {gender.children.map((mainCategory) => {
                            const subcategories = getSubcategories(mainCategory.id);
                            const isDropdownOpen = openDropdowns.has(mainCategory.id);
                            
                            return (
                              <div key={mainCategory.id} className="space-y-1">
                                <div className="flex items-center">
                                  {subcategories.length > 0 ? (
                                    <button
                                      onClick={() => toggleDropdown(mainCategory.id)}
                                      className={`flex-1 text-left px-3 py-2 rounded text-base transition-colors flex items-center justify-between ${
                                        selectedCategoryId === mainCategory.id
                                          ? "bg-[#e2603f] text-white font-medium"
                                          : "text-gray-700 hover:bg-gray-100"
                                      }`}
                                    >
                                      <span>{mainCategory.name}</span>
                                      <ChevronDown
                                        className={`w-4 h-4 transition-transform duration-200 ${
                                          isDropdownOpen ? "rotate-180" : ""
                                        }`}
                                      />
                                    </button>
                                  ) : (
                                    <Link
                                      to="/products"
                                      onClick={() => handleCategoryClick(mainCategory.id, mainCategory.name)}
                                      className={`flex-1 text-left px-3 py-2 rounded text-base transition-colors flex items-center justify-between block ${
                                        selectedCategoryId === mainCategory.id
                                          ? "bg-[#e2603f] text-white font-medium"
                                          : "text-gray-700 hover:bg-gray-100"
                                      }`}
                                    >
                                      <span>{mainCategory.name}</span>
                                    </Link>
                                  )}
                                </div>
                                
                                {/* Subcategories Dropdown */}
                                {isDropdownOpen && subcategories.length > 0 && (
                                  <div className="pl-4 space-y-1">
                                    {subcategories.map((subcategory) => (
                                      <Link
                                        key={subcategory.id}
                                        to="/products"
                                        onClick={() => handleCategoryClick(subcategory.id, subcategory.name)}
                                        className={`w-full text-left px-3 py-2 rounded text-base transition-colors block ${
                                          selectedCategoryId === subcategory.id
                                            ? "bg-[#e2603f] text-white font-medium"
                                            : "text-gray-600 hover:bg-gray-100"
                                        }`}
                                      >
                                        {subcategory.name}
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Products */}
          <div className="flex-1">
            <div className="mb-4">
              <h1 className="text-2xl sm:text-3xl font-bold">商品一覧</h1>
            </div>

            {loadingProducts ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">商品を読み込み中...</div>
              </div>
            ) : products.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">商品が見つかりませんでした</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className="group bg-white border border-gray-200 overflow-hidden shadow-sm flex flex-col cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-1"
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-48 sm:h-56 object-cover transition-opacity duration-300 group-hover:opacity-80"
                      />
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!isAuthenticated) {
                            navigate("/login", {
                              state: { from: window.location.pathname },
                            });
                            return;
                          }
                          const wasFavorited = isFavorited(product.id);
                          const toggleSuccess = await toggleFavorite(product.id);
                          if (toggleSuccess) {
                            if (wasFavorited) {
                              success("お気に入りから削除しました");
                            } else {
                              success("お気に入りに追加しました");
                            }
                          } else {
                            error("お気に入りの更新に失敗しました");
                          }
                        }}
                        className={`absolute top-2 right-2 bg-white/80 rounded-full p-1.5 transition-colors cursor-pointer ${
                          isFavorited(product.id)
                            ? "text-red-500 hover:text-red-600"
                            : "text-gray-400 hover:text-red-500"
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 sm:w-5 sm:h-5 ${
                            isFavorited(product.id) ? "fill-current" : ""
                          }`}
                        />
                      </button>
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      <div className="h-20 mb-2">
                        <div className="text-sm font-semibold text-gray-800 line-clamp-2 mb-1">
                          {product.title}
                        </div>
                        {product.description && (
                          <div className="text-gray-600 text-xs line-clamp-2">
                            {product.description}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, index) => (
                          <Star
                            key={index}
                            className={`w-3 h-3 sm:w-4 sm:h-4 ${
                              product.rating > 0 && index < Math.floor(product.rating)
                                ? "fill-yellow-400 text-yellow-400"
                                : "fill-none stroke-gray-300 text-gray-300"
                            }`}
                          />
                        ))}
                        <span className="text-xs text-gray-600 ml-1">
                          ({product.reviews}件)
                        </span>
                      </div>
                      <div className="mb-3">
                        <span className="text-lg font-bold text-red-600">
                          ¥{product.price.toLocaleString()}
                        </span>
                        {product.compare_price && product.compare_price > product.price && (
                          <span className="text-xs text-gray-500 ml-1 line-through">
                            ¥{product.compare_price.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="mt-auto">
                        <AddToCartButton
                          productId={product.id}
                          isAuthenticated={isAuthenticated}
                          isAdding={addingToCart === product.id}
                          isInCart={cartProductIds.has(product.id)}
                          onAddToCart={async (productId) => {
                            if (!isAuthenticated) {
                              navigate("/login", {
                                state: { from: window.location.pathname },
                              });
                              return;
                            }
                            setAddingToCart(productId);
                            try {
                              const success = await addToCartContext(productId, 1);
                              if (success) {
                                showToast("カートに追加しました", "success");
                                const cartResponse = await apiService.getCart();
                                if (
                                  cartResponse.data &&
                                  Array.isArray(cartResponse.data)
                                ) {
                                  const productIds = new Set(
                                    cartResponse.data.map(
                                      (item: { product_id: string }) =>
                                        item.product_id
                                    )
                                  );
                                  setCartProductIds(productIds);
                                }
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
                              const success = await removeFromCartContext(productId);
                              if (success) {
                                showToast("カートから削除しました", "success");
                                const cartResponse = await apiService.getCart();
                                if (
                                  cartResponse.data &&
                                  Array.isArray(cartResponse.data)
                                ) {
                                  const productIds = new Set(
                                    cartResponse.data.map(
                                      (item: { product_id: string }) =>
                                        item.product_id
                                    )
                                  );
                                  setCartProductIds(productIds);
                                }
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
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

