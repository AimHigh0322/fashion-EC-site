import { useState, useEffect, useMemo, useRef } from "react";
import { Heart, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useFavorites } from "../../contexts/FavoritesContext";
import { useCart } from "../../contexts/CartContext";
import { useToast } from "../../contexts/ToastContext";
import { apiService } from "../../services/api";
import { AddToCartButton } from "../../components/molecules/AddToCartButton";
import { UserLayout } from "../../components/layouts/UserLayout";

export const HomePage = () => {
  const [cartProductIds, setCartProductIds] = useState<Set<string>>(new Set());
  const { isAuthenticated } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites();
  const { addToCart: addToCartContext, removeFromCart: removeFromCartContext } =
    useCart();
  const { showToast, success, error } = useToast();
  const [mainBannerIndex, setMainBannerIndex] = useState(0);
  const [thumbnailIndex, setThumbnailIndex] = useState(0);
  const thumbnailCarouselRef = useRef<HTMLDivElement>(null);
  const [banners, setBanners] = useState<
    Array<{
      image: string;
      title: string;
      description: string;
      page_url?: string;
      display_text?: string;
      title_color?: string;
      description_color?: string;
      title_font_size?: string;
      title_position?: string;
      title_vertical_position?: string;
      description_font_size?: string;
      description_position?: string;
      description_vertical_position?: string;
    }>
  >([]);
  const [loadingBanners, setLoadingBanners] = useState(true);

  // カテゴリデータ
  const categories = [
    {
      name: "上着",
      image: "/img/product/top/top (2).png",
      color: "from-blue-500 to-blue-600",
    },
    {
      name: "下着",
      image: "/img/product/top/top (1).jpg",
      color: "from-pink-500 to-pink-600",
    },
    {
      name: "靴",
      image: "/img/product/shoe/shoe (9).jpg",
      color: "bg-[#e2603f]",
    },
    {
      name: "バッグ",
      image: "/img/product/bag/bag (2).jpg",
      color: "from-amber-500 to-amber-600",
    },
    {
      name: "靴下",
      image: "/img/product/sock/sock (2).jpg",
      color: "from-green-500 to-green-600",
    },
    {
      name: "帽子",
      image: "/img/product/cap/cap.jpg",
      color: "from-yellow-500 to-yellow-600",
    },
    {
      name: "シャツ",
      image: "/img/product/top/top (4).png",
      color: "from-purple-500 to-purple-600",
    },
    {
      name: "ズボン",
      image: "/img/product/trousers/trousers.jpg",
      color: "from-indigo-500 to-indigo-600",
    },
    {
      name: "スーツ",
      image: "/img/product/top/top (5).jpg",
      color: "from-gray-500 to-gray-600",
    },
    {
      name: "財布",
      image: "/img/product/bag/bag (2).jpg",
      color: "from-rose-500 to-rose-600",
    },
    {
      name: "イヤリング",
      image: "/img/product/ear/ear.jpg",
      color: "from-teal-500 to-teal-600",
    },
    {
      name: "マフラー",
      image: "/img/product/neck/neck.jpg",
      color: "from-red-500 to-red-600",
    },
    {
      name: "手袋",
      image: "/img/product/glove/glove.jpg",
      color: "from-emerald-500 to-emerald-600",
    },
    {
      name: "マスク",
      image: "/img/product/mask/mask.jpg",
      color: "from-slate-500 to-slate-600",
    },
    {
      name: "メガネ",
      image: "/img/product/glass/glass.jpg",
      color: "from-cyan-500 to-cyan-600",
    },
  ];

  // おすすめ商品データ - Load from API
  const [recommendedProducts, setRecommendedProducts] = useState<
    Array<{
      id: string;
      sku: string;
      title: string;
      description: string;
      price: number;
      compare_price: number | null;
      stock_quantity: number;
      status: string;
      brand_name: string;
      rating: number;
      reviews: number;
      image: string;
      badges: string[];
      delivery: string;
      product_url: string;
      weight: number | null;
      dimensions: string | null;
      category_names: string;
      createdAt: string;
      updatedAt: string;
    }>
  >([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

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
          // Silently fail if not authenticated or cart is empty
          setCartProductIds(new Set());
        }
      } else {
        setCartProductIds(new Set());
      }
    };
    loadCartData();
  }, [isAuthenticated]);

  // Load products from API
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        const response = await apiService.getProducts({
          status: "active",
          limit: 6,
        });

        if (response.data && Array.isArray(response.data)) {
          const baseUrl = (
            import.meta.env.VITE_API_URL || "http://localhost:8888/api"
          ).replace(/\/api$/, "");

          const formattedProducts = response.data.map(
            (product: {
              id: string;
              sku?: string;
              name?: string;
              description?: string;
              price?: number;
              compare_price?: number;
              cost_price?: number;
              stock_quantity?: number;
              status?: string;
              brand_id?: string;
              brand_name?: string;
              main_image_url?: string;
              product_url?: string;
              weight?: number;
              dimensions?: string;
              seo_title?: string;
              seo_description?: string;
              is_featured?: boolean;
              category_count?: number;
              category_names?: string;
              createdAt?: string;
              updatedAt?: string;
              [key: string]: unknown;
            }) => {
              let imageUrl = product.main_image_url || "";
              if (imageUrl && !imageUrl.startsWith("http")) {
                const cleanPath = imageUrl.startsWith("/")
                  ? imageUrl
                  : `/${imageUrl}`;
                imageUrl = `${baseUrl}${cleanPath}`;
              }

              // Build badges based on product data
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
                rating: 4.5, // Default rating (can be added to products table later)
                reviews: 0, // Default reviews (can be added to products table later)
                image: imageUrl || "/img/model/model (1).png",
                badges: badges.length > 0 ? badges : ["送料無料"], // Default badge if none
                delivery: product.description || "",
                // Include all product data for future use
                product_url: product.product_url || "",
                weight: product.weight || null,
                dimensions: product.dimensions || null,
                category_names: product.category_names || "",
                createdAt: product.createdAt || "",
                updatedAt: product.updatedAt || "",
              };
            }
          );

          setRecommendedProducts(formattedProducts);
        }
      } catch (error) {
        console.error("Failed to load products:", error);
        // Fallback to empty array or show error
        setRecommendedProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  // トップピックバナー
  const topPicks = [
    {
      id: 1,
      title: "2025年春夏コレクション新入荷!トレンドを先取り",
      product: "春夏新作コレクション",
      image: "/img/model/model (5).png",
    },
    {
      id: 2,
      title: "ビジネスシーンに最適!上質なスーツコレクション",
      product: "メンズスーツ",
      image: "/img/model/model (3).png",
    },
    {
      id: 3,
      title: "カジュアルからフォーマルまで!ワードローブを充実",
      product: "レディースコレクション",
      image: "/img/model/model (7).png",
    },
    {
      id: 4,
      title: "機能性とデザイン性を兼ね備えたシューズ特集",
      product: "シューズコレクション",
      image: "/img/model/model (8).png",
    },
  ];

  // Load banners from API
  useEffect(() => {
    const loadBanners = async () => {
      try {
        setLoadingBanners(true);
        const response = await apiService.getActiveBanners();

        console.log("Banner API Response:", response);
        console.log("Response data type:", typeof response.data);
        console.log("Response data is array:", Array.isArray(response.data));

        // Handle different response structures
        let bannersData: Array<{
          image_url?: string;
          name?: string;
          title?: string;
          description?: string;
          page_url?: string;
          display_text?: string;
        }> = [];

        if (response.data) {
          if (Array.isArray(response.data)) {
            bannersData = response.data;
            console.log("Using direct array from response.data");
          } else if (
            typeof response.data === "object" &&
            "data" in response.data &&
            Array.isArray((response.data as { data: unknown }).data)
          ) {
            bannersData = (
              response.data as {
                data: Array<{
                  image_url?: string;
                  name?: string;
                  title?: string;
                  description?: string;
                }>;
              }
            ).data;
            console.log("Using nested data array from response.data.data");
          } else {
            console.log("Unexpected response.data structure:", response.data);
          }
        } else {
          console.log("No data in response");
        }

        console.log("Banners Data Count:", bannersData.length);
        console.log("Banners Data:", bannersData);

        if (bannersData.length > 0) {
          const baseUrl = (
            import.meta.env.VITE_API_URL || "http://localhost:8888/api"
          ).replace(/\/api$/, "");

          const formattedBanners = bannersData
            .filter((banner) => banner.image_url) // Only include banners with images
            .map(
              (banner: {
                image_url?: string;
                name?: string;
                title?: string;
                description?: string;
                page_url?: string;
                display_text?: string;
                title_color?: string;
                description_color?: string;
                title_font_size?: string;
                title_position?: string;
                title_vertical_position?: string;
                description_font_size?: string;
                description_position?: string;
                description_vertical_position?: string;
              }) => {
                let imageUrl = banner.image_url || "";

                // Handle image URL
                if (imageUrl && !imageUrl.startsWith("http")) {
                  // Remove leading slash if present, then add it back
                  const cleanPath = imageUrl.startsWith("/")
                    ? imageUrl
                    : `/${imageUrl}`;
                  imageUrl = `${baseUrl}${cleanPath}`;
                }

                const formattedBanner = {
                  image: imageUrl,
                  title: banner.title || banner.name || "", // Use title first, fallback to name
                  description: banner.description || "",
                  page_url: banner.page_url || "",
                  display_text: banner.display_text || "",
                  title_color: banner.title_color || "#FFFFFF",
                  description_color: banner.description_color || "#FFFFFF",
                  title_font_size: banner.title_font_size || "text-4xl",
                  title_position: banner.title_position || "left",
                  title_vertical_position:
                    banner.title_vertical_position || "middle",
                  description_font_size:
                    banner.description_font_size || "text-lg",
                  description_position: banner.description_position || "left",
                  description_vertical_position:
                    banner.description_vertical_position || "middle",
                };

                console.log("Banner mapping:", {
                  original: banner,
                  formatted: formattedBanner,
                });

                return formattedBanner;
              }
            );

          console.log("Formatted Banners:", formattedBanners);
          console.log("First banner details:", formattedBanners[0]);
          setBanners(formattedBanners);

          // Reset indices when banners are loaded
          if (formattedBanners.length > 0) {
            setMainBannerIndex(0);
            setThumbnailIndex(0);
          }
        } else {
          console.log("No banners found");
          setBanners([]);
        }
      } catch (error) {
        console.error("Failed to load banners:", error);
        // Fallback to empty array
        setBanners([]);
      } finally {
        setLoadingBanners(false);
      }
    };

    loadBanners();
  }, []);

  // Use banners from API, fallback to empty array
  const thumbnailImages = useMemo(() => {
    return banners.length > 0 ? banners : [];
  }, [banners]);

  // Main banner is independent from thumbnails
  const currentBanner = useMemo(() => {
    return (
      thumbnailImages[mainBannerIndex] || {
        image: "",
        title: "",
        description: "",
      }
    );
  }, [thumbnailImages, mainBannerIndex]);

  // Debug: Log current banner data
  useEffect(() => {
    if (currentBanner && currentBanner.image) {
      console.log("Current Banner:", currentBanner);
      console.log("Current Banner Title:", currentBanner.title);
      console.log("Current Banner Description:", currentBanner.description);
    }
  }, [currentBanner]);

  const handleThumbnailClick = (index: number) => {
    setThumbnailIndex(index);
    // Update main banner to show the clicked thumbnail
    setMainBannerIndex(index);
  };

  // Handle thumbnail carousel navigation (5 images at a time)
  const handleThumbnailCarouselPrev = () => {
    const newIndex = Math.max(0, thumbnailIndex - 5);
    setThumbnailIndex(newIndex);
    // Scroll to the new position
    if (thumbnailCarouselRef.current) {
      const targetElement = thumbnailCarouselRef.current.children[
        newIndex
      ] as HTMLElement;
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "start",
        });
      }
    }
  };

  const handleThumbnailCarouselNext = () => {
    const newIndex = Math.min(thumbnailImages.length - 1, thumbnailIndex + 5);
    setThumbnailIndex(newIndex);
    // Scroll to the new position
    if (thumbnailCarouselRef.current) {
      const targetElement = thumbnailCarouselRef.current.children[
        newIndex
      ] as HTMLElement;
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "start",
        });
      }
    }
  };

  // Handle main banner navigation
  const handleMainBannerPrev = () => {
    // Calculate current group boundaries (5 images per group)
    const currentGroupStart = Math.floor(mainBannerIndex / 5) * 5;
    const isFirstInGroup = mainBannerIndex === currentGroupStart;

    if (isFirstInGroup) {
      // Move to previous group (or wrap to last group if at the beginning)
      const prevGroupStart = currentGroupStart - 5;
      let newIndex: number;
      if (prevGroupStart < 0) {
        // Wrap to last group's last image
        const lastGroupStart = Math.floor((thumbnailImages.length - 1) / 5) * 5;
        const lastGroupEnd = Math.min(
          thumbnailImages.length - 1,
          lastGroupStart + 4
        );
        newIndex = lastGroupEnd;
      } else {
        newIndex = prevGroupStart;
      }
      setMainBannerIndex(newIndex);
      setThumbnailIndex(newIndex);
      // Scroll thumbnail carousel to show the previous group
      if (thumbnailCarouselRef.current) {
        const targetElement = thumbnailCarouselRef.current.children[
          newIndex
        ] as HTMLElement;
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "start",
          });
        }
      }
    } else {
      // Move to previous image in the same group
      const newIndex = mainBannerIndex - 1;
      setMainBannerIndex(newIndex);
      setThumbnailIndex(newIndex);
    }
  };

  const handleMainBannerNext = () => {
    // Calculate current group boundaries (5 images per group)
    const currentGroupStart = Math.floor(mainBannerIndex / 5) * 5;
    const currentGroupEnd = Math.min(
      thumbnailImages.length - 1,
      currentGroupStart + 4
    );
    const isLastInGroup = mainBannerIndex === currentGroupEnd;

    if (isLastInGroup) {
      // Move to next group (or wrap to first group if at the end)
      const nextGroupStart = currentGroupStart + 5;
      const newIndex =
        nextGroupStart >= thumbnailImages.length ? 0 : nextGroupStart;
      setMainBannerIndex(newIndex);
      setThumbnailIndex(newIndex);
      // Scroll thumbnail carousel to show the next group
      if (thumbnailCarouselRef.current) {
        const targetElement = thumbnailCarouselRef.current.children[
          newIndex
        ] as HTMLElement;
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "start",
          });
        }
      }
    } else {
      // Move to next image in the same group
      const newIndex = mainBannerIndex + 1;
      setMainBannerIndex(newIndex);
      setThumbnailIndex(newIndex);
    }
  };

  // Helper function to get responsive font size classes
  const getResponsiveTitleSize = (apiFontSize?: string) => {
    if (!apiFontSize) {
      return "text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl";
    }
    // Map API font sizes to responsive classes
    const sizeMap: { [key: string]: string } = {
      "text-xs": "text-xs sm:text-sm md:text-sm lg:text-xs",
      "text-sm": "text-sm sm:text-base md:text-lg lg:text-sm",
      "text-base": "text-base sm:text-lg md:text-xl lg:text-base",
      "text-lg": "text-base sm:text-lg md:text-xl lg:text-lg",
      "text-xl": "text-base sm:text-lg md:text-xl lg:text-xl",
      "text-2xl": "text-base sm:text-lg md:text-xl lg:text-2xl",
      "text-3xl": "text-base sm:text-lg md:text-xl lg:text-3xl",
      "text-4xl": "text-base sm:text-lg md:text-xl lg:text-4xl",
      "text-5xl": "text-base sm:text-lg md:text-2xl lg:text-5xl",
      "text-6xl": "text-base sm:text-lg md:text-2xl lg:text-6xl",
    };
    return (
      sizeMap[apiFontSize] || "text-base sm:text-lg md:text-xl lg:text-2xl"
    );
  };

  const getResponsiveDescriptionSize = (apiFontSize?: string) => {
    if (!apiFontSize) {
      return "text-xs sm:text-sm md:text-base";
    }
    // Map API font sizes to responsive classes
    const sizeMap: { [key: string]: string } = {
      "text-xs": "text-xs sm:text-xs md:text-sm lg:text-xs",
      "text-sm": "text-xs sm:text-sm md:text-base lg:text-sm",
      "text-base": "text-xs sm:text-sm md:text-base lg:text-base",
      "text-lg": "text-xs sm:text-sm md:text-base lg:text-lg",
      "text-xl": "text-xs sm:text-sm md:text-base lg:text-xl",
    };
    return sizeMap[apiFontSize] || "text-xs sm:text-sm md:text-base";
  };

  return (
    <UserLayout>
      {/* Main Content */}
      <div className="max-w-[1440px] mx-auto px-4">
        {/* Banner Section - Following Wireframe Design */}
        <div className="mb-8">
          {/* Top Banner Row */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Main Banner Section (Left - 2/3 width) */}
            <div className="w-full lg:flex-[2] relative bg-gray-100 overflow-hidden">
              {loadingBanners ? (
                <div className="w-full aspect-[950/370] flex items-center justify-center">
                  <div className="text-gray-500">読み込み中...</div>
                </div>
              ) : currentBanner.image ? (
                <>
                  <img
                    src={currentBanner.image}
                    alt={currentBanner.title || "Banner"}
                    className="w-full h-full object-cover"
                    style={{ aspectRatio: "950/370" }}
                  />
                  {/* Banner Title and Description Overlay */}
                  <div
                    className={`absolute inset-0 flex z-10 p-4 sm:p-6 md:p-8 lg:p-12 ${
                      currentBanner.title_vertical_position === "top"
                        ? "items-start"
                        : currentBanner.title_vertical_position === "bottom"
                        ? "items-end"
                        : "items-center"
                    }`}
                  >
                    <div className="w-full space-y-2 sm:space-y-3 md:space-y-4">
                      {currentBanner.title && (
                        <div
                          className={`w-full ${
                            currentBanner.title_position === "center"
                              ? "text-center"
                              : currentBanner.title_position === "right"
                              ? "text-right"
                              : "text-left"
                          }`}
                        >
                          <h2
                            className={`${getResponsiveTitleSize(
                              currentBanner.title_font_size
                            )} font-bold leading-tight`}
                            style={{
                              color: currentBanner.title_color || "#FFFFFF",
                            }}
                          >
                            {currentBanner.title}
                          </h2>
                        </div>
                      )}
                      {currentBanner.description && (
                        <div
                          className={`w-full ${
                            currentBanner.description_position === "center"
                              ? "text-center"
                              : currentBanner.description_position === "right"
                              ? "text-right"
                              : "text-left"
                          }`}
                        >
                          <p
                            className={`${getResponsiveDescriptionSize(
                              currentBanner.description_font_size
                            )} leading-relaxed`}
                            style={{
                              color:
                                currentBanner.description_color || "#FFFFFF",
                            }}
                          >
                            {currentBanner.description}
                          </p>
                        </div>
                      )}
                      {!currentBanner.title && !currentBanner.description && (
                        <div className="text-white/80 text-base text-left">
                          タイトルと説明を追加してください
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full aspect-[950/370] flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                  <div className="text-lg font-medium mb-2">
                    バナーがありません
                  </div>
                  <div className="text-sm text-gray-500">
                    管理画面でバナーを追加してください
                  </div>
                </div>
              )}

              {/* Navigation Arrows - Main Banner */}
              {thumbnailImages.length > 1 && (
                <>
                  <button
                    onClick={handleMainBannerPrev}
                    className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white/90 hover:bg-[#e2603f] rounded-full flex items-center justify-center z-20 shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 group cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800 group-hover:text-white transition-all duration-300 group-hover:-translate-x-1" />
                  </button>
                  <button
                    onClick={handleMainBannerNext}
                    className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white/90 hover:bg-[#e2603f] rounded-full flex items-center justify-center z-20 shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 group cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800 group-hover:text-white transition-all duration-300 group-hover:translate-x-1" />
                  </button>
                </>
              )}
            </div>

            {/* Right Side Promotional Sections (Right - 1/3 width) */}
            <div className="w-full lg:flex-1 grid grid-cols-2 gap-3">
              {/* 01 即日翌日配送 */}
              <div className="bg-[#f0f7ff] rounded-lg p-2 sm:p-3 relative overflow-hidden">
                <div className="flex flex-row gap-1 sm:gap-2 items-center">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1565c0] mb-1 sm:mb-2">
                    01
                  </h2>
                  <h3 className="text-[10px] sm:text-xs font-bold text-[#1565c0] mb-1 sm:mb-2">
                    即日翌日配送
                  </h3>
                </div>
                <div className="relative h-16 sm:h-20 mb-1 sm:mb-2 flex items-center justify-center">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white rounded flex items-center justify-center">
                      <span className="text-[8px] sm:text-[10px] md:text-xs text-gray-700">
                        シャツ
                      </span>
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white rounded flex items-center justify-center">
                      <span className="text-[8px] sm:text-[10px] md:text-xs text-gray-700">
                        パンツ
                      </span>
                    </div>
                  </div>
                  <div className="absolute top-0 left-0 bg-[#b3d9ff] border-2 border-white rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 text-[#1565c0] text-[8px] sm:text-[10px] font-medium">
                    ファッションアイテムがすぐ届く!
                  </div>
                </div>
                <p className="text-[8px] sm:text-[10px] text-gray-700 font-medium">
                  14時までのご注文で最短翌日にお届け!
                </p>
              </div>

              {/* 02 当日お届け */}
              <div className="bg-[#f0f7ff] rounded-lg p-2 sm:p-3 relative overflow-hidden">
                <div className="flex flex-row gap-1 sm:gap-2 items-center">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1565c0] mb-1 sm:mb-2">
                    02
                  </h2>
                  <h3 className="text-[10px] sm:text-xs font-bold text-[#1565c0] mb-1 sm:mb-2">
                    当日お届け
                  </h3>
                </div>

                <div className="relative h-16 sm:h-20 mb-1 sm:mb-2 flex items-center justify-center">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-[#b3d9ff] rounded-full flex items-center justify-center">
                    <span className="text-[8px] sm:text-[10px] md:text-xs text-[#1565c0] font-medium">
                      配達員
                    </span>
                  </div>
                  <div className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-[#b3d9ff] border-2 border-white rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 text-[#1565c0] text-[8px] sm:text-[10px] font-medium">
                    スタッフがお届け!
                  </div>
                </div>
                <p className="text-[8px] sm:text-[10px] text-gray-700 font-medium">
                  14時までのご注文で最短当日中にお届け!
                </p>
              </div>

              {/* 03 おみせde受取 */}
              <div className="bg-[#283593] rounded-lg p-2 sm:p-3 relative overflow-hidden">
                <div className="flex flex-row gap-1 sm:gap-2 items-center">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2">
                    03
                  </h2>
                  <h3 className="text-[10px] sm:text-xs font-bold text-white mb-1 sm:mb-2">
                    おみせde受取
                  </h3>
                </div>
                <div className="relative h-16 sm:h-20 mb-1 sm:mb-2 flex items-center justify-center">
                  <div className="w-12 h-10 sm:w-14 sm:h-12 md:w-16 md:h-12 bg-[#1a237e] rounded flex items-center justify-center">
                    <span className="text-[8px] sm:text-[10px] md:text-xs text-white">
                      店舗
                    </span>
                  </div>
                  <div className="absolute top-0 right-1 sm:right-2 bg-[#e2603f] border-2 border-white rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 text-white text-[8px] sm:text-[10px] font-bold">
                    新サービス開始!
                  </div>
                </div>
                <p className="text-[8px] sm:text-[10px] text-white font-medium">
                  店舗で試着してから受取可能! 詳しくはこちら
                </p>
              </div>

              {/* 04 返品・交換保証 */}
              <div className="bg-[#f0f7ff] rounded-lg p-2 sm:p-3 relative overflow-hidden">
                <div className="flex flex-row gap-1 sm:gap-2 items-center">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1565c0] mb-1 sm:mb-2">
                    04
                  </h2>
                  <h3 className="text-[10px] sm:text-xs font-bold text-[#1565c0] mb-1 sm:mb-2">
                    返品・交換保証
                  </h3>
                </div>

                <div className="relative h-16 sm:h-20 mb-1 sm:mb-2 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                    <div className="flex gap-0.5 sm:gap-1">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-400 rounded flex items-center justify-center text-[8px] sm:text-xs font-bold text-gray-700">
                        1
                      </div>
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-400 rounded flex items-center justify-center text-[8px] sm:text-xs font-bold text-gray-700">
                        2
                      </div>
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-400 rounded flex items-center justify-center text-[8px] sm:text-xs font-bold text-gray-700">
                        3
                      </div>
                    </div>
                    <div className="flex gap-0.5 sm:gap-1">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-400 rounded flex items-center justify-center text-[8px] sm:text-xs font-bold text-gray-700">
                        4
                      </div>
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-400 rounded flex items-center justify-center text-[8px] sm:text-xs font-bold text-gray-700">
                        5
                      </div>
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-500 rounded flex items-center justify-center text-[8px] sm:text-xs font-bold text-gray-700">
                        6
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-0 right-1 sm:right-2 bg-[#b3d9ff] border-2 border-white rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 text-[#1565c0] text-[8px] sm:text-[10px] font-medium">
                    6ヶ月間のあんしん
                  </div>
                </div>
                <p className="text-[8px] sm:text-[10px] text-gray-700 font-medium">
                  サイズが合わない場合も6ヶ月以内なら返品・交換OK!
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Thumbnail Carousel */}
          {thumbnailImages.length > 0 && (
            <div className="relative">
              <div
                ref={thumbnailCarouselRef}
                className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
              >
                {thumbnailImages.map((banner, idx) => (
                  <div
                    key={`thumbnail-${idx}`}
                    className="flex-shrink-0 min-w-[calc((100%-32px)/5)] w-[calc((100%-32px)/5)]"
                  >
                    <div
                      onClick={() => handleThumbnailClick(idx)}
                      className={`bg-gray-100 overflow-hidden cursor-pointer transition-opacity aspect-[2.567] ${
                        idx === thumbnailIndex
                          ? "opacity-100 ring-2 ring-[#e2603f]"
                          : "opacity-70 hover:opacity-90"
                      }`}
                    >
                      <img
                        src={banner.image}
                        alt={banner.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Banner Display Text Below */}
                    {banner.display_text && (
                      <div className="mt-2 text-center">
                        {banner.page_url ? (
                          <a
                            href={banner.page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs sm:text-sm text-gray-700 hover:text-[#e2603f] hover:underline line-clamp-2 break-all transition-colors cursor-pointer"
                          >
                            {banner.display_text}
                          </a>
                        ) : (
                          <span className="text-xs sm:text-sm text-gray-700 line-clamp-2 break-all">
                            {banner.display_text}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Navigation Arrows - Thumbnail Carousel */}
              {thumbnailImages.length > 5 && (
                <>
                  <button
                    onClick={handleThumbnailCarouselPrev}
                    className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white/90 hover:bg-[#e2603f] rounded-full flex items-center justify-center z-20 shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 group cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800 group-hover:text-white transition-all duration-300 group-hover:-translate-x-1" />
                  </button>
                  <button
                    onClick={handleThumbnailCarouselNext}
                    className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white/90 hover:bg-[#e2603f] rounded-full flex items-center justify-center z-20 shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 group cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800 group-hover:text-white transition-all duration-300 group-hover:translate-x-1" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Product Carousel */}
        <div className="mb-8 bg-gray-200  p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold">
              おすすめ商品
            </h2>
            <div className="hidden sm:flex space-x-2">
              <button className="w-8 h-8 sm:w-10 sm:h-10 border border-gray-300 hover:bg-gray-100 flex items-center justify-center rounded-md cursor-pointer">
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button className="w-8 h-8 sm:w-10 sm:h-10 border border-gray-300 hover:bg-gray-100 flex items-center justify-center rounded-md cursor-pointer">
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
          <div className="relative">
            {loadingProducts ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">商品を読み込み中...</div>
              </div>
            ) : recommendedProducts.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">商品がありません</div>
              </div>
            ) : (
              <div className="flex space-x-3 sm:space-x-4 overflow-x-auto pb-4 scrollbar-hide">
                {recommendedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex-shrink-0 w-[calc((100%-60px)/6)] sm:w-[calc((100%-80px)/6)] min-w-[180px] sm:min-w-[200px] bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm flex flex-col"
                  >
                    <div className="relative">
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-32 sm:h-40 md:h-48 object-cover"
                      />
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!isAuthenticated) {
                            showToast("ログインが必要です", "warning");
                            return;
                          }
                          const wasFavorited = isFavorited(product.id);
                          const toggleSuccess = await toggleFavorite(
                            product.id
                          );
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
                    <div className="p-3 sm:p-4 flex flex-col flex-grow">
                      {/* Title and Description - Fixed 3 lines */}
                      <div className="h-[4.5rem] sm:h-[5rem] mb-0">
                        <div className="text-sm sm:text-base text-gray-800 leading-tight">
                          <div className="font-semibold line-clamp-1 mb-1">
                            {product.title}
                          </div>
                          {product.description && (
                            <div className="text-gray-600 text-xs sm:text-sm line-clamp-2">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mb-0.5">
                        {[...Array(5)].map((_, index) => (
                          <Star
                            key={index}
                            className={`w-3 h-3 sm:w-4 sm:h-4 ${
                              product.rating > 0 &&
                              index < Math.floor(product.rating)
                                ? "fill-yellow-400 text-yellow-400"
                                : "fill-none stroke-gray-300 text-gray-300"
                            }`}
                          />
                        ))}
                        <span className="text-xs sm:text-sm text-gray-600 ml-1">
                          ({product.reviews}件)
                        </span>
                      </div>
                      <div className="mb-2 sm:mb-3">
                        <span className="text-base sm:text-lg font-bold text-red-600">
                          ¥{product.price.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">
                          (税込)
                        </span>
                      </div>
                      {/* Button pushed to bottom */}
                      <div className="mt-auto">
                        <AddToCartButton
                          productId={product.id}
                          isAuthenticated={isAuthenticated}
                          isAdding={addingToCart === product.id}
                          isInCart={cartProductIds.has(product.id)}
                          onAddToCart={async (productId) => {
                            if (!isAuthenticated) {
                              showToast("ログインが必要です", "warning");
                              return;
                            }
                            setAddingToCart(productId);
                            try {
                              const success = await addToCartContext(
                                productId,
                                1
                              );
                              if (success) {
                                showToast("カートに追加しました", "success");
                                // Update cart product IDs
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
                                } else {
                                  setCartProductIds(new Set());
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
                              const success = await removeFromCartContext(
                                productId
                              );
                              if (success) {
                                showToast("カートから削除しました", "success");
                                // Update cart product IDs
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
                                } else {
                                  setCartProductIds(new Set());
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* カテゴリから探す */}
        <div className="mb-8">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-6 text-gray-900">
            カテゴリから探す
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
            {categories.map((category, index) => {
              return (
                <div
                  key={index}
                  className="group bg-white border border-gray-200 hover:shadow-lg cursor-pointer rounded-lg transition-all duration-300 overflow-hidden"
                >
                  <div className="p-4 sm:p-5 flex flex-col items-center justify-center min-h-[100px] sm:min-h-[120px]">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 mb-3 rounded-full overflow-hidden group-hover:scale-110 transition-transform duration-300 shadow-md">
                      <img
                        src={category.image}
                        alt={category.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-xs sm:text-sm text-gray-700 group-hover:text-[#e2603f] font-medium text-center leading-tight transition-colors duration-300">
                      {category.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* おすすめ商品 */}
        <div className="mb-8">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-4">
            当店おすすめ商品
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {topPicks.map((pick) => (
              <div
                key={pick.id}
                className="bg-white border border-gray-200 relative rounded-md overflow-hidden"
              >
                <div className="absolute top-2 left-2 bg-[#e2603f] text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 z-10 rounded-md">
                  ③ 当店おすすめ
                </div>
                <img
                  src={pick.image}
                  alt={pick.product}
                  className="w-full h-40 sm:h-48 object-cover"
                />
                <div className="p-3 sm:p-4">
                  <h3 className="font-bold text-xs sm:text-sm mb-1 sm:mb-2 line-clamp-2">
                    {pick.title}
                  </h3>
                  <p className="text-xs text-gray-600">{pick.product}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </UserLayout>
  );
};
