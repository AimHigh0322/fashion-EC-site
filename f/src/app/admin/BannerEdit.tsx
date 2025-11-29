import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X, Upload } from "lucide-react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { useToast } from "../../contexts/ToastContext";
import { apiService } from "../../services/api";
import { Breadcrumbs } from "../../components/molecules/Breadcrumbs";

interface BannerFormData {
  title: string;
  title_color: string;
  title_font_size: string;
  title_position: string;
  title_vertical_position: string;
  description: string;
  description_color: string;
  description_font_size: string;
  description_position: string;
  description_vertical_position: string;
  page_url: string;
  display_text: string;
  status: "active" | "inactive";
  image: File | null;
  preview: string | null;
  existing_image_url: string | null;
  imageWidth?: number;
  imageHeight?: number;
  sizeRatio?: number;
}

export const BannerEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [banner, setBanner] = useState<BannerFormData>({
    title: "",
    title_color: "#000000",
    title_font_size: "text-4xl",
    title_position: "left",
    title_vertical_position: "middle",
    description: "",
    description_color: "#000000",
    description_font_size: "text-lg",
    description_position: "left",
    description_vertical_position: "middle",
    page_url: "",
    display_text: "",
    status: "active",
    image: null,
    preview: null,
    existing_image_url: null,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [sizeRatio, setSizeRatio] = useState<number>(1);

  // タイトル・説明の縦位置を同時に変更するヘルパー
  const handleVerticalPositionChange = (value: string) => {
    setBanner((prev) => ({
      ...prev,
      title_vertical_position: value,
      description_vertical_position: value,
    }));
  };

  // Get adjusted font size for preview based on ratio
  const getAdjustedFontSize = (
    fontSize: string,
    ratio: number
  ): string => {
    // Map Tailwind font sizes to approximate pixel values
    const fontSizeMap: { [key: string]: number } = {
      "text-xs": 12,
      "text-sm": 14,
      "text-base": 16,
      "text-lg": 18,
      "text-xl": 20,
      "text-2xl": 24,
      "text-3xl": 30,
      "text-4xl": 36,
      "text-5xl": 48,
      "text-6xl": 60,
    };

    const baseSize = fontSizeMap[fontSize] || 16;
    const adjustedSize = baseSize / ratio;

    // Find closest Tailwind class
    const closestSize = Object.entries(fontSizeMap).reduce(
      (prev, [key, value]) =>
        Math.abs(value - adjustedSize) < Math.abs(prev[1] - adjustedSize)
          ? [key, value]
          : prev,
      ["text-base", 16] as [string, number]
    );

    return closestSize[0];
  };

  // Calculate size ratio when preview dimensions change
  useEffect(() => {
    const calculateRatio = () => {
      if (!previewRef.current || !banner.imageWidth || !banner.imageHeight) {
        return;
      }

      const previewContainer = previewRef.current;
      const previewWidth = previewContainer.offsetWidth;
      const previewHeight = previewContainer.offsetHeight;

      // Actual banner display size on homepage
      // Banner takes 2/3 of max-width 1440px = ~960px width on large screens
      // Height = 960 / (950/370) ≈ 374px
      const actualBannerWidth = 960;
      const actualBannerHeight = actualBannerWidth / (950 / 370);

      // Calculate scale factors
      const previewScale = Math.min(
        previewWidth / banner.imageWidth,
        previewHeight / banner.imageHeight
      );
      const actualScale = Math.min(
        actualBannerWidth / banner.imageWidth,
        actualBannerHeight / banner.imageHeight
      );

      // Ratio: how much larger the actual display is compared to preview
      const ratio = actualScale / previewScale;
      setSizeRatio(ratio);
      setBanner((prev) => ({ ...prev, sizeRatio: ratio }));
    };

    calculateRatio();
    window.addEventListener("resize", calculateRatio);
    return () => window.removeEventListener("resize", calculateRatio);
  }, [banner.imageWidth, banner.imageHeight]);

  useEffect(() => {
    const loadBanner = async () => {
      if (!id) {
        showToast("バナーIDが指定されていません", "error");
        navigate("/admin/banners");
        return;
      }

      setLoading(true);
      try {
        const response = await apiService.getBanner(id);
        console.log("Banner edit - API response:", response);

        if (response.error) {
          throw new Error(response.error);
        }

        // Handle different response structures
        // Backend returns: { success: true, data: banner }
        // API service wraps it: { data: { success: true, data: banner } }
        type BannerDataType = {
          id?: string;
          title?: string;
          name?: string;
          title_color?: string;
          title_font_size?: string;
          title_position?: string;
          title_vertical_position?: string;
          description?: string;
          description_color?: string;
          description_font_size?: string;
          description_position?: string;
          description_vertical_position?: string;
          page_url?: string;
          link_url?: string;
          display_text?: string;
          status?: string;
          is_active?: boolean;
          image_url?: string;
        };

        let bannerData: BannerDataType | null = null;

        if (response.data) {
          const data = response.data as unknown;
          // Check if response.data has nested data structure (from backend: { success: true, data: banner })
          if (
            data &&
            typeof data === "object" &&
            "success" in data &&
            "data" in data
          ) {
            bannerData = (data as { success: boolean; data: BannerDataType })
              .data;
          } else if (data && typeof data === "object" && "id" in data) {
            // Direct banner object
            bannerData = data as BannerDataType;
          } else {
            // Try to find banner data in response
            bannerData = data as BannerDataType;
          }
        }

        console.log("Banner edit - Banner data:", bannerData);

        if (!bannerData || !bannerData.id) {
          showToast("バナーの読み込みに失敗しました", "error");
          navigate("/admin/banners");
          return;
        }

        const baseUrl = (
          import.meta.env.VITE_API_URL || "http://localhost:8888/api"
        ).replace(/\/api$/, "");

        let imageUrl = null;
        if (bannerData.image_url) {
          if (bannerData.image_url.startsWith("http")) {
            imageUrl = bannerData.image_url;
          } else {
            const path = bannerData.image_url.startsWith("/")
              ? bannerData.image_url
              : `/${bannerData.image_url}`;
            imageUrl = `${baseUrl}${path}`;
          }
        }

        // 垂直位置はタイトルまたは説明の値を使用（優先順位: title_vertical_position > description_vertical_position）
        const verticalPosition =
          bannerData.title_vertical_position ||
          bannerData.description_vertical_position ||
          "middle";
        const updatedBanner = {
          title: bannerData.title || bannerData.name || "",
          title_color: bannerData.title_color || "#000000",
          title_font_size: bannerData.title_font_size || "text-4xl",
          title_position: bannerData.title_position || "left",
          title_vertical_position: verticalPosition,
          description: bannerData.description || "",
          description_color: bannerData.description_color || "#000000",
          description_font_size: bannerData.description_font_size || "text-lg",
          description_position: bannerData.description_position || "left",
          description_vertical_position: verticalPosition,
          page_url: bannerData.page_url || bannerData.link_url || "",
          display_text: bannerData.display_text || "",
          status: (bannerData.status ||
            (bannerData.is_active ? "active" : "inactive")) as
            | "active"
            | "inactive",
          image: null,
          preview: imageUrl,
          existing_image_url: imageUrl,
        };

        console.log("Banner edit - Setting banner state:", updatedBanner);
        setBanner(updatedBanner);

        // Load image to get dimensions
        if (imageUrl) {
          const img = new Image();
          img.onload = () => {
            setBanner((prev) => ({
              ...prev,
              imageWidth: img.width,
              imageHeight: img.height,
            }));
          };
          img.src = imageUrl;
        }
      } catch (error) {
        console.error("Error loading banner:", error);
        showToast("バナーの読み込みに失敗しました", "error");
        navigate("/admin/banners");
      } finally {
        setLoading(false);
      }
    };

    loadBanner();
  }, [id, navigate, showToast]);

  const handleBannerChange = (
    field: keyof BannerFormData,
    value: string | File | "active" | "inactive" | null
  ) => {
    setBanner((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Handle image preview
    if (field === "image" && value instanceof File) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const previewUrl = reader.result as string;
        setBanner((prev) => ({
          ...prev,
          preview: previewUrl,
        }));
        
        // Load image to get dimensions
        const img = new Image();
        img.onload = () => {
          setBanner((prev) => ({
            ...prev,
            imageWidth: img.width,
            imageHeight: img.height,
          }));
        };
        img.src = previewUrl;
      };
      reader.readAsDataURL(value);
    } else if (field === "image" && value === null) {
      setBanner((prev) => ({
        ...prev,
        preview: prev.existing_image_url,
        image: null,
        imageWidth: undefined,
        imageHeight: undefined,
        sizeRatio: undefined,
      }));
    }
  };

  const handleImageChange = (file: File | null) => {
    if (file) {
      handleBannerChange("image", file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!banner.title) {
      showToast("タイトルは必須です", "error");
      return;
    }

    if (!id) {
      showToast("バナーIDが指定されていません", "error");
      return;
    }

    setSubmitting(true);

    try {
      const response = await apiService.updateBanner(
        id,
        {
          title: banner.title,
          title_color: banner.title_color,
          title_font_size: banner.title_font_size,
          title_position: banner.title_position,
          title_vertical_position: banner.title_vertical_position,
          description: banner.description,
          description_color: banner.description_color,
          description_font_size: banner.description_font_size,
          description_position: banner.description_position,
          // 説明の縦位置はタイトルと同じ値に設定
          description_vertical_position: banner.title_vertical_position,
          page_url: banner.page_url,
          display_text: banner.display_text,
          status: banner.status,
        },
        banner.image || undefined
      );

      if (response.error) {
        throw new Error(response.error);
      }

      showToast("バナーを更新しました", "success");
      navigate("/admin/banners");
    } catch (error) {
      console.error("Error updating banner:", error);
      showToast(
        error instanceof Error ? error.message : "バナーの更新に失敗しました",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumbs
          homePath="/admin"
          items={[
            { label: "ダッシュボード", path: "/admin" },
            { label: "バナー管理", path: "/admin/banners" },
            { label: "バナー編集" },
          ]}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              バナー編集
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              バナーの情報を編集できます
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-base font-semibold text-gray-900">
                画像 <span className="text-red-500">*</span>
              </label>
              {banner.preview && (
                <button
                  type="button"
                  onClick={() => handleBannerChange("image", null)}
                  className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  画像を削除
                </button>
              )}
            </div>

            {banner.preview ? (
              <div className="relative group">
                <div
                  ref={previewRef}
                  className="relative w-full"
                  style={{ aspectRatio: "2.56/1", maxHeight: "400px" }}
                >
                  <img
                    src={banner.preview}
                    alt="Banner preview"
                    className="w-full h-full object-cover  border-2 border-gray-200"
                  />
                  {/* Preview Overlay - Title and Description */}
                  <div
                    className={`absolute inset-0 flex p-6 md:p-8 lg:p-12 ${
                      banner.title_vertical_position === "top"
                        ? "items-start"
                        : banner.title_vertical_position === "bottom"
                        ? "items-end"
                        : "items-center"
                    }`}
                  >
                    <div className="w-full space-y-3">
                      {banner.title && (
                        <div
                          className={`w-full ${
                            banner.title_position === "left"
                              ? "text-left"
                              : banner.title_position === "center"
                              ? "text-center"
                              : banner.title_position === "right"
                              ? "text-right"
                              : "text-left"
                          }`}
                        >
                          <h2
                            className={`${
                              banner.title_font_size
                                ? getAdjustedFontSize(
                                    banner.title_font_size,
                                    sizeRatio
                                  )
                                : "text-4xl"
                            } font-bold leading-tight drop-shadow-lg`}
                            style={{
                              color: banner.title_color || "#FFFFFF",
                            }}
                          >
                            {banner.title}
                          </h2>
                        </div>
                      )}
                      {banner.description && (
                        <div
                          className={`w-full ${
                            banner.description_position === "left"
                              ? "text-left"
                              : banner.description_position === "center"
                              ? "text-center"
                              : banner.description_position === "right"
                              ? "text-right"
                              : "text-left"
                          }`}
                        >
                          <p
                            className={`${
                              banner.description_font_size
                                ? getAdjustedFontSize(
                                    banner.description_font_size,
                                    sizeRatio
                                  )
                                : "text-lg"
                            } leading-relaxed drop-shadow-lg`}
                            style={{
                              color: banner.description_color || "#FFFFFF",
                            }}
                          >
                            {banner.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Change Image Overlay */}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity  cursor-pointer z-20">
                    <div className="flex flex-col items-center space-y-2 text-white">
                      <Upload className="w-8 h-8" />
                      <span className="text-sm font-medium">画像を変更</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageChange(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label
                className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300  cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-all duration-200 bg-gray-50/30"
                style={{ aspectRatio: "2.56/1", maxHeight: "400px" }}
              >
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700 block">
                      画像をアップロード
                    </span>
                    <span className="text-xs text-gray-500 mt-1 block">
                      クリックまたはドラッグ＆ドロップ
                    </span>
                    <span className="text-xs text-purple-600 font-medium bg-purple-50 px-3 py-1 rounded-full mt-2 inline-block">
                      推奨サイズ: 950 × 370 (2.56:1)
                    </span>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImageChange(file);
                    }
                  }}
                />
              </label>
            )}
          </div>

          {/* Title Settings Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">
              タイトル <span className="text-red-500">*</span>
            </h2>

            <div className="space-y-4">
              {/* Title Input */}
              <div>
                <input
                  type="text"
                  value={banner.title}
                  onChange={(e) => handleBannerChange("title", e.target.value)}
                  placeholder="タイトルを入力"
                  className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              {/* Title Styling Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Title Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    タイトル色
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={banner.title_color}
                      onChange={(e) =>
                        handleBannerChange("title_color", e.target.value)
                      }
                      className="w-12 h-12 border-2 border-gray-300  cursor-pointer"
                    />
                    <input
                      type="text"
                      value={banner.title_color}
                      onChange={(e) =>
                        handleBannerChange("title_color", e.target.value)
                      }
                      className="flex-1 px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors text-sm font-mono"
                      pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                    />
                  </div>
                </div>

                {/* Title Font Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    文字サイズ
                  </label>
                  <select
                    value={banner.title_font_size}
                    onChange={(e) =>
                      handleBannerChange("title_font_size", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors bg-white"
                  >
                    <option value="text-2xl">小 (text-2xl)</option>
                    <option value="text-3xl">中 (text-3xl)</option>
                    <option value="text-4xl">大 (text-4xl)</option>
                    <option value="text-5xl">特大 (text-5xl)</option>
                    <option value="text-6xl">超特大 (text-6xl)</option>
                  </select>
                </div>

                {/* Title Horizontal Position */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    横位置
                  </label>
                  <select
                    value={banner.title_position}
                    onChange={(e) =>
                      handleBannerChange("title_position", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors bg-white"
                  >
                    <option value="left">左</option>
                    <option value="center">中央</option>
                    <option value="right">右</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Description Settings Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">説明</h2>

            <div className="space-y-4">
              {/* Description Input */}
              <div>
                <textarea
                  value={banner.description}
                  onChange={(e) =>
                    handleBannerChange("description", e.target.value)
                  }
                  placeholder="説明を入力（任意）"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              {/* Description Styling Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Description Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    説明色
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={banner.description_color}
                      onChange={(e) =>
                        handleBannerChange("description_color", e.target.value)
                      }
                      className="w-12 h-12 border-2 border-gray-300  cursor-pointer"
                    />
                    <input
                      type="text"
                      value={banner.description_color}
                      onChange={(e) =>
                        handleBannerChange("description_color", e.target.value)
                      }
                      className="flex-1 px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors text-sm font-mono"
                      pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                    />
                  </div>
                </div>

                {/* Description Font Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    文字サイズ
                  </label>
                  <select
                    value={banner.description_font_size}
                    onChange={(e) =>
                      handleBannerChange(
                        "description_font_size",
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors bg-white"
                  >
                    <option value="text-sm">小 (text-sm)</option>
                    <option value="text-base">中 (text-base)</option>
                    <option value="text-lg">大 (text-lg)</option>
                    <option value="text-xl">特大 (text-xl)</option>
                    <option value="text-2xl">超特大 (text-2xl)</option>
                  </select>
                </div>

                {/* Description Horizontal Position */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    横位置
                  </label>
                  <select
                    value={banner.description_position}
                    onChange={(e) =>
                      handleBannerChange("description_position", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors bg-white"
                  >
                    <option value="left">左</option>
                    <option value="center">中央</option>
                    <option value="right">右</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Vertical Position Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">
              縦位置（タイトル・説明共通）
            </h2>
            <div className="max-w-md">
              <select
                value={banner.title_vertical_position}
                onChange={(e) => {
                  const value = e.target.value;
                  handleVerticalPositionChange(value);
                }}
                className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors bg-white"
              >
                <option value="top">上</option>
                <option value="middle">中央</option>
                <option value="bottom">下</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                タイトルと説明は同じ縦位置に配置されます
              </p>
            </div>
          </div>

          {/* Other Settings Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">
              その他設定
            </h2>
            <div className="space-y-5">
              {/* Page URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ページURL
                </label>
                <input
                  type="url"
                  value={banner.page_url}
                  onChange={(e) =>
                    handleBannerChange("page_url", e.target.value)
                  }
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Display Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  表示テキスト
                </label>
                <input
                  type="text"
                  value={banner.display_text}
                  onChange={(e) =>
                    handleBannerChange("display_text", e.target.value)
                  }
                  placeholder="クリック可能なテキストを入力"
                  className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors"
                />
                <p className="text-xs text-gray-500 mt-2">
                  このテキストがURLの代わりに表示され、クリックするとページURLに移動します
                </p>
              </div>

              {/* Status */}
              <div className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ステータス
                </label>
                <select
                  value={banner.status}
                  onChange={(e) =>
                    handleBannerChange(
                      "status",
                      e.target.value as "active" | "inactive"
                    )
                  }
                  className="w-full px-4 py-2 border border-gray-300  focus:outline-none focus:border-blue-500 transition-colors bg-white"
                >
                  <option value="active">有効</option>
                  <option value="inactive">無効</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate("/admin/banners")}
              className="px-6 py-3 text-gray-700 bg-white border border-gray-300  font-medium hover:bg-gray-50 transition-all duration-200 cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 text-white font-medium  bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  更新中...
                </span>
              ) : (
                "バナーを更新"
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};
