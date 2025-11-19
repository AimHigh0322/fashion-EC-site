import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Heart,
  ChevronLeft,
  ChevronRight,
  Star,
  ZoomIn,
  X,
  Plus,
  Minus,
} from "lucide-react";
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
  average_rating?: number;
  review_count?: number;
  campaigns?: Array<{
    id: string;
    name: string;
    description?: string;
    type: string;
    discount_percent?: number;
    fixed_price?: number;
    start_date: string;
    end_date: string;
    is_active: boolean;
  }>;
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
  const navigate = useNavigate();
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
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [showZoom, setShowZoom] = useState(false);
  const [zoomImageIndex, setZoomImageIndex] = useState(0);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);

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

          // Get all product images - ordered by sort_order from database
          const allImages: string[] = [];
          const productWithImages = productData as Product;

          // Get images from images array - sorted by sort_order (ascending)
          // This maintains the upload order as stored in the database
          if (productWithImages.images && productWithImages.images.length > 0) {
            // Sort by sort_order (ascending) to maintain upload order
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

          // If main_image_url exists and is not in the sorted images, add it at the beginning
          // Otherwise, if we have sorted images, they already include the main image in correct order
          if (productWithImages.main_image_url) {
            const mainImageUrl = getImageUrl(productWithImages.main_image_url);
            if (mainImageUrl && !allImages.includes(mainImageUrl)) {
              // Main image not in sorted list, add it first
              allImages.unshift(mainImageUrl);
            }
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

  // Load favorite count from database
  useEffect(() => {
    const loadFavoriteCount = async () => {
      if (!product?.id) return;

      try {
        const response = await apiService.getProductFavoriteCount(product.id);
        if (response.data && typeof response.data.count === "number") {
          setFavoriteCount(response.data.count);
        }
      } catch (error) {
        console.error("Failed to load favorite count:", error);
        // Keep default value of 0
      }
    };

    loadFavoriteCount();
  }, [product?.id]);

  // Load reviews from API
  useEffect(() => {
    const fetchReviews = async () => {
      if (!id) return;
      try {
        const response = await apiService.getProductReviews(
          id,
          "approved",
          10,
          0
        );
        if (response.data && response.data.reviews) {
          setReviews(
            response.data.reviews.map(
              (r: {
                id: string;
                username?: string;
                first_name?: string;
                rating: number;
                comment?: string;
                title?: string;
                createdAt: string;
              }) => ({
                id: r.id,
                user_name: r.username || r.first_name || "匿名",
                rating: r.rating,
                comment: r.comment || r.title || "",
                createdAt: r.createdAt,
              })
            )
          );
        }
      } catch (error) {
        console.error("Failed to load reviews:", error);
        setReviews([]);
      }
    };
    fetchReviews();
  }, [id]);

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

  // Load recently viewed products
  useEffect(() => {
    const loadRecentlyViewed = () => {
      try {
        const viewed = localStorage.getItem("recentlyViewed");
        if (viewed) {
          const viewedIds: string[] = JSON.parse(viewed);
          // Remove current product from list
          const filteredIds = viewedIds.filter((viewedId) => viewedId !== id);

          if (filteredIds.length > 0) {
            // Load products for recently viewed IDs
            Promise.all(
              filteredIds.slice(0, 8).map(async (productId) => {
                try {
                  const response = await apiService.getProduct(productId);
                  if (response.data) {
                    const productData = Array.isArray(response.data)
                      ? response.data[0]
                      : (response.data as { data?: Product }).data ||
                        response.data;

                    const baseUrl = (
                      import.meta.env.VITE_API_URL ||
                      "http://localhost:8888/api"
                    ).replace(/\/api$/, "");

                    let imageUrl =
                      (productData as Product).main_image_url || "";
                    if (imageUrl && !imageUrl.startsWith("http")) {
                      const cleanPath = imageUrl.startsWith("/")
                        ? imageUrl
                        : `/${imageUrl}`;
                      imageUrl = `${baseUrl}${cleanPath}`;
                    }

                    return {
                      ...(productData as Product),
                      image: imageUrl || "/img/model/model (1).png",
                    };
                  }
                } catch {
                  return null;
                }
              })
            ).then((products) => {
              setRecentlyViewed(
                products.filter((p) => p !== null) as Product[]
              );
            });
          }
        }
      } catch (err) {
        console.error("Failed to load recently viewed:", err);
      }
    };

    loadRecentlyViewed();
  }, [id]);

  // Save current product to recently viewed
  useEffect(() => {
    if (product && id) {
      try {
        const viewed = localStorage.getItem("recentlyViewed");
        const viewedIds: string[] = viewed ? JSON.parse(viewed) : [];
        // Remove current product if exists, then add to front
        const filteredIds = viewedIds.filter((viewedId) => viewedId !== id);
        const updatedIds = [id, ...filteredIds].slice(0, 20); // Keep last 20
        localStorage.setItem("recentlyViewed", JSON.stringify(updatedIds));
      } catch (err) {
        console.error("Failed to save recently viewed:", err);
      }
    }
  }, [product, id]);

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
      } else {
        success("お気に入りに追加しました");
      }
      // Reload favorite count from database
      try {
        const response = await apiService.getProductFavoriteCount(product.id);
        if (response.data && typeof response.data.count === "number") {
          setFavoriteCount(response.data.count);
        }
      } catch (error) {
        console.error("Failed to reload favorite count:", error);
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
      const success = await addToCart(product.id, quantity);
      if (success) {
        showToast(`${quantity}個の商品をカートに追加しました`, "success");
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

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      showToast("ログインが必要です", "warning");
      return;
    }

    if (!product) return;

    setAddingToCart(true);
    try {
      // Add to cart first
      const success = await addToCart(product.id, quantity);
      if (success) {
        // Navigate to checkout
        navigate("/checkout");
      } else {
        error("カートへの追加に失敗しました");
      }
    } catch {
      error("カートへの追加に失敗しました");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (!product) return;
    const maxQuantity = product.stock_quantity || 99;
    const minQuantity = 1;

    if (newQuantity < minQuantity) {
      setQuantity(minQuantity);
    } else if (newQuantity > maxQuantity) {
      setQuantity(maxQuantity);
      showToast(`在庫数は${maxQuantity}個までです`, "warning");
    } else {
      setQuantity(newQuantity);
    }
  };

  const openZoom = (index: number) => {
    setZoomImageIndex(index);
    setShowZoom(true);
  };

  const closeZoom = () => {
    setShowZoom(false);
  };

  const handleZoomImageChange = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setZoomImageIndex(
        zoomImageIndex > 0 ? zoomImageIndex - 1 : images.length - 1
      );
    } else {
      setZoomImageIndex(
        zoomImageIndex < images.length - 1 ? zoomImageIndex + 1 : 0
      );
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

  // Calculate discount rate (割引率)
  const discountRate =
    product.compare_price &&
    product.price &&
    product.compare_price > product.price
      ? Math.round(
          ((product.compare_price - product.price) / product.compare_price) *
            100
        )
      : 0;

  // Base price (通常価格) - compare_price or price if no compare_price
  const basePrice =
    product.compare_price && product.compare_price > product.price
      ? product.compare_price
      : product.price;

  // Sale price (セール価格) - current price if discounted, otherwise same as base
  const salePrice = product.price;

  // Check if product is on sale
  const isOnSale =
    product.compare_price && product.compare_price > product.price;

  // Stock status
  const isInStock = (product.stock_quantity || 0) > 0;
  const stockStatus = isInStock ? "在庫あり" : "在庫切れ";

  // Average rating and review count
  const averageRating = product.average_rating || 0;
  const reviewCount = product.review_count || 0;

  // Active campaigns
  const activeCampaigns =
    product.campaigns?.filter((campaign) => campaign.is_active) || [];

  // Shipping time estimate (出荷目安)
  const getShippingEstimate = () => {
    if (!isInStock) return "在庫切れのため出荷できません";
    // Default: 1-3 business days
    return "1-3営業日";
  };

  const couponDiscount = Math.floor(product.price * 0.05);

  return (
    <UserLayout>
      <div className="max-w-[1440px] mx-auto px-4 py-6">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[{ label: "商品一覧", path: "/" }, { label: product.name }]}
        />

        {/* Return Policy */}
        <div className="border border-red-200  p-3 mb-6 bg-white">
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
            {/* Main Image with Zoom */}
            <div className="relative bg-gray-100  overflow-hidden aspect-square group cursor-zoom-in">
              <img
                src={
                  images[selectedImageIndex] ||
                  imageUrl ||
                  "/img/model/model (1).png"
                }
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onClick={() => openZoom(selectedImageIndex)}
              />
              {/* Zoom Icon Overlay */}
              <div className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="w-5 h-5" />
              </div>
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex(
                        selectedImageIndex > 0
                          ? selectedImageIndex - 1
                          : images.length - 1
                      );
                    }}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white/90 rounded-full flex items-center justify-center z-20 shadow-lg cursor-pointer hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex(
                        selectedImageIndex < images.length - 1
                          ? selectedImageIndex + 1
                          : 0
                      );
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white/90 rounded-full flex items-center justify-center z-20 shadow-lg cursor-pointer hover:bg-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Gallery - Ordered by sort_order */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20  overflow-hidden border-2 transition-all hover:border-[#e2603f] ${
                      idx === selectedImageIndex
                        ? "border-[#e2603f] ring-2 ring-[#e2603f] ring-opacity-50"
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
              Brand Name: {product.brand_name || "データなし"}
            </div>

            {/* Product Name */}
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>

            {/* Campaign/Event Labels */}
            {activeCampaigns.length > 0 && (
              <div className="space-y-2">
                {activeCampaigns.map((campaign) => {
                  const startDate = new Date(campaign.start_date);
                  const endDate = new Date(campaign.end_date);
                  const now = new Date();
                  const isActive = now >= startDate && now <= endDate;

                  if (!isActive) return null;

                  return (
                    <div
                      key={campaign.id}
                      className="bg-gradient-to-r from-red-500 to-pink-500 text-white  p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm mb-1">
                            {campaign.name}
                          </div>
                          {campaign.description && (
                            <div className="text-xs opacity-90">
                              {campaign.description}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs opacity-90 mb-1">
                            割引期間
                          </div>
                          <div className="text-xs font-medium">
                            {startDate.toLocaleDateString("ja-JP", {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            -{" "}
                            {endDate.toLocaleDateString("ja-JP", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Average Rating and Review Count */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.round(averageRating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "fill-none stroke-gray-300 text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {averageRating.toFixed(1)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                ({reviewCount}件のレビュー)
              </div>
            </div>

            {/* Stock Status Indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`px-5 py-1 rounded-full text-sm font-medium ${
                  isInStock
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {stockStatus}
              </div>
              <span className="text-sm text-gray-600">
                在庫数: {product.stock_quantity || 0}個
              </span>
            </div>

            {/* Shipping Time Estimate */}
            <div className="bg-blue-50 border border-blue-200 p-3">
              <div className="text-sm text-blue-900">
                <span className="font-medium">出荷目安:</span>{" "}
                {getShippingEstimate()}
              </div>
            </div>

            {/* Price Section */}
            <div className="space-y-2">
              {/* Base Price (通常価格) - Only show if different from sale price */}
              {isOnSale && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">通常価格:</span>
                  <span className="text-lg text-gray-400 line-through">
                    ¥{basePrice.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Sale Price / Current Price */}
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#e2603f]">
                  ¥{salePrice.toLocaleString()}
                </span>
                <span className="text-sm text-gray-500">税込</span>
                {isOnSale && discountRate > 0 && (
                  <span className="ml-2 px-2 py-1 bg-red-100 text-red-600 text-sm font-bold rounded">
                    {discountRate}%OFF
                  </span>
                )}
              </div>

              {/* Discount Rate Badge */}
              {isOnSale && discountRate > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">割引率:</span>
                  <span className="text-red-600 font-bold">
                    {discountRate}%
                  </span>
                </div>
              )}
            </div>

            {/* Coupon Info */}
            <div className="bg-gray-100  p-3">
              <p className="text-sm text-gray-700">
                クーポンを使えばさらに{couponDiscount.toLocaleString()}
                円引きできます!
                <span className="text-xs text-gray-500 ml-1">※適用条件</span>
              </p>
            </div>

            {/* Shipping Method (配送方法) */}
            <div className="bg-white border border-gray-200  p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  配送方法:
                </span>
                <span className="text-sm text-gray-900">
                  {isInStock
                    ? "宅配便（ヤマト運輸・佐川急便）"
                    : "在庫切れのため配送不可"}
                </span>
              </div>
              {isInStock && (
                <div className="mt-2 text-xs text-gray-500">
                  全国送料無料（一部地域を除く）
                </div>
              )}
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

            {/* Quantity Selector */}
            <div className="pt-4 border-t">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                数量
              </label>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                    className="w-8 h-8 flex items-center justify-center border border-gray-300  hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-medium">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={quantity >= (product.stock_quantity || 99)}
                    className="w-8 h-8 flex items-center justify-center border border-gray-300  hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-sm text-gray-500">
                  在庫: {product.stock_quantity || 0}個
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Buy Now Button */}
              <button
                onClick={handleBuyNow}
                disabled={
                  addingToCart ||
                  !isAuthenticated ||
                  product.stock_quantity === 0
                }
                className="w-full transition-all duration-200 shadow-sm flex items-center justify-center gap-2 text-xs sm:text-sm font-medium py-2 px-4 rounded-full cursor-pointer bg-[#e2603f] hover:bg-[#c95a42] disabled:bg-gray-300 disabled:cursor-not-allowed text-white"
              >
                {addingToCart ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>処理中...</span>
                  </>
                ) : (
                  <>
                    <span>今すぐ購入</span>
                  </>
                )}
              </button>

              {/* Add to Cart Button */}
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">レビュー</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.round(averageRating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "fill-none stroke-gray-300 text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-lg font-bold text-gray-900">
                  {averageRating.toFixed(1)}
                </span>
              </div>
              <span className="text-sm text-gray-600">全{reviewCount}件</span>
            </div>
          </div>
          <div className="space-y-6">
            {reviews.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 ">
                <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">
                  レビューはまだありません
                </p>
                <p className="text-sm text-gray-500">
                  この商品の最初のレビューを書いてみませんか？
                </p>
              </div>
            ) : (
              reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white border border-gray-200  p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="font-medium text-gray-900">
                          {review.user_name}
                        </div>
                        <div className="flex items-center gap-1">
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
                          <span className="ml-2 text-sm text-gray-500">
                            {review.rating}/5
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-gray-700 leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recently Viewed Products */}
        {recentlyViewed.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">最近閲覧した商品</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {recentlyViewed.map((item) => (
                <Link
                  key={item.id}
                  to={`/product/${item.id}`}
                  className="group bg-white border border-gray-200 overflow-hidden shadow-sm flex flex-col cursor-pointer transition-all duration-300 hover:shadow-lg"
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={item.image || "/img/model/model (1).png"}
                      alt={item.name}
                      className="w-full h-40 sm:h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3 sm:p-4 flex flex-col flex-grow">
                    <div className="text-xs text-gray-500 mb-1 line-clamp-1">
                      {item.brand_name || ""}
                    </div>
                    <div className="text-sm font-semibold text-gray-800 line-clamp-2 mb-2 flex-grow">
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
        )}

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
                    className={`w-8 h-8 sm:w-10 sm:h-10 border border-gray-300 bg-white flex items-center justify-center  shadow-sm ${
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
                    className={`w-8 h-8 sm:w-10 sm:h-10 border border-gray-300 bg-white flex items-center justify-center  shadow-sm ${
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
                    className="group flex-shrink-0 w-[calc((100%-80px)/6)] min-w-[180px] sm:min-w-[200px] bg-white border border-gray-200 overflow-hidden shadow-sm flex flex-col cursor-pointer transition-all duration-300 hover:shadow-lg"
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
                    className={`w-8 h-8 sm:w-10 sm:h-10 border border-gray-300 bg-white flex items-center justify-center  shadow-sm ${
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
                    className={`w-8 h-8 sm:w-10 sm:h-10 border border-gray-300 bg-white flex items-center justify-center  shadow-sm ${
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
                    className="group flex-shrink-0 w-[calc((100%-80px)/6)] min-w-[180px] sm:min-w-[200px] bg-white border border-gray-200 overflow-hidden shadow-sm flex flex-col cursor-pointer transition-all duration-300 hover:shadow-lg"
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

      {/* Image Zoom Modal */}
      {showZoom && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={closeZoom}
        >
          <button
            onClick={closeZoom}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <X className="w-8 h-8" />
          </button>

          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img
              src={
                images[zoomImageIndex] || imageUrl || "/img/model/model (1).png"
              }
              alt={product.name}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleZoomImageChange("prev");
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleZoomImageChange("next");
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Image Counter */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                  {zoomImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </UserLayout>
  );
};
