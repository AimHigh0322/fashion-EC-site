import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { X, Upload, Trash2, ChevronRight, Home, Plus } from "lucide-react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { useToast } from "../../contexts/ToastContext";

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
}

export const BannerCreate = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [banners, setBanners] = useState<BannerFormData[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleRemoveBanner = (index: number) => {
    setBanners(banners.filter((_, i) => i !== index));
  };

  const handleBannerChange = (
    index: number,
    field: keyof BannerFormData,
    value: string | File | "active" | "inactive" | null
  ) => {
    const updatedBanners = [...banners];
    updatedBanners[index] = {
      ...updatedBanners[index],
      [field]: value,
    };

    // Handle image preview
    if (field === "image") {
      if (value instanceof File) {
        const reader = new FileReader();
        reader.onloadend = () => {
          updatedBanners[index].preview = reader.result as string;
          setBanners(updatedBanners);
        };
        reader.readAsDataURL(value);
      } else if (value === null) {
        // Clear image and preview
        updatedBanners[index].preview = null;
        setBanners(updatedBanners);
      }
    } else {
      setBanners(updatedBanners);
    }
  };

  const handleImageChange = (index: number, file: File | null) => {
    if (file) {
      handleBannerChange(index, "image", file);
    }
  };

  const handleMultipleImageUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newBanner: BannerFormData = {
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
          image: file,
          preview: reader.result as string,
        };

        setBanners((prev) => {
          // Check if this banner already exists (avoid duplicates)
          const exists = prev.some((b) => b.image === file);
          if (exists) return prev;
          return [...prev, newBanner];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that all banners have required fields
    const invalidBanners = banners.filter(
      (banner) => !banner.title || !banner.image
    );

    if (invalidBanners.length > 0) {
      showToast("すべてのバナーにタイトルと画像が必要です", "error");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      const bannersData = banners.map((banner) => ({
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
      }));

      // Append images
      banners.forEach((banner) => {
        if (banner.image) {
          formData.append("images", banner.image);
        }
      });

      // Append banners data as JSON
      formData.append("banners", JSON.stringify(bannersData));

      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:8888/api"
        }/banners/multiple`,
        {
          method: "POST",
          headers,
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "バナーの作成に失敗しました");
      }

      showToast(`${banners.length}件のバナーを作成しました`, "success");
      navigate("/admin/banners");
    } catch (error) {
      console.error("Error creating banners:", error);
      showToast(
        error instanceof Error ? error.message : "バナーの作成に失敗しました",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600">
          <Link
            to="/admin"
            className="hover:text-purple-600 flex items-center space-x-1"
          >
            <Home className="w-4 h-4" />
            <span>ダッシュボード</span>
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Link to="/admin/banners" className="hover:text-purple-600">
            バナー管理
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-pink-600 font-medium">バナー作成</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              バナー作成
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              複数のバナーを一度に作成できます
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Initial Upload Area - Show only when no banners */}
          {banners.length === 0 && (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="bg-white rounded-lg shadow p-8 border-2 border-gray-200 w-full max-w-2xl">
                <label className="block text-sm font-medium text-gray-700 mb-6 text-center">
                  画像をアップロード <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-2 font-normal">
                    (複数選択可能)
                  </span>
                </label>
                <div className="flex justify-center">
                  <label className="flex flex-col items-center justify-center w-full max-w-[600px] h-[300px] rounded-lg cursor-pointer hover:bg-gray-50 transition-all duration-200 bg-gray-50/50 p-8">
                    <Upload className="w-16 h-16 text-gray-400 mb-4" />
                    <span className="text-base font-medium text-gray-600 mb-2">
                      画像をアップロード
                    </span>
                    <span className="text-sm text-gray-500 mb-3">
                      クリックまたはドラッグ＆ドロップ（複数選択可能）
                    </span>
                    <span className="text-sm text-blue-600 font-medium bg-blue-50 px-4 py-2 rounded">
                      推奨サイズ: 1280 × 500
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        handleMultipleImageUpload(e.target.files);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Banner Forms - Show after images are uploaded */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banners.map((banner, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow p-6 space-y-4 border-2 border-gray-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    バナー {index + 1}
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleRemoveBanner(index)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Image Upload with Preview */}
                  <div className="md:col-span-12">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      画像 <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1">
                      {banner.preview ? (
                        <div
                          className="relative w-full"
                          style={{ aspectRatio: "2.567" }}
                        >
                          <img
                            src={banner.preview}
                            alt="Preview"
                            className="w-full h-full object-cover rounded-lg border border-gray-300 shadow-sm"
                          />
                          {/* Preview Overlay - Title and Description */}
                          <div className={`absolute inset-0 flex p-6 md:p-8 lg:p-12 ${
                            banner.title_vertical_position === "top" ? "items-start" :
                            banner.title_vertical_position === "bottom" ? "items-end" :
                            "items-center"
                          }`}>
                            <div className="w-full space-y-4">
                              {banner.title && (
                                <div 
                                  className={`w-full ${
                                    banner.title_position === "left" ? "text-left" :
                                    banner.title_position === "center" ? "text-center" :
                                    banner.title_position === "right" ? "text-right" : "text-left"
                                  }`}
                                >
                                  <h2
                                    className={`${banner.title_font_size || "text-4xl"} font-bold leading-tight`}
                                    style={{ color: banner.title_color || "#FFFFFF" }}
                                  >
                                    {banner.title}
                                  </h2>
                                </div>
                              )}
                              {banner.description && (
                                <div 
                                  className={`w-full ${
                                    banner.description_position === "left" ? "text-left" :
                                    banner.description_position === "center" ? "text-center" :
                                    banner.description_position === "right" ? "text-right" : "text-left"
                                  }`}
                                >
                                  <p
                                    className={`${banner.description_font_size || "text-lg"} leading-relaxed`}
                                    style={{ color: banner.description_color || "#FFFFFF" }}
                                  >
                                    {banner.description}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleBannerChange(index, "image", null)
                            }
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-lg transition-all hover:scale-110 z-10"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label
                          className="flex flex-col items-center justify-center w-full border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-all duration-200 bg-gray-50/50"
                          style={{ aspectRatio: "2.567", minHeight: "117px" }}
                        >
                          <Upload className="w-10 h-10 text-gray-400 mb-3" />
                          <span className="text-sm font-medium text-gray-600">
                            画像をアップロード
                          </span>
                          <span className="text-xs text-gray-500 mt-1 mb-2">
                            クリックまたはドラッグ＆ドロップ
                          </span>
                          <span className="text-xs text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded">
                            推奨サイズ: 300 × 117
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageChange(index, file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="md:col-span-7">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      タイトル <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={banner.title}
                      onChange={(e) =>
                        handleBannerChange(index, "title", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Title Color */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      タイトル色
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={banner.title_color}
                        onChange={(e) =>
                          handleBannerChange(
                            index,
                            "title_color",
                            e.target.value
                          )
                        }
                        className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={banner.title_color}
                        onChange={(e) =>
                          handleBannerChange(
                            index,
                            "title_color",
                            e.target.value
                          )
                        }
                        className="w-20 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-xs"
                        pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                      />
                    </div>
                  </div>

                  {/* Title Font Size */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      タイトル文字サイズ
                    </label>
                    <select
                      value={banner.title_font_size}
                      onChange={(e) =>
                        handleBannerChange(index, "title_font_size", e.target.value)
                      }
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                    >
                      <option value="text-2xl">小 (text-2xl)</option>
                      <option value="text-3xl">中 (text-3xl)</option>
                      <option value="text-4xl">大 (text-4xl)</option>
                      <option value="text-5xl">特大 (text-5xl)</option>
                      <option value="text-6xl">超特大 (text-6xl)</option>
                    </select>
                  </div>

                  {/* Title Position */}
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      タイトル横位置
                    </label>
                    <select
                      value={banner.title_position}
                      onChange={(e) =>
                        handleBannerChange(index, "title_position", e.target.value)
                      }
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                    >
                      <option value="left">左</option>
                      <option value="center">中央</option>
                      <option value="right">右</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-7">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      説明
                    </label>
                    <textarea
                      value={banner.description}
                      onChange={(e) =>
                        handleBannerChange(index, "description", e.target.value)
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Description Color */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      説明色
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={banner.description_color}
                        onChange={(e) =>
                          handleBannerChange(
                            index,
                            "description_color",
                            e.target.value
                          )
                        }
                        className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={banner.description_color}
                        onChange={(e) =>
                          handleBannerChange(
                            index,
                            "description_color",
                            e.target.value
                          )
                        }
                        className="w-20 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-xs"
                        pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                      />
                    </div>
                  </div>

                  {/* Description Font Size */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      説明文字サイズ
                    </label>
                    <select
                      value={banner.description_font_size}
                      onChange={(e) =>
                        handleBannerChange(index, "description_font_size", e.target.value)
                      }
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                    >
                      <option value="text-sm">小 (text-sm)</option>
                      <option value="text-base">中 (text-base)</option>
                      <option value="text-lg">大 (text-lg)</option>
                      <option value="text-xl">特大 (text-xl)</option>
                      <option value="text-2xl">超特大 (text-2xl)</option>
                    </select>
                  </div>

                  {/* Description Position */}
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      説明横位置
                    </label>
                    <select
                      value={banner.description_position}
                      onChange={(e) =>
                        handleBannerChange(index, "description_position", e.target.value)
                      }
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                    >
                      <option value="left">左</option>
                      <option value="center">中央</option>
                      <option value="right">右</option>
                    </select>
                  </div>

                  {/* Vertical Position */}
                  <div className="md:col-span-12">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        縦位置（タイトル・説明共通）
                      </label>
                      <select
                        value={banner.title_vertical_position}
                        onChange={(e) => {
                          const value = e.target.value;
                          handleBannerChange(index, "title_vertical_position", value);
                          // 説明の縦位置も同じ値に設定
                          handleBannerChange(index, "description_vertical_position", value);
                        }}
                        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="top">上</option>
                        <option value="middle">中央</option>
                        <option value="bottom">下</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        タイトルと説明は同じ縦位置に配置されます
                      </p>
                    </div>
                  </div>

                  {/* Page URL */}
                  <div className="md:col-span-7">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ページURL
                    </label>
                    <input
                      type="url"
                      value={banner.page_url}
                      onChange={(e) =>
                        handleBannerChange(index, "page_url", e.target.value)
                      }
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Display Text */}
                  <div className="md:col-span-7">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      表示テキスト
                    </label>
                    <input
                      type="text"
                      value={banner.display_text}
                      onChange={(e) =>
                        handleBannerChange(index, "display_text", e.target.value)
                      }
                      placeholder="クリック可能なテキストを入力"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      このテキストがURLの代わりに表示され、クリックするとページURLに移動します
                    </p>
                  </div>

                  {/* Status */}
                  <div className="md:col-span-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ステータス
                    </label>
                    <select
                      value={banner.status}
                      onChange={(e) =>
                        handleBannerChange(
                          index,
                          "status",
                          e.target.value as "active" | "inactive"
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="active">有効</option>
                      <option value="inactive">無効</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Banner Button - Show in grid when banners exist */}
            {banners.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center min-h-[400px] hover:border-blue-400 hover:bg-gray-50 transition-all cursor-pointer">
                <button
                  type="button"
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.multiple = true;
                    input.onchange = (event) => {
                      const target = event.target as HTMLInputElement;
                      if (target.files) {
                        handleMultipleImageUpload(target.files);
                      }
                    };
                    input.click();
                  }}
                  className="flex flex-col items-center justify-center space-y-3 w-full h-full"
                >
                  <div className="w-16 h-16 rounded-full border-2 border-red-500 flex items-center justify-center">
                    <Plus className="w-8 h-8 text-red-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    バナーを追加
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Submit Button - Show only when banners exist */}
          {banners.length > 0 && (
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate("/admin/banners")}
                className="px-8 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-lg font-medium shadow-sm hover:bg-gray-50 hover:border-gray-400 hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3 text-white font-medium rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-sm"
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
                    作成中...
                  </span>
                ) : (
                  "バナーを作成"
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </AdminLayout>
  );
};
