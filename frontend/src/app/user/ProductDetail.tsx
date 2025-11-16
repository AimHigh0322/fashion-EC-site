import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Heart, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useFavorites } from "../../contexts/FavoritesContext";
import { useCart } from "../../contexts/CartContext";
import { useToast } from "../../contexts/ToastContext";
import { apiService } from "../../services/api";
import { AddToCartButton } from "../../components/molecules/AddToCartButton";
import { UserLayout } from "../../components/layouts/UserLayout";
import { Breadcrumbs } from "../../components/molecules/Breadcrumbs";

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  compare_price?: number;
  stock_quantity: number;
  status: string;
  brand_name?: string;
  main_image_url?: string;
  product_url?: string;
  category_names?: string;
  image?: string;
  images?: Array<{ id: string; image_url: string; sort_order: number }>;
  [key: string]: unknown;
}

interface Review {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites();
  const { addToCart, removeFromCart } = useCart();
  const { showToast, success, error } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [brandProducts, setBrandProducts] = useState<Product[]>([]);
  const [addingToCart, setAddingToCart] = useState(false);
  const [isInCart, setIsInCart] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(1);
  const [images, setImages] = useState<string[]>([]);

  // Refs for flow sections
  const similarProductsRef = useRef<HTMLDivElement>(null);
  const brandProductsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeftSimilar, setCanScrollLeftSimilar] = useState(false);
  const [canScrollRightSimilar, setCanScrollRightSimilar] = useState(false);
  const [canScrollLeftBrand, setCanScrollLeftBrand] = useState(false);
  const [canScrollRightBrand, setCanScrollRightBrand] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const response = await apiService.getProduct(id);

        if (response.data) {
          const productData = Array.isArray(response.data)
            ? response.data[0]
            : (response.data as { data?: Product }).data || response.data;
          setProduct(productData as Product);

          // Set images - get all product images like admin page
          const baseUrl = (
            import.meta.env.VITE_API_URL || "http://localhost:8888/api"
          ).replace(/\/api$/, "");

          const getImageUrl = (imagePath: string | undefined) => {
            if (!imagePath) return null;
            if (imagePath.startsWith("http")) return imagePath;
            const path = imagePath.startsWith("/")
              ? imagePath
              : `/${imagePath}`;
            return `${baseUrl}${path}`;
          };

          // Get all product images
          const allImages: string[] = [];
          const productWithImages = productData as Product;

          // Add main image first
          if (productWithImages.main_image_url) {
            const mainImageUrl = getImageUrl(productWithImages.main_image_url);
            if (mainImageUrl) {
              allImages.push(mainImageUrl);
            }
          }

          // Add other images from images array
          if (productWithImages.images && productWithImages.images.length > 0) {
            // Sort by sort_order
            const sortedImages = [...productWithImages.images].sort(
              (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
            );

            sortedImages.forEach((img) => {
              if (img.image_url) {
                const imageUrl = getImageUrl(img.image_url);
                if (imageUrl && !allImages.includes(imageUrl)) {
                  allImages.push(imageUrl);
                }
              }
            });
          }

          // If no images found, use placeholder
          if (allImages.length === 0) {
            allImages.push("/img/model/model (1).png");
          }

          setImages(allImages);
        }
      } catch (err) {
        console.error("Failed to load product:", err);
        showToast("商品の読み込みに失敗しました", "error");
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id, showToast]);

  // Load cart status
  useEffect(() => {
    const checkCartStatus = async () => {
      if (isAuthenticated && product) {
        try {
          const cartResponse = await apiService.getCart();
          if (cartResponse.data && Array.isArray(cartResponse.data)) {
            const inCart = cartResponse.data.some(
              (item: { product_id: string }) => item.product_id === product.id
            );
            setIsInCart(inCart);
          }
        } catch {
          // Silently fail
        }
      }
    };
    checkCartStatus();
  }, [isAuthenticated, product]);

  // Load reviews (mock data for now)
  useEffect(() => {
    setReviews([
      {
        id: "1",
        user_name: "山田太郎",
        rating: 5,
        comment: "とても良い商品です。品質も良く、使いやすいです。",
        createdAt: "2024-01-15",
      },
      {
        id: "2",
        user_name: "佐藤花子",
        rating: 4,
        comment: "良い商品ですが、もう少し安いと嬉しいです。",
        createdAt: "2024-01-10",
      },
    ]);
  }, []);

  // Load similar products (from same category)
  useEffect(() => {
    const loadSimilarProducts = async () => {
      if (!product) return;

      try {
        const response = await apiService.getProducts({
          limit: 20,
        });

        if (response.data && Array.isArray(response.data)) {
          const baseUrl = (
            import.meta.env.VITE_API_URL || "http://localhost:8888/api"
          ).replace(/\/api$/, "");

          const formattedProducts = response.data
            .filter((p: Product) => p.id !== product.id)
            .slice(0, 8)
            .map((p: Product) => {
              let imageUrl = p.main_image_url || "";
              if (imageUrl && !imageUrl.startsWith("http")) {
                const cleanPath = imageUrl.startsWith("/")
                  ? imageUrl
                  : `/${imageUrl}`;
                imageUrl = `${baseUrl}${cleanPath}`;
              }

              return {
                ...p,
                image: imageUrl || "/img/model/model (1).png",
              };
            });

          setSimilarProducts(formattedProducts);
        }
      } catch (err) {
        console.error("Failed to load similar products:", err);
      }
    };

    loadSimilarProducts();
  }, [product]);

  // Load brand products
  useEffect(() => {
    const loadBrandProducts = async () => {
      if (!product?.brand_name) return;

      try {
        const response = await apiService.getProducts({
          limit: 20,
        });

        if (response.data && Array.isArray(response.data)) {
          const baseUrl = (
            import.meta.env.VITE_API_URL || "http://localhost:8888/api"
          ).replace(/\/api$/, "");

          const formattedProducts = response.data
            .filter(
              (p: Product) =>
                p.brand_name === product.brand_name && p.id !== product.id
            )
            .slice(0, 8)
            .map((p: Product) => {
              let imageUrl = p.main_image_url || "";
              if (imageUrl && !imageUrl.startsWith("http")) {
                const cleanPath = imageUrl.startsWith("/")
                  ? imageUrl
                  : `/${imageUrl}`;
                imageUrl = `${baseUrl}${cleanPath}`;
              }

              return {
                ...p,
                image: imageUrl || "/img/model/model (1).png",
              };
            });

          setBrandProducts(formattedProducts);
        }
      } catch (err) {
        console.error("Failed to load brand products:", err);
      }
    };

    loadBrandProducts();
  }, [product]);

  // Check scroll position for similar products
  useEffect(() => {
    const checkScrollPosition = () => {
      if (similarProductsRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } =
          similarProductsRef.current;
        setCanScrollLeftSimilar(scrollLeft > 0);
        setCanScrollRightSimilar(scrollLeft < scrollWidth - clientWidth - 1);
      }
    };

    checkScrollPosition();
    window.addEventListener("resize", checkScrollPosition);
    const scrollContainer = similarProductsRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", checkScrollPosition);
    }

    return () => {
      window.removeEventListener("resize", checkScrollPosition);
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", checkScrollPosition);
      }
    };
  }, [similarProducts]);

  // Check scroll position for brand products
  useEffect(() => {
    const checkScrollPosition = () => {
      if (brandProductsRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } =
          brandProductsRef.current;
        setCanScrollLeftBrand(scrollLeft > 0);
        setCanScrollRightBrand(scrollLeft < scrollWidth - clientWidth - 1);
      }
    };

    checkScrollPosition();
    window.addEventListener("resize", checkScrollPosition);
    const scrollContainer = brandProductsRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", checkScrollPosition);
    }

    return () => {
      window.removeEventListener("resize", checkScrollPosition);
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", checkScrollPosition);
      }
    };
  }, [brandProducts]);

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      showToast("ログインが必要です", "warning");
      return;
    }

    if (!product) return;

    const wasFavorited = isFavorited(product.id);
    const toggleSuccess = await toggleFavorite(product.id);

    if (toggleSuccess) {
      if (wasFavorited) {
        success("お気に入りから削除しました");
        setFavoriteCount(Math.max(0, favoriteCount - 1));
      } else {
        success("お気に入りに追加しました");
        setFavoriteCount(favoriteCount + 1);
      }
    } else {
      error("お気に入りの更新に失敗しました");
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      showToast("ログインが必要です", "warning");
      return;
    }

    if (!product) return;

    setAddingToCart(true);
    try {
      const success = await addToCart(product.id, 1);
      if (success) {
        showToast("カートに追加しました", "success");
        setIsInCart(true);
      } else {
        error("カートへの追加に失敗しました");
      }
    } catch {
      error("カートへの追加に失敗しました");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleRemoveFromCart = async () => {
    if (!isAuthenticated || !product) return;

    setAddingToCart(true);
    try {
      const success = await removeFromCart(product.id);
      if (success) {
        showToast("カートから削除しました", "success");
        setIsInCart(false);
      } else {
        error("カートからの削除に失敗しました");
      }
    } catch {
      error("カートからの削除に失敗しました");
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </UserLayout>
    );
  }

  if (!product) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">商品が見つかりませんでした</div>
        </div>
      </UserLayout>
    );
  }

  const baseUrl = (
    import.meta.env.VITE_API_URL || "http://localhost:8888/api"
  ).replace(/\/api$/, "");

  const mainImage = product.main_image_url || "";
  const imageUrl =
    mainImage && !mainImage.startsWith("http")
      ? `${baseUrl}${mainImage.startsWith("/") ? mainImage : `/${mainImage}`}`
      : mainImage;

  const discountPercentage =
    product.compare_price && product.price
      ? Math.round(
          ((product.compare_price - product.price) / product.compare_price) *
            100
        )
      : 0;

  const couponDiscount = Math.floor(product.price * 0.05);

  return (
    <UserLayout>
      <div className="max-w-[1440px] mx-auto px-4 py-6">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[{ label: "商品一覧", path: "/" }, { label: product.name }]}
        />

        {/* Return Policy */}
        <div className="border border-red-200 rounded-lg p-3 mb-6 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900">
              この商品は返品可能です
            </span>
            <button className="text-sm text-red-600 underline hover:text-red-700">
              詳細
            </button>
          </div>
          <p className="text-xs text-gray-600">
            返品の場合:返送料(同注文なら複数個でも) 一律¥660
          </p>
        </div>

        {/* Product Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-square">
              <img
                src={
                  images[selectedImageIndex] ||
                  imageUrl ||
                  "/img/model/model (1).png"
                }
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setSelectedImageIndex(
                        selectedImageIndex > 0
                          ? selectedImageIndex - 1
                          : images.length - 1
                      )
                    }
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white/90 rounded-full flex items-center justify-center z-20 shadow-lg cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800" />
                  </button>
                  <button
                    onClick={() =>
                      setSelectedImageIndex(
                        selectedImageIndex < images.length - 1
                          ? selectedImageIndex + 1
                          : 0
                      )
                    }
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white/90 rounded-full flex items-center justify-center z-20 shadow-lg cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === selectedImageIndex
                        ? "border-[#e2603f]"
                        : "border-gray-200"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-4">
            {/* Brand */}
            <div className="text-sm text-gray-600">
              {product.brand_name || "BACKYARD FAMILY (バックヤードファミリー)"}
            </div>

            {/* Product Name */}
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>

            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">
                  ¥{product.price.toLocaleString()}
                </span>
                <span className="text-sm text-gray-500">税込</span>
              </div>
              {product.compare_price &&
                product.compare_price > product.price && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg text-gray-400 line-through">
                      ¥{product.compare_price.toLocaleString()}
                    </span>
                    <span className="text-sm text-red-600 font-medium">
                      {discountPercentage}%OFF
                    </span>
                  </div>
                )}
            </div>

            {/* Coupon Info */}
            <div className="bg-gray-100 rounded-lg p-3">
              <p className="text-sm text-gray-700">
                クーポンを使えばさらに{couponDiscount.toLocaleString()}
                円引きできます!
                <span className="text-xs text-gray-500 ml-1">※適用条件</span>
              </p>
            </div>

            {/* Shop Info */}
            <div className="text-sm text-gray-600">
              ショップ:{" "}
              {product.brand_name || "BACKYARD FAMILY バックヤードファミリー"}
            </div>

            {/* Favorites */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleFavoriteToggle}
                className={`p-2 rounded-full transition-colors ${
                  isFavorited(product.id)
                    ? "text-red-500"
                    : "text-gray-400 hover:text-red-500"
                }`}
              >
                <Heart
                  className={`w-5 h-5 ${
                    isFavorited(product.id) ? "fill-current" : ""
                  }`}
                />
              </button>
              <span className="text-sm text-gray-600">
                お気に入り登録者数: {favoriteCount}人
              </span>
            </div>
            <p className="text-xs text-gray-500">
              お気に入りに登録すると値下げや再入荷の際にご連絡します
            </p>

            {/* Add to Cart */}
            <div className="pt-4 border-t">
              <AddToCartButton
                productId={product.id}
                isAuthenticated={isAuthenticated}
                isAdding={addingToCart}
                isInCart={isInCart}
                onAddToCart={handleAddToCart}
                onRemoveFromCart={handleRemoveFromCart}
              />
            </div>

            {/* Description */}
            {product.description && (
              <div className="pt-4 border-t">
                <h2 className="text-lg font-bold mb-2">商品説明</h2>
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">レビュー</h2>
          <div className="space-y-6">
            {reviews.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                レビューはまだありません
              </div>
            ) : (
              reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white border border-gray-200 rounded-lg p-6"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-gray-900">
                        {review.user_name}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "fill-none stroke-gray-300 text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString("ja-JP")}
                    </div>
                  </div>
                  <p className="text-gray-700">{review.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Similar Products Section */}
        {similarProducts.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">このカテゴリの人気アイテム</h2>
              {similarProducts.length > 6 && (
                <div className="hidden sm:flex space-x-2">
                  <button
                    onClick={() => {
                      if (similarProductsRef.current) {
                        const firstChild = similarProductsRef.current
                          .firstElementChild as HTMLElement;
                        if (firstChild) {
                          const productWidth = firstChild.offsetWidth;
                          const gap = 16;
                          const scrollAmount = (productWidth + gap) * 6 - gap;
                          similarProductsRef.current.scrollBy({
                            left: -scrollAmount,
                            behavior: "smooth",
                          });
                        }
                      }
                    }}
                    disabled={!canScrollLeftSimilar}
                    className={`w-8 h-8 sm:w-10 sm:h-10 border border-gray-300 bg-white flex items-center justify-center rounded-md shadow-sm ${
                      !canScrollLeftSimilar
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                  </button>
                  <button
                    onClick={() => {
                      if (similarProductsRef.current) {
                        const firstChild = similarProductsRef.current
                          .firstElementChild as HTMLElement;
                        if (firstChild) {
                          const productWidth = firstChild.offsetWidth;
                          const gap = 16;
                          const scrollAmount = (productWidth + gap) * 6 - gap;
                          similarProductsRef.current.scrollBy({
                            left: scrollAmount,
                            behavior: "smooth",
                          });
                        }
                      }
                    }}
                    disabled={!canScrollRightSimilar}
                    className={`w-8 h-8 sm:w-10 sm:h-10 border border-gray-300 bg-white flex items-center justify-center rounded-md shadow-sm ${
                      !canScrollRightSimilar
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <div
                ref={similarProductsRef}
                className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
                style={{ scrollBehavior: "smooth" }}
              >
                {similarProducts.map((item) => (
                  <Link
                    key={item.id}
                    to={`/product/${item.id}`}
                    className="group flex-shrink-0 w-[calc((100%-80px)/6)] min-w-[180px] sm:min-w-[200px] bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm flex flex-col cursor-pointer transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={item.image || "/img/model/model (1).png"}
                        alt={item.name}
                        className="w-full h-40 sm:h-48 object-cover"
                      />
                    </div>
                    <div className="p-3 sm:p-4 flex flex-col flex-grow">
                      <div className="text-xs text-gray-500 mb-1">
                        {item.brand_name || ""}
                      </div>
                      <div className="text-sm font-semibold text-gray-800 line-clamp-2 mb-2">
                        {item.name}
                      </div>
                      <div className="mt-auto">
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-bold text-red-600">
                            ¥{item.price.toLocaleString()}
                          </span>
                          {item.compare_price &&
                            item.compare_price > item.price && (
                              <span className="text-xs text-gray-400 line-through">
                                ¥{item.compare_price.toLocaleString()}
                              </span>
                            )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Brand Products Section */}
        {brandProducts.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">
                {product.brand_name || "BACKYARD FAMILY"}の人気アイテム
              </h2>
              {brandProducts.length > 6 && (
                <div className="hidden sm:flex space-x-2">
                  <button
                    onClick={() => {
                      if (brandProductsRef.current) {
                        const firstChild = brandProductsRef.current
                          .firstElementChild as HTMLElement;
                        if (firstChild) {
                          const productWidth = firstChild.offsetWidth;
                          const gap = 16;
                          const scrollAmount = (productWidth + gap) * 6 - gap;
                          brandProductsRef.current.scrollBy({
                            left: -scrollAmount,
                            behavior: "smooth",
                          });
                        }
                      }
                    }}
                    disabled={!canScrollLeftBrand}
                    className={`w-8 h-8 sm:w-10 sm:h-10 border border-gray-300 bg-white flex items-center justify-center rounded-md shadow-sm ${
                      !canScrollLeftBrand
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                  </button>
                  <button
                    onClick={() => {
                      if (brandProductsRef.current) {
                        const firstChild = brandProductsRef.current
                          .firstElementChild as HTMLElement;
                        if (firstChild) {
                          const productWidth = firstChild.offsetWidth;
                          const gap = 16;
                          const scrollAmount = (productWidth + gap) * 6 - gap;
                          brandProductsRef.current.scrollBy({
                            left: scrollAmount,
                            behavior: "smooth",
                          });
                        }
                      }
                    }}
                    disabled={!canScrollRightBrand}
                    className={`w-8 h-8 sm:w-10 sm:h-10 border border-gray-300 bg-white flex items-center justify-center rounded-md shadow-sm ${
                      !canScrollRightBrand
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <div
                ref={brandProductsRef}
                className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
                style={{ scrollBehavior: "smooth" }}
              >
                {brandProducts.map((item) => (
                  <Link
                    key={item.id}
                    to={`/product/${item.id}`}
                    className="group flex-shrink-0 w-[calc((100%-80px)/6)] min-w-[180px] sm:min-w-[200px] bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm flex flex-col cursor-pointer transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={item.image || "/img/model/model (1).png"}
                        alt={item.name}
                        className="w-full h-40 sm:h-48 object-cover"
                      />
                    </div>
                    <div className="p-3 sm:p-4 flex flex-col flex-grow">
                      <div className="text-xs text-gray-500 mb-1">
                        {item.brand_name || ""}
                      </div>
                      <div className="text-sm font-semibold text-gray-800 line-clamp-2 mb-2">
                        {item.name}
                      </div>
                      <div className="mt-auto">
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-bold text-red-600">
                            ¥{item.price.toLocaleString()}
                          </span>
                          {item.compare_price &&
                            item.compare_price > item.price && (
                              <span className="text-xs text-gray-400 line-through">
                                ¥{item.compare_price.toLocaleString()}
                              </span>
                            )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
};
