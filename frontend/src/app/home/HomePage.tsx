import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Heart, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useFavorites } from "../../contexts/FavoritesContext";
import { useCart } from "../../contexts/CartContext";
import { useToast } from "../../contexts/ToastContext";
import { useCategory } from "../../contexts/CategoryContext";
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
  const { selectedCategoryId, selectedCategoryName, setSelectedCategoryId } =
    useCategory();
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
      category_ids: string[];
      createdAt: string;
      updatedAt: string;
    }>
  >([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const recommendedProductsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<
    Array<{
      id: string;
      name: string;
      price: number;
      compare_price?: number;
      main_image_url?: string;
      image?: string;
      brand_name?: string;
      [key: string]: unknown;
    }>
  >([]);

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

        // Fetch all products using pagination
        let allProducts: Array<{
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
          category_ids?: string[];
          categories?: Array<{ id: string; name: string; level: number }>;
          createdAt?: string;
          updatedAt?: string;
          [key: string]: unknown;
        }> = [];

        let offset = 0;
        const limit = 100; // Fetch 100 products at a time
        let hasMore = true;

        while (hasMore) {
          const response = await apiService.getProducts({
            limit,
            offset,
            category_id: selectedCategoryId || undefined,
          });

          if (response.data && Array.isArray(response.data)) {
            allProducts = [...allProducts, ...response.data];

            // If we got fewer products than the limit, we've reached the end
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

          const formattedProducts = allProducts.map(
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

              // Extract category IDs from product data
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
                category_ids: categoryIds, // Add category IDs for filtering
                createdAt: product.createdAt || "",
                updatedAt: product.updatedAt || "",
              };
            }
          );

          setRecommendedProducts(formattedProducts);
        } else {
          // No products found
          setRecommendedProducts([]);
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
  }, [selectedCategoryId]);

  // Filter products by selected category
  const filteredRecommendedProducts = useMemo(() => {
    if (!selectedCategoryId) {
      return recommendedProducts;
    }
    return recommendedProducts.filter(
      (product) =>
        product.category_ids &&
        product.category_ids.includes(selectedCategoryId)
    );
  }, [recommendedProducts, selectedCategoryId]);

  // Check scroll position for product carousel
  useEffect(() => {
    const checkScrollPosition = () => {
      if (recommendedProductsRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } =
          recommendedProductsRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
      }
    };

    // Check initially and on resize
    checkScrollPosition();
    window.addEventListener("resize", checkScrollPosition);

    // Check on scroll and when filtered products change
    const scrollContainer = recommendedProductsRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", checkScrollPosition);
    }

    return () => {
      window.removeEventListener("resize", checkScrollPosition);
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", checkScrollPosition);
      }
    };
  }, [filteredRecommendedProducts]);

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

  // Load recently viewed products
  useEffect(() => {
    const loadRecentlyViewed = () => {
      try {
        const viewed = localStorage.getItem("recentlyViewed");
        if (viewed) {
          const viewedIds: string[] = JSON.parse(viewed);

          if (viewedIds.length > 0) {
            // Load products for recently viewed IDs
            Promise.all(
              viewedIds.slice(0, 8).map(async (productId) => {
                try {
                  const response = await apiService.getProduct(productId);
                  if (response.data) {
                    const productData = Array.isArray(response.data)
                      ? response.data[0]
                      : (response.data as { data?: unknown }).data ||
                        response.data;

                    const baseUrl = (
                      import.meta.env.VITE_API_URL ||
                      "http://localhost:8888/api"
                    ).replace(/\/api$/, "");

                    const product = productData as {
                      id: string;
                      name: string;
                      price: number;
                      compare_price?: number;
                      main_image_url?: string;
                      brand_name?: string;
                      [key: string]: unknown;
                    };

                    let imageUrl = product.main_image_url || "";
                    if (imageUrl && !imageUrl.startsWith("http")) {
                      const cleanPath = imageUrl.startsWith("/")
                        ? imageUrl
                        : `/${imageUrl}`;
                      imageUrl = `${baseUrl}${cleanPath}`;
                    }

                    return {
                      ...product,
                      image: imageUrl || "/img/model/model (1).png",
                    };
                  }
                } catch {
                  return null;
                }
              })
            ).then((products) => {
              setRecentlyViewed(
                products.filter((p) => p !== null) as Array<{
                  id: string;
                  name: string;
                  price: number;
                  compare_price?: number;
                  main_image_url?: string;
                  image?: string;
                  brand_name?: string;
                  [key: string]: unknown;
                }>
              );
            });
          }
        }
      } catch (err) {
        console.error("Failed to load recently viewed:", err);
      }
    };

    loadRecentlyViewed();
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
                    className="group absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white/90 rounded-full flex items-center justify-center z-20 shadow-lg cursor-pointer transition-all duration-200 hover:bg-[#e2603f] hover:scale-110 active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800 transition-colors duration-200 group-hover:text-white" />
                  </button>
                  <button
                    onClick={handleMainBannerNext}
                    className="group absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white/90 rounded-full flex items-center justify-center z-20 shadow-lg cursor-pointer transition-all duration-200 hover:bg-[#e2603f] hover:scale-110 active:scale-95"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800 transition-colors duration-200 group-hover:text-white" />
                  </button>
                </>
              )}
            </div>

            {/* Right Side Promotional Sections (Right - 1/3 width) */}
            <div className="w-full lg:flex-1 grid grid-cols-2 gap-3">
              {/* 01 即日翌日配送 */}
              <div className="bg-[#f0f7ff]  p-2 sm:p-3 relative overflow-hidden">
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
                  <div className="absolute top-0 left-0 bg-[#b3d9ff] border-2 border-white  px-1.5 sm:px-2 py-0.5 sm:py-1 text-[#1565c0] text-[8px] sm:text-[10px] font-medium">
                    ファッションアイテムがすぐ届く!
                  </div>
                </div>
                <p className="text-[8px] sm:text-[10px] text-gray-700 font-medium">
                  14時までのご注文で最短翌日にお届け!
                </p>
              </div>

              {/* 02 当日お届け */}
              <div className="bg-[#f0f7ff]  p-2 sm:p-3 relative overflow-hidden">
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
                  <div className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-[#b3d9ff] border-2 border-white  px-1.5 sm:px-2 py-0.5 sm:py-1 text-[#1565c0] text-[8px] sm:text-[10px] font-medium">
                    スタッフがお届け!
                  </div>
                </div>
                <p className="text-[8px] sm:text-[10px] text-gray-700 font-medium">
                  14時までのご注文で最短当日中にお届け!
                </p>
              </div>

              {/* 03 おみせde受取 */}
              <div className="bg-[#283593]  p-2 sm:p-3 relative overflow-hidden">
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
                  <div className="absolute top-0 right-1 sm:right-2 bg-[#e2603f] border-2 border-white  px-1.5 sm:px-2 py-0.5 sm:py-1 text-white text-[8px] sm:text-[10px] font-bold">
                    新サービス開始!
                  </div>
                </div>
                <p className="text-[8px] sm:text-[10px] text-white font-medium">
                  店舗で試着してから受取可能! 詳しくはこちら
                </p>
              </div>

              {/* 04 返品・交換保証 */}
              <div className="bg-[#f0f7ff]  p-2 sm:p-3 relative overflow-hidden">
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
                  <div className="absolute top-0 right-1 sm:right-2 bg-[#b3d9ff] border-2 border-white  px-1.5 sm:px-2 py-0.5 sm:py-1 text-[#1565c0] text-[8px] sm:text-[10px] font-medium">
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
                    className="group absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white/90 rounded-full flex items-center justify-center z-20 shadow-lg cursor-pointer transition-all duration-200 hover:bg-[#e2603f] hover:scale-110 active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800 transition-colors duration-200 group-hover:text-white" />
                  </button>
                  <button
                    onClick={handleThumbnailCarouselNext}
                    className="group absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white/90 rounded-full flex items-center justify-center z-20 shadow-lg cursor-pointer transition-all duration-200 hover:bg-[#e2603f] hover:scale-110 active:scale-95"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800 transition-colors duration-200 group-hover:text-white" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Recently Viewed Products Section */}
        {recentlyViewed.length > 0 && (
          <div className="mb-8  p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold">
                最近閲覧した商品
              </h2>
            </div>
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

        {/* Product Carousel */}
        <div id="recommended-products" className="mb-8 bg-gray-200  p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold">
                おすすめ商品
              </h2>
              {selectedCategoryName && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    ({selectedCategoryName})
                  </span>
                  <button
                    onClick={() => setSelectedCategoryId(null)}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    フィルター解除
                  </button>
                </div>
              )}
            </div>
            {filteredRecommendedProducts.length > 0 && (
              <div className="hidden sm:flex space-x-2">
                <button
                  onClick={() => {
                    if (recommendedProductsRef.current) {
                      // Calculate scroll amount for 6 products
                      const firstChild = recommendedProductsRef.current
                        .firstElementChild as HTMLElement;
                      if (firstChild) {
                        const productWidth = firstChild.offsetWidth;
                        const gap = 16; // space-x-4 = 16px
                        // Scroll by 6 products: (productWidth + gap) * 6 - gap (last product doesn't need gap)
                        const scrollAmount = (productWidth + gap) * 6 - gap;
                        recommendedProductsRef.current.scrollBy({
                          left: -scrollAmount,
                          behavior: "smooth",
                        });
                      } else {
                        // Fallback to container width
                        const scrollAmount =
                          recommendedProductsRef.current.clientWidth * 0.8;
                        recommendedProductsRef.current.scrollBy({
                          left: -scrollAmount,
                          behavior: "smooth",
                        });
                      }
                    }
                  }}
                  disabled={!canScrollLeft}
                  className={`group w-8 h-8 sm:w-10 sm:h-10 border border-gray-300 bg-white flex items-center justify-center  shadow-sm transition-all duration-200 ${
                    !canScrollLeft
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer hover:bg-[#e2603f] hover:border-[#e2603f] hover:scale-110 active:scale-95"
                  }`}
                >
                  <ChevronLeft
                    className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-200 ${
                      !canScrollLeft
                        ? "text-gray-700"
                        : "text-gray-700 group-hover:text-white"
                    }`}
                  />
                </button>
                <button
                  onClick={() => {
                    if (recommendedProductsRef.current) {
                      // Calculate scroll amount for 6 products
                      const firstChild = recommendedProductsRef.current
                        .firstElementChild as HTMLElement;
                      if (firstChild) {
                        const productWidth = firstChild.offsetWidth;
                        const gap = 16; // space-x-4 = 16px
                        // Scroll by 6 products: (productWidth + gap) * 6 - gap (last product doesn't need gap)
                        const scrollAmount = (productWidth + gap) * 6 - gap;
                        recommendedProductsRef.current.scrollBy({
                          left: scrollAmount,
                          behavior: "smooth",
                        });
                      } else {
                        // Fallback to container width
                        const scrollAmount =
                          recommendedProductsRef.current.clientWidth * 0.8;
                        recommendedProductsRef.current.scrollBy({
                          left: scrollAmount,
                          behavior: "smooth",
                        });
                      }
                    }
                  }}
                  disabled={!canScrollRight}
                  className={`group w-8 h-8 sm:w-10 sm:h-10 border border-gray-300 bg-white flex items-center justify-center  shadow-sm transition-all duration-200 ${
                    !canScrollRight
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer hover:bg-[#e2603f] hover:border-[#e2603f] hover:scale-110 active:scale-95"
                  }`}
                >
                  <ChevronRight
                    className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-200 ${
                      !canScrollRight
                        ? "text-gray-700"
                        : "text-gray-700 group-hover:text-white"
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            {loadingProducts ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">商品を読み込み中...</div>
              </div>
            ) : filteredRecommendedProducts.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">
                  {selectedCategoryId
                    ? "このカテゴリに該当する商品がありません"
                    : "商品がありません"}
                </div>
              </div>
            ) : (
              <div className="relative">
                <div
                  ref={recommendedProductsRef}
                  className="flex space-x-3 sm:space-x-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
                  style={{ scrollBehavior: "smooth" }}
                >
                  {filteredRecommendedProducts.map((product) => (
                    <Link
                      key={product.id}
                      to={`/product/${product.id}`}
                      className="group flex-shrink-0 w-[calc((100%-60px)/6)] sm:w-[calc((100%-80px)/6)] min-w-[180px] sm:min-w-[200px] bg-white border border-gray-200 overflow-hidden shadow-sm flex flex-col cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-1"
                    >
                      <div className="relative overflow-hidden">
                        <img
                          src={product.image}
                          alt={product.title}
                          className="w-full h-32 sm:h-40 md:h-48 object-cover transition-opacity duration-300 group-hover:opacity-80"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 pointer-events-none"></div>
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
                                  const cartResponse =
                                    await apiService.getCart();
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
                                  showToast(
                                    "カートから削除しました",
                                    "success"
                                  );
                                  // Update cart product IDs
                                  const cartResponse =
                                    await apiService.getCart();
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
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Best Sellers Section */}
        <div className="mb-12 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                ベストセラー
              </h2>
              <p className="text-sm text-gray-600">人気商品トップ10</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {filteredRecommendedProducts
              .filter((p) => p.reviews > 0)
              .sort((a, b) => b.reviews - a.reviews)
              .slice(0, 10)
              .map((product, index) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="group bg-white shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden relative"
                >
                  <div className="absolute top-2 left-2 bg-[#e2603f] text-white text-xs font-bold px-2 py-1 rounded-full z-10 shadow-md">
                    #{index + 1}
                  </div>
                  <div className="relative aspect-square overflow-hidden bg-gray-50">
                    <img
                      src={product.image || "/img/placeholder.png"}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2 text-gray-900">
                      {product.title}
                    </h3>
                    <div className="text-lg font-bold text-[#e2603f] mb-1">
                      ¥{product.price.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-gray-600">
                        {product.rating.toFixed(1)} ({product.reviews})
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </div>

        {/* Flash Sale Section */}
        <div className="mb-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl p-6 sm:p-8 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                ⚡ フラッシュセール
              </h2>
              <p className="text-sm text-white/90">
                期間限定！特別価格でご提供
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm  px-4 py-2 mt-4 sm:mt-0">
              <span className="text-sm font-medium">残り時間:</span>
              <span className="text-xl font-bold">23:59:45</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredRecommendedProducts
              .filter((p) => p.compare_price && p.compare_price > p.price)
              .slice(0, 8)
              .map((product) => {
                const discountPercent = product.compare_price
                  ? Math.round(
                      ((product.compare_price - product.price) /
                        product.compare_price) *
                        100
                    )
                  : 0;
                return (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className="group bg-white overflow-hidden hover:shadow-2xl transition-all duration-300"
                  >
                    <div className="relative aspect-square overflow-hidden bg-gray-50">
                      <div className="absolute top-2 left-2 bg-red-600 text-white text-sm font-bold px-3 py-1 rounded-full z-10 shadow-lg">
                        -{discountPercent}%
                      </div>
                      <img
                        src={product.image || "/img/placeholder.png"}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-3 bg-white">
                      <h3 className="font-semibold text-sm mb-2 line-clamp-2 text-gray-900">
                        {product.title}
                      </h3>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl font-bold text-red-600">
                          ¥{product.price.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-400 line-through">
                          ¥{product.compare_price?.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(80, Math.random() * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500">在庫わずか！</p>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>

        {/* Featured Collections */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              特集コレクション
            </h2>
            <p className="text-sm text-gray-600">シーズンごとの厳選アイテム</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link
              to="/products?category=上着"
              className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              <div className="aspect-[4/3] relative">
                <img
                  src="/img/product/top/top (2).png"
                  alt="冬物コレクション"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="text-2xl font-bold mb-2">冬物コレクション</h3>
                  <p className="text-sm text-white/90 mb-3">
                    暖かくておしゃれなアウター
                  </p>
                  <span className="inline-flex items-center text-sm font-medium">
                    詳細を見る
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </Link>
            <Link
              to="/products?category=靴"
              className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              <div className="aspect-[4/3] relative">
                <img
                  src="/img/product/shoe/shoe (9).jpg"
                  alt="シューズコレクション"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="text-2xl font-bold mb-2">
                    シューズコレクション
                  </h3>
                  <p className="text-sm text-white/90 mb-3">
                    快適な履き心地を追求
                  </p>
                  <span className="inline-flex items-center text-sm font-medium">
                    詳細を見る
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </Link>
            <Link
              to="/products?category=バッグ"
              className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              <div className="aspect-[4/3] relative">
                <img
                  src="/img/product/bag/bag (2).jpg"
                  alt="バッグコレクション"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="text-2xl font-bold mb-2">
                    バッグコレクション
                  </h3>
                  <p className="text-sm text-white/90 mb-3">
                    機能性とデザインの融合
                  </p>
                  <span className="inline-flex items-center text-sm font-medium">
                    詳細を見る
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};
