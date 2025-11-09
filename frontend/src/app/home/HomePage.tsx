import { useState, useRef, useEffect, useMemo } from "react";
import {
  Search,
  Heart,
  ShoppingCart,
  Menu,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  ChevronDown,
  Star,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../services/api";

export const HomePage = () => {
  const [cartCount] = useState(0);
  const { isAuthenticated, user, logout } = useAuth();
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mainBannerIndex, setMainBannerIndex] = useState(0);
  const [thumbnailIndex, setThumbnailIndex] = useState(0);
  const thumbnailCarouselRef = useRef<HTMLDivElement>(null);
  const [banners, setBanners] = useState<
    Array<{
      image: string;
      title: string;
      description: string;
      page_url?: string;
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
      color: "from-orange-500 to-orange-600",
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
      image: "/img/product/top/trousers.jpg",
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };

    if (isCategoryDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

  // おすすめ商品データ
  const recommendedProducts = [
    {
      id: 1,
      title:
        "【新作】カジュアルスーツ 2ピース メンズ グレー ビジネスカジュアル対応",
      price: 19800,
      rating: 4.8,
      reviews: 125,
      image: "/img/model/model (20).jpg",
      badges: ["送料無料", "サイズ展開豊富"],
      delivery: "14:00までのご注文で最短翌日にお届け",
    },
    {
      id: 2,
      title: "レディース ワンピース フレア 春夏 カジュアル お出かけ パーティー",
      price: 5980,
      rating: 4.6,
      reviews: 89,
      image: "/img/model/model (16).png",
      badges: ["送料無料", "複数カラー"],
      delivery: "14:00までのご注文で最短翌日にお届け",
    },
    {
      id: 3,
      title: "メンズ スニーカー カジュアル コンフォート ウォーキング 通勤",
      price: 3980,
      rating: 4.9,
      reviews: 256,
      image: "/img/model/model (9).png",
      badges: ["送料無料", "人気商品"],
      delivery: "14:00までのご注文で最短翌日にお届け",
    },
    {
      id: 4,
      title:
        "レディース トートバッグ レザー風 大容量 ショルダーバッグ お出かけ",
      price: 2980,
      rating: 4.7,
      reviews: 167,
      image: "/img/model/model (14).png",
      badges: ["送料無料", "新着"],
      delivery: "14:00までのご注文で最短翌日にお届け",
    },
    {
      id: 5,
      title: "メンズ ジャケット アウター 秋冬 カジュアル 防風",
      price: 12800,
      rating: 4.5,
      reviews: 98,
      image: "/img/model/model (11).jpg",
      badges: ["送料無料", "人気商品"],
      delivery: "14:00までのご注文で最短翌日にお届け",
    },
    {
      id: 6,
      title: "レディース スカート ミディ フレア 春夏 カジュアル",
      price: 4980,
      rating: 4.6,
      reviews: 142,
      image: "/img/model/model (1).png",
      badges: ["送料無料", "複数カラー"],
      delivery: "14:00までのご注文で最短翌日にお届け",
    },
  ];

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
            import.meta.env.VITE_API_URL || "http://localhost:4000/api"
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

  // Handle thumbnail carousel navigation (4 images at a time)
  const handleThumbnailCarouselPrev = () => {
    const newIndex = Math.max(0, thumbnailIndex - 4);
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
    const newIndex = Math.min(thumbnailImages.length - 1, thumbnailIndex + 4);
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
    // Calculate current group boundaries (4 images per group)
    const currentGroupStart = Math.floor(mainBannerIndex / 4) * 4;
    const isFirstInGroup = mainBannerIndex === currentGroupStart;

    if (isFirstInGroup) {
      // Move to previous group (or wrap to last group if at the beginning)
      const prevGroupStart = currentGroupStart - 4;
      let newIndex: number;
      if (prevGroupStart < 0) {
        // Wrap to last group's last image
        const lastGroupStart = Math.floor((thumbnailImages.length - 1) / 4) * 4;
        const lastGroupEnd = Math.min(
          thumbnailImages.length - 1,
          lastGroupStart + 3
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
    // Calculate current group boundaries (4 images per group)
    const currentGroupStart = Math.floor(mainBannerIndex / 4) * 4;
    const currentGroupEnd = Math.min(
      thumbnailImages.length - 1,
      currentGroupStart + 3
    );
    const isLastInGroup = mainBannerIndex === currentGroupEnd;

    if (isLastInGroup) {
      // Move to next group (or wrap to first group if at the end)
      const nextGroupStart = currentGroupStart + 4;
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

  return (
    <div className="min-h-screen bg-white">
      {/* Top Header - Indigo/Purple Blue */}
      <header className="bg-indigo-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3 lg:gap-6">
            {/* Logo Section */}
            <div className="flex items-center space-x-3 w-full lg:w-auto justify-between lg:justify-start">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-600 flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-base sm:text-lg">
                    Y
                  </span>
                </div>
                <span className="text-lg sm:text-xl font-semibold tracking-wide">
                  ECサイト
                </span>
              </div>
              {/* Mobile Search Button */}
              <button className="lg:hidden p-2 hover:bg-white/10 rounded-md transition-colors">
                <Search className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar - Hidden on mobile */}
            <div className="hidden lg:flex flex-1 max-w-3xl mx-6 xl:mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="キーワードで検索する"
                  className="w-full px-5 py-2.5 bg-white text-gray-900 placeholder-gray-400 border-none focus:outline-none focus:ring-2 focus:ring-white/20 rounded-lg text-sm shadow-sm"
                />
                <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors">
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-3 sm:space-x-4 w-full lg:w-auto justify-between lg:justify-end">
              {!isAuthenticated ? (
                <>
                  <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-800 text-white text-sm font-medium rounded-lg whitespace-nowrap transition-colors shadow-sm">
                    新規登録
                  </button>
                  <button className="px-4 py-2 bg-indigo-800 hover:bg-indigo-900 text-white text-sm font-medium rounded-lg whitespace-nowrap transition-colors shadow-sm">
                    ログイン
                  </button>
                </>
              ) : (
                <>
                  <div className="hidden md:flex items-center space-x-2.5 px-3 py-2 bg-white/10 rounded-lg">
                    <button className="flex items-center space-x-2 text-sm font-medium p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <Heart className="w-5 h-5" />
                      <span className="hidden sm:inline">お気に入り</span>
                    </button>
                    <button className="relative flex items-center space-x-2 text-sm font-medium p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <ShoppingCart className="w-5 h-5" />
                      <span className="hidden sm:inline">カート</span>
                      {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs font-bold flex items-center justify-center rounded-full shadow-md">
                          {cartCount}
                        </span>
                      )}
                    </button>{" "}
                    <User className="w-5 h-5" />
                    <span className="text-sm font-medium truncate max-w-[120px]">
                      {user?.username || user?.email}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-800 hover:bg-indigo-900 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">ログアウト</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Secondary Navigation - Light Blue/Purple */}
      <div className="bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-400 text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() =>
                  setIsCategoryDropdownOpen(!isCategoryDropdownOpen)
                }
                className="flex items-center space-x-3 hover:bg-white/15 px-4 py-1 rounded-lg transition-all duration-200 font-medium"
              >
                <Menu className="w-6 h-6" />
                <span className="text-sm sm:text-base">カテゴリから選ぶ</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isCategoryDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isCategoryDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-full sm:w-80 bg-white rounded-xl shadow-xl z-50 border border-gray-200 max-h-96 overflow-y-auto">
                  <div className="p-2">
                    {categories.map((category, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setIsCategoryDropdownOpen(false);
                          // Handle category selection here
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-left text-gray-800 hover:bg-indigo-50 rounded-lg transition-colors duration-150"
                      >
                        <span className="text-sm font-medium">
                          {category.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-4 ">
        {/* Banner Section - Following Wireframe Design */}
        <div className="mb-8">
          {/* Top Banner Row */}
          <div className="flex gap-4 mb-4">
            {/* Main Banner Section (Left - 2/3 width) */}
            <div className="flex-[2] relative bg-gray-100 overflow-hidden">
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
                    className={`absolute inset-0 flex z-10 p-8 md:p-12 ${
                      currentBanner.title_vertical_position === "top"
                        ? "items-start"
                        : currentBanner.title_vertical_position === "bottom"
                        ? "items-end"
                        : "items-center"
                    }`}
                  >
                    <div className="w-full space-y-4">
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
                            className={`${
                              currentBanner.title_font_size || "text-4xl"
                            } font-bold leading-tight`}
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
                            className={`${
                              currentBanner.description_font_size || "text-lg"
                            } leading-relaxed`}
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
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-blue-500 rounded-full flex items-center justify-center z-20 shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 group"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-800 group-hover:text-white transition-all duration-300 group-hover:-translate-x-1" />
                  </button>
                  <button
                    onClick={handleMainBannerNext}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-blue-500 rounded-full flex items-center justify-center z-20 shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 group"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-800 group-hover:text-white transition-all duration-300 group-hover:translate-x-1" />
                  </button>
                </>
              )}
            </div>

            {/* Right Side Promotional Sections (Right - 1/3 width) */}
            <div className="flex-1 grid grid-cols-2 gap-3">
              {/* 01 即日翌日配送 */}
              <div className="bg-blue-100 rounded-lg p-3 relative overflow-hidden">
                <div className="flex flex-row gap-2 items-center">
                  <h2 className="text-3xl font-bold text-blue-800 mb-2">01</h2>
                  <h3 className="text-xs font-bold text-blue-800 mb-2">
                    即日翌日配送
                  </h3>
                </div>
                <div className="relative h-20 mb-2 flex items-center justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 bg-white rounded flex items-center justify-center">
                      <span className="text-xs">シャツ</span>
                    </div>
                    <div className="w-12 h-12 bg-white rounded flex items-center justify-center">
                      <span className="text-xs">パンツ</span>
                    </div>
                  </div>
                  <div className="absolute top-0 left-0 bg-blue-200 border-2 border-white rounded-lg px-2 py-1 text-white text-[10px]">
                    ファッションアイテムがすぐ届く!
                  </div>
                </div>
                <p className="text-[10px] text-blue-800 font-medium">
                  14時までのご注文で最短翌日にお届け!
                </p>
              </div>

              {/* 02 当日お届け */}
              <div className="bg-blue-100 rounded-lg p-3 relative overflow-hidden">
                <div className="flex flex-row gap-2 items-center">
                  <h2 className="text-3xl font-bold text-blue-800 mb-2">02</h2>
                  <h3 className="text-xs font-bold text-blue-800 mb-2">
                    当日お届け
                  </h3>
                </div>

                <div className="relative h-20 mb-2 flex items-center justify-center">
                  <div className="w-16 h-16 bg-blue-300 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white">配達員</span>
                  </div>
                  <div className="absolute top-2 right-2 bg-blue-200 border-2 border-white rounded-lg px-2 py-1 text-white text-[10px]">
                    スタッフがお届け!
                  </div>
                </div>
                <p className="text-[10px] text-blue-800 font-medium">
                  14時までのご注文で最短当日中にお届け!
                </p>
              </div>

              {/* 03 おみせde受取 */}
              <div className="bg-blue-600 rounded-lg p-3 relative overflow-hidden">
                <div className="flex flex-row gap-2 items-center">
                  <h2 className="text-3xl font-bold text-white mb-2">03</h2>
                  <h3 className="text-xs font-bold text-white mb-2">
                    おみせde受取
                  </h3>
                </div>
                <div className="relative h-20 mb-2 flex items-center justify-center">
                  <div className="w-16 h-12 bg-blue-800 rounded flex items-center justify-center">
                    <span className="text-xs text-white">店舗</span>
                  </div>
                  <div className="absolute top-0 right-2 bg-red-500 border-2 border-white rounded-lg px-2 py-1 text-white text-[10px] font-bold">
                    新サービス開始!
                  </div>
                </div>
                <p className="text-[10px] text-white font-medium">
                  店舗で試着してから受取可能! 詳しくはこちら
                </p>
              </div>

              {/* 04 返品・交換保証 */}
              <div className="bg-blue-100 rounded-lg p-3 relative overflow-hidden">
                <div className="flex flex-row gap-2 items-center">
                  <h2 className="text-3xl font-bold text-blue-800 mb-2">04</h2>
                  <h3 className="text-xs font-bold text-blue-800 mb-2">
                    返品・交換保証
                  </h3>
                </div>

                <div className="relative h-20 mb-2 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex gap-1">
                      <div className="w-6 h-6 bg-amber-400 rounded flex items-center justify-center text-xs font-bold">
                        1
                      </div>
                      <div className="w-6 h-6 bg-amber-400 rounded flex items-center justify-center text-xs font-bold">
                        2
                      </div>
                      <div className="w-6 h-6 bg-amber-400 rounded flex items-center justify-center text-xs font-bold">
                        3
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-6 h-6 bg-amber-400 rounded flex items-center justify-center text-xs font-bold">
                        4
                      </div>
                      <div className="w-6 h-6 bg-amber-400 rounded flex items-center justify-center text-xs font-bold">
                        5
                      </div>
                      <div className="w-6 h-6 bg-amber-500 rounded flex items-center justify-center text-xs font-bold">
                        6
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-0 right-2 bg-blue-200 border-2 border-white rounded-lg px-2 py-1 text-white text-[10px]">
                    6ヶ月間のあんしん
                  </div>
                </div>
                <p className="text-[10px] text-blue-800 font-medium">
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
                    className="flex-shrink-0"
                    style={{
                      width: "calc((100% - 32px) / 5)",
                      minWidth: "calc((100% - 32px) / 5)",
                    }}
                  >
                    <div
                      onClick={() => handleThumbnailClick(idx)}
                      className={`bg-gray-100 overflow-hidden cursor-pointer transition-opacity aspect-[2.567] ${
                        idx === thumbnailIndex
                          ? "opacity-100 ring-2 ring-blue-500"
                          : "opacity-70 hover:opacity-90"
                      }`}
                    >
                      <img
                        src={banner.image}
                        alt={banner.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Banner URL Below */}
                    {banner.page_url && (
                      <div className="mt-2 text-center">
                        <a
                          href={banner.page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 underline line-clamp-2 break-all"
                        >
                          {banner.page_url}
                        </a>
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
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-blue-500 rounded-full flex items-center justify-center z-20 shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 group"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-800 group-hover:text-white transition-all duration-300 group-hover:-translate-x-1" />
                  </button>
                  <button
                    onClick={handleThumbnailCarouselNext}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-blue-500 rounded-full flex items-center justify-center z-20 shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 group"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-800 group-hover:text-white transition-all duration-300 group-hover:translate-x-1" />
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
              <button className="w-8 h-8 sm:w-10 sm:h-10 border border-gray-300 hover:bg-gray-100 flex items-center justify-center rounded-md">
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button className="w-8 h-8 sm:w-10 sm:h-10 border border-gray-300 hover:bg-gray-100 flex items-center justify-center rounded-md">
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="flex space-x-3 sm:space-x-4 overflow-x-auto pb-4 scrollbar-hide">
              {recommendedProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex-shrink-0 w-[calc((100%-60px)/6)] sm:w-[calc((100%-80px)/6)] min-w-[180px] sm:min-w-[200px] bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm"
                >
                  <div className="relative">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-32 sm:h-40 md:h-48 object-cover"
                    />
                    <button className="absolute top-2 right-2 text-gray-400 hover:text-red-500 bg-white/80 rounded-full p-1.5">
                      <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                  <div className="p-3 sm:p-4">
                    <h3 className="text-xs sm:text-sm text-gray-800 mb-1 sm:mb-2 line-clamp-2 min-h-[2.5rem] sm:min-h-[2.75rem]">
                      {product.title}
                    </h3>
                    <div className="flex items-center gap-1 mb-1 sm:mb-2">
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
                    <div className="mb-1 sm:mb-2">
                      <span className="text-base sm:text-lg font-bold text-red-600">
                        ¥{product.price.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">(税込)</span>
                    </div>
                    <div className="text-xs text-gray-600 mb-1 sm:mb-2 line-clamp-1">
                      {product.delivery}
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2 sm:mb-3">
                      {product.badges.map((badge, idx) => (
                        <span
                          key={idx}
                          className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md ${
                            badge === "送料無料"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-600 text-white"
                          }`}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                    <button className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white text-xs sm:text-sm font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-sm">
                      カートに入れる
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
                    <span className="text-xs sm:text-sm text-gray-700 group-hover:text-blue-600 font-medium text-center leading-tight transition-colors duration-300">
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
                <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 z-10 rounded-md">
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
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-blue-500 to-blue-600 text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div>
              <h3 className="font-bold mb-3 sm:mb-4 text-sm sm:text-base">
                はじめてのお客様へ
              </h3>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <li>よくある質問</li>
                <li>配送料金について</li>
                <li>お支払方法について</li>
                <li>領収書の発行方法について</li>
                <li>返品・交換について</li>
                <li>配送納期について</li>
                <li>サイズガイド</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-3 sm:mb-4 text-sm sm:text-base">
                会員サービス
              </h3>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <li>マイページ</li>
                <li>ポイントサービスについて</li>
                <li>お気に入り登録</li>
                <li>会員登録</li>
                <li>ポイント還元について</li>
                <li>購入履歴照会</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-3 sm:mb-4 text-sm sm:text-base">
                サービス
              </h3>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <li>店舗受取サービス</li>
                <li>サイズ交換サービス</li>
                <li>リペアサービス</li>
                <li>無料 長期保証</li>
                <li>品質保証</li>
                <li>オリジナル商品保証</li>
                <li>即日配送お届け「高速便」</li>
                <li>スタイリング相談</li>
                <li>リサイクル・買取サービス</li>
                <li>総合保証サービス</li>
                <li>アフターサービス</li>
                <li>下取り・買取サービス</li>
                <li>クリーニングサービス</li>
                <li>ギフト包装サービス</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-3 sm:mb-4 text-sm sm:text-base">
                企業情報
              </h3>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <li>企業・店舗情報</li>
                <li>採用情報</li>
                <li>各種お問い合せはこちら</li>
                <li>オリジナル商品取扱説明書</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-blue-400 pt-4 sm:pt-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-600 flex items-center justify-center">
                  <span className="text-white font-bold text-xs sm:text-sm">
                    Y
                  </span>
                </div>
                <span className="text-xs sm:text-sm">
                  Copyright © FASHION EC SITE Co., Ltd.
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <span className="text-xs sm:text-sm">会員規約</span>
                <span className="text-xs sm:text-sm">個人情報保護方針</span>
                <span className="text-xs sm:text-sm">
                  特定商取引法に基づく表示
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
