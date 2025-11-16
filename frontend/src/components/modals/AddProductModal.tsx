import { useState, useEffect, useRef } from "react";
import { X, Upload, XCircle } from "lucide-react";
import { apiService } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock_quantity: number;
  status: string;
  main_image_url?: string;
  images?: Array<{ id: string; image_url: string; sort_order: number }>;
  [key: string]: unknown;
}

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: () => void;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string;
  level: number;
  [key: string]: unknown;
}

type Gender = "male" | "female" | null;

const GENDER_OPTIONS = [
  { value: "male", label: "メンズ", slug: "mens" },
  { value: "female", label: "レディース", slug: "ladies" },
];

interface AttributeDefinition {
  id: string;
  name: string;
  type: string;
  is_required: boolean;
  [key: string]: unknown;
}

interface Campaign {
  id: string;
  name: string;
  is_active: boolean;
  [key: string]: unknown;
}

export const AddProductModal = ({
  product,
  onClose,
  onSave,
}: ProductModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    price: "",
    stock_quantity: "",
    status: "draft",
    description: "",
    category_ids: [] as string[],
    attributes: [] as Array<{ attribute_definition_id: string; value: string }>,
    campaign_ids: [] as string[],
    compare_price: "",
    cost_price: "",
    weight: "",
    dimensions: "",
    seo_title: "",
    seo_description: "",
    brand_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributeDefinitions, setAttributeDefinitions] = useState<
    AttributeDefinition[]
  >([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedGender, setSelectedGender] = useState<Gender>(null);
  const [selectedBasicCategoryId, setSelectedBasicCategoryId] =
    useState<string>("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const { showToast } = useToast();
  const isSubmittingRef = useRef(false);
  const lastSubmitTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load categories, campaigns, and brands
  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoriesRes, campaignsRes] = await Promise.all([
          apiService.getCategories(),
          apiService.getCampaigns(),
        ]);
        if (categoriesRes.data) {
          const cats = Array.isArray(categoriesRes.data)
            ? categoriesRes.data
            : (categoriesRes.data as { data?: Category[] }).data || [];
          setCategories(cats);
        }
        if (campaignsRes.data) {
          const camps = Array.isArray(campaignsRes.data)
            ? campaignsRes.data
            : (campaignsRes.data as { data?: Campaign[] }).data || [];
          setCampaigns(camps.filter((c) => c.is_active));
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };
    loadData();
  }, []);

  // Load product data when editing
  useEffect(() => {
    const loadProductData = async () => {
      if (product?.id) {
        setLoading(true);
        try {
          const response = await apiService.getProduct(product.id);
          if (response.error) {
            console.error("API Error:", response.error);
            showToast("商品データの読み込みに失敗しました", "error");
            setLoading(false);
            return;
          }

          // Backend returns { success: true, data: product }
          // API service returns { data: { success: true, data: product } }
          const productData = ((response.data as { data?: Product })?.data ||
            response.data) as Product;

          if (!productData) {
            console.error("No product data in response");
            showToast("商品データが見つかりませんでした", "error");
            setLoading(false);
            return;
          }

          console.log("Loaded product data:", productData);

          const categories = Array.isArray(productData.categories)
            ? productData.categories
            : [];
          // Map attributes to the correct format
          const attributes = Array.isArray(productData.attributes)
            ? productData.attributes.map(
                (attr: {
                  attribute_definition_id?: string;
                  id?: string;
                  value?: string;
                }) => ({
                  attribute_definition_id:
                    attr.attribute_definition_id || attr.id || "",
                  value: String(attr.value || ""),
                })
              )
            : [];

          const firstCategoryId = categories.length > 0 ? categories[0].id : "";
          const firstCategory = categories.length > 0 ? categories[0] : null;

          // Determine gender and basic category from category hierarchy
          let gender: Gender = null;
          let basicCategoryId = "";

          if (firstCategory) {
            // If level 3, find parent (basic category) and grandparent (gender)
            if (firstCategory.level === 3 && firstCategory.parent_id) {
              const basicCategory = categories.find(
                (c) => c.id === firstCategory.parent_id
              );
              if (basicCategory && basicCategory.parent_id) {
                const genderCategory = categories.find(
                  (c) => c.id === basicCategory.parent_id && c.level === 1
                );
                if (genderCategory) {
                  if (
                    genderCategory.slug === "mens" ||
                    genderCategory.name === "メンズ"
                  ) {
                    gender = "male";
                  } else if (
                    genderCategory.slug === "ladies" ||
                    genderCategory.name === "レディース"
                  ) {
                    gender = "female";
                  }
                  basicCategoryId = basicCategory.id;
                }
              }
            } else if (firstCategory.level === 2) {
              // If level 2, find parent (gender)
              if (firstCategory.parent_id) {
                const genderCategory = categories.find(
                  (c) => c.id === firstCategory.parent_id && c.level === 1
                );
                if (genderCategory) {
                  if (
                    genderCategory.slug === "mens" ||
                    genderCategory.name === "メンズ"
                  ) {
                    gender = "male";
                  } else if (
                    genderCategory.slug === "ladies" ||
                    genderCategory.name === "レディース"
                  ) {
                    gender = "female";
                  }
                  basicCategoryId = firstCategory.id;
                }
              }
            }
          }

          // Get campaign IDs
          const campaigns = Array.isArray(productData.campaigns)
            ? productData.campaigns
            : [];
          const campaignIds = campaigns.map((c: Campaign) => c.id);

          const newFormData = {
            name: String(productData.name || ""),
            sku: String(productData.sku || ""),
            price: String(productData.price || ""),
            stock_quantity: String(productData.stock_quantity || ""),
            status: String(productData.status || "draft"),
            description: String(productData.description || ""),
            category_ids: categories.length > 0 ? [firstCategoryId] : [],
            attributes: attributes,
            campaign_ids: campaignIds,
            compare_price: String(productData.compare_price || ""),
            cost_price: String(productData.cost_price || ""),
            weight: String(productData.weight || ""),
            dimensions: String(productData.dimensions || ""),
            seo_title: String(productData.seo_title || ""),
            seo_description: String(productData.seo_description || ""),
            brand_id: String(productData.brand_id || ""),
          };

          console.log("Setting form data:", newFormData);
          setFormData(newFormData);
          setSelectedGender(gender);
          setSelectedBasicCategoryId(basicCategoryId);
          setSelectedCategoryId(firstCategoryId);

          // Load existing images
          const images = Array.isArray(productData.images)
            ? productData.images
            : [];

          if (images.length > 0) {
            // Sort images by sort_order
            const sortedImages = [...images].sort(
              (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
            );

            // Construct full image URLs
            const baseUrl = (
              import.meta.env.VITE_API_URL || "http://localhost:8888/api"
            ).replace(/\/api$/, "");

            const imageUrls = sortedImages
              .map((img: { image_url: string }) => {
                const imagePath = img.image_url;
                if (!imagePath) return "";
                if (imagePath.startsWith("http")) return imagePath;
                const path = imagePath.startsWith("/")
                  ? imagePath
                  : `/${imagePath}`;
                return `${baseUrl}${path}`;
              })
              .filter((url: string) => url !== "");

            console.log("Loading existing images:", imageUrls);
            setImagePreviews(imageUrls);
            setExistingImageUrls(imageUrls);
          } else {
            // If no images array, try main_image_url
            if (productData.main_image_url) {
              const baseUrl = (
                import.meta.env.VITE_API_URL || "http://localhost:8888/api"
              ).replace(/\/api$/, "");
              const imagePath = productData.main_image_url;
              const fullUrl = imagePath.startsWith("http")
                ? imagePath
                : `${baseUrl}${
                    imagePath.startsWith("/") ? imagePath : `/${imagePath}`
                  }`;
              setImagePreviews([fullUrl]);
              setExistingImageUrls([fullUrl]);
            } else {
              setImagePreviews([]);
              setExistingImageUrls([]);
            }
          }
        } catch (error) {
          console.error("Failed to load product data:", error);
          showToast("商品データの読み込みに失敗しました", "error");
        } finally {
          setLoading(false);
        }
      }
    };
    loadProductData();
  }, [product?.id, showToast]);

  // Load attribute definitions when category is selected
  useEffect(() => {
    const loadAttributes = async () => {
      if (selectedCategoryId) {
        try {
          const response = await apiService.getAttributeDefinitionsByCategories(
            [selectedCategoryId]
          );
          if (response.data) {
            const attrs = Array.isArray(response.data)
              ? response.data
              : (response.data as { data?: AttributeDefinition[] }).data || [];
            setAttributeDefinitions(attrs);
          }
        } catch {
          setAttributeDefinitions([]);
        }
      } else {
        setAttributeDefinitions([]);
      }
    };
    loadAttributes();
  }, [selectedCategoryId]);

  // Reset form when modal closes (product becomes null)
  useEffect(() => {
    if (!product) {
      // Reset for new product - only reset when product is explicitly null
      setFormData({
        name: "",
        sku: "",
        price: "",
        stock_quantity: "",
        status: "draft",
        description: "",
        category_ids: [],
        attributes: [],
        campaign_ids: [],
        compare_price: "",
        cost_price: "",
        weight: "",
        dimensions: "",
        seo_title: "",
        seo_description: "",
        brand_id: "",
      });
      setSelectedCategoryId("");
      setSelectedGender(null);
      setSelectedBasicCategoryId("");
      setAttributeDefinitions([]);
      setSelectedImages([]);
      setImagePreviews([]);
      setExistingImageUrls([]);
      isSubmittingRef.current = false;
    }
  }, [product]);

  // Get gender categories (level 1)
  const genderCategories = categories.filter((cat) => cat.level === 1);

  // Get basic categories (level 2) for selected gender
  const basicCategories = selectedGender
    ? categories.filter((cat) => {
        if (cat.level !== 2) return false;
        const genderCategory = genderCategories.find(
          (gc) =>
            (gc.slug ===
              GENDER_OPTIONS.find((g) => g.value === selectedGender)?.slug ||
              gc.slug === selectedGender) &&
            gc.level === 1
        );
        return genderCategory && cat.parent_id === genderCategory.id;
      })
    : [];

  // Get subcategories (level 3) for selected basic category
  const subcategories = selectedBasicCategoryId
    ? categories.filter(
        (cat) => cat.level === 3 && cat.parent_id === selectedBasicCategoryId
      )
    : [];

  const handleGenderChange = (gender: Gender) => {
    setSelectedGender(gender);
    setSelectedBasicCategoryId("");
    setSelectedCategoryId("");
    setFormData({ ...formData, category_ids: [] });
    setAttributeDefinitions([]);
  };

  const handleBasicCategoryChange = (basicCategoryId: string) => {
    setSelectedBasicCategoryId(basicCategoryId);
    setSelectedCategoryId("");
    setFormData({ ...formData, category_ids: [] });
    setAttributeDefinitions([]);
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setFormData({ ...formData, category_ids: categoryId ? [categoryId] : [] });
  };

  const handleAttributeChange = (attributeDefId: string, value: string) => {
    const existingIndex = formData.attributes.findIndex(
      (attr) => attr.attribute_definition_id === attributeDefId
    );
    if (existingIndex >= 0) {
      const newAttributes = [...formData.attributes];
      newAttributes[existingIndex] = {
        attribute_definition_id: attributeDefId,
        value,
      };
      setFormData({ ...formData, attributes: newAttributes });
    } else {
      setFormData({
        ...formData,
        attributes: [
          ...formData.attributes,
          { attribute_definition_id: attributeDefId, value },
        ],
      });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate files
    const validFiles: File[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        showToast(`${file.name} は画像ファイルではありません`, "error");
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast(`${file.name} のサイズが5MBを超えています`, "error");
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Create previews using Promise.all for proper async handling
    const previewPromises = validFiles.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(previewPromises).then((previews) => {
      setImagePreviews((prev) => [...prev, ...previews]);
    });

    setSelectedImages((prev) => [...prev, ...validFiles]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    // Check if this is an existing image or a new one
    const existingCount = existingImageUrls.length;
    if (index < existingCount) {
      // Remove from existing images
      setExistingImageUrls((prev) => prev.filter((_, i) => i !== index));
    } else {
      // Remove from new images (adjust index)
      const newIndex = index - existingCount;
      setSelectedImages((prev) => prev.filter((_, i) => i !== newIndex));
    }
    // Update previews
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent multiple submissions - check early and set immediately
    // Use a timestamp to track the last submission attempt (prevents React StrictMode double execution)
    const now = Date.now();
    if (isSubmittingRef.current || now - lastSubmitTimeRef.current < 1000) {
      console.log(
        "Submit blocked: already submitting or too soon after last submit"
      );
      return;
    }
    lastSubmitTimeRef.current = now;

    if (isSubmittingRef.current) {
      console.log("Submit blocked: already submitting");
      return;
    }

    // Validate category selection
    if (!selectedGender) {
      showToast("性別を選択してください", "error");
      return;
    }
    if (!selectedBasicCategoryId) {
      showToast("基本カテゴリーを選択してください", "error");
      return;
    }
    if (!selectedCategoryId) {
      showToast("サブカテゴリーを選択してください", "error");
      return;
    }

    // Set submitting flag immediately to prevent duplicate submissions
    isSubmittingRef.current = true;
    setLoading(true);
    setUploadingImages(true);

    console.log(
      `[handleSubmit] Called at ${new Date().toISOString()}, selectedImages count:`,
      selectedImages.length
    );

    try {
      // Upload images first if there are any
      const imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        console.log(`Starting upload of ${selectedImages.length} images`);
        for (let i = 0; i < selectedImages.length; i++) {
          const file = selectedImages[i];
          console.log(
            `Uploading image ${i + 1}/${selectedImages.length}: ${file.name}`
          );
          try {
            const uploadResponse = await apiService.uploadImage(file);
            console.log(`Upload response for ${file.name}:`, uploadResponse);
            if (
              uploadResponse.data &&
              uploadResponse.data.success &&
              uploadResponse.data.data?.url
            ) {
              imageUrls.push(uploadResponse.data.data.url);
              console.log(
                `Successfully uploaded ${file.name}, URL: ${uploadResponse.data.data.url}`
              );
            } else {
              console.error(
                `Upload failed for ${file.name}:`,
                uploadResponse.error
              );
              showToast(
                uploadResponse.error ||
                  `${file.name} のアップロードに失敗しました`,
                "error"
              );
            }
          } catch (error) {
            console.error(`Image upload error for ${file.name}:`, error);
            showToast(`${file.name} のアップロードに失敗しました`, "error");
          }
        }
        console.log(`Completed uploading ${imageUrls.length} images`);
      }

      // Combine existing image URLs with newly uploaded ones
      const allImageUrls = [...existingImageUrls, ...imageUrls];

      // Ensure category_ids is properly set
      const categoryIds =
        formData.category_ids && formData.category_ids.length > 0
          ? formData.category_ids
          : selectedCategoryId
          ? [selectedCategoryId]
          : [];

      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity),
        compare_price: formData.compare_price
          ? parseFloat(formData.compare_price)
          : undefined,
        cost_price: formData.cost_price
          ? parseFloat(formData.cost_price)
          : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        // Ensure category_ids is included and not empty
        category_ids: categoryIds,
        // Add all image URLs (existing + newly uploaded, remove duplicates)
        ...(allImageUrls.length > 0
          ? {
              image_urls: [...new Set(allImageUrls)], // Remove duplicates
              main_image_url: allImageUrls[0] || "",
            }
          : {}),
        // Don't send SKU for new products (it will be auto-generated)
        ...(product ? {} : { sku: undefined }),
      };

      console.log("Submitting product with category_ids:", categoryIds);

      let response;
      if (product) {
        response = await apiService.updateProduct(product.id, productData);
      } else {
        response = await apiService.createProduct(productData);
      }

      if (!response.error) {
        showToast(
          product ? "商品を更新しました" : "商品を登録しました",
          "success"
        );
        // Reset images
        setSelectedImages([]);
        setImagePreviews([]);
        onSave();
      } else {
        showToast(response.error, "error");
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "保存に失敗しました",
        "error"
      );
    } finally {
      setLoading(false);
      setUploadingImages(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-bold">
            {product ? "商品編集" : "商品登録"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        {/* Scrollable Body */}
        <form
          id="product-form"
          onSubmit={(e) => {
            // Additional protection against React StrictMode double execution
            if (isSubmittingRef.current) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            handleSubmit(e);
          }}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                商品名 *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                商品画像 *
              </label>
              <p className="text-xs text-gray-500 mb-2">
                推奨サイズ: 220×270px
              </p>
              <div className="space-y-3">
                {/* Image Preview Grid */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`プレビュー ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          disabled={uploadingImages}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="画像を削除"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                        {index === 0 && (
                          <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg">
                            メイン
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Area */}
                <label className="block">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    disabled={uploadingImages}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      画像を選択（複数選択可）
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF (最大5MB/枚)
                    </p>
                    {uploadingImages && (
                      <p className="text-xs text-blue-600 mt-2">
                        アップロード中...
                      </p>
                    )}
                  </div>
                </label>
                <div className="text-xs text-gray-500">
                  <p>最初の画像がメイン画像として設定されます</p>
                  <p>
                    画像は商品登録ボタンをクリックしたときにアップロードされます
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  価格 * (¥)
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  在庫数 *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.stock_quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, stock_quantity: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  比較価格 (¥)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.compare_price}
                  onChange={(e) =>
                    setFormData({ ...formData, compare_price: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  原価 (¥)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_price}
                  onChange={(e) =>
                    setFormData({ ...formData, cost_price: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
            {/* Gender, Categories and Status */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Gender Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    性別を選択 *
                  </label>
                  <select
                    value={selectedGender || ""}
                    onChange={(e) =>
                      handleGenderChange(e.target.value as Gender)
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="">選択してください</option>
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Basic Category Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    基本カテゴリーを選択 *
                  </label>
                  <select
                    value={selectedBasicCategoryId}
                    onChange={(e) => handleBasicCategoryChange(e.target.value)}
                    required
                    disabled={!selectedGender}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {selectedGender
                        ? "基本カテゴリーを選択してください"
                        : "まず性別を選択してください"}
                    </option>
                    {basicCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subcategory Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    サブカテゴリーを選択 *
                  </label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    required
                    disabled={!selectedBasicCategoryId}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {selectedBasicCategoryId
                        ? "サブカテゴリーを選択してください"
                        : "まず基本カテゴリーを選択してください"}
                    </option>
                    {subcategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ステータス
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="draft">下書き</option>
                  <option value="active">有効（販売中）</option>
                  <option value="out_of_stock">在庫不足</option>
                  <option value="inactive">非公開（販売停止）</option>
                  <option value="reservation">予約受付中</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                説明
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="商品の詳細説明を入力してください"
              />
            </div>
          </div>

          {/* Attributes (Dynamic based on selected category) */}
          {selectedCategoryId && attributeDefinitions.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                属性
              </h3>
              <div className="space-y-3">
                {attributeDefinitions.map((attrDef) => {
                  const currentValue =
                    formData.attributes.find(
                      (a) => a.attribute_definition_id === attrDef.id
                    )?.value || "";
                  return (
                    <div key={attrDef.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {attrDef.name} {attrDef.is_required && "*"}
                      </label>
                      {attrDef.type === "text" && (
                        <input
                          type="text"
                          required={attrDef.is_required}
                          value={currentValue}
                          onChange={(e) =>
                            handleAttributeChange(attrDef.id, e.target.value)
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      )}
                      {attrDef.type === "number" && (
                        <input
                          type="number"
                          required={attrDef.is_required}
                          value={currentValue}
                          onChange={(e) =>
                            handleAttributeChange(attrDef.id, e.target.value)
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      )}
                      {attrDef.type === "select" && (
                        <select
                          required={attrDef.is_required}
                          value={currentValue}
                          onChange={(e) =>
                            handleAttributeChange(attrDef.id, e.target.value)
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                        >
                          <option value="">選択してください</option>
                          {/* Options would come from attribute definition */}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Campaigns */}
          {campaigns.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                キャンペーン
              </h3>
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-4">
                <div className="space-y-2">
                  {campaigns.map((campaign) => (
                    <label
                      key={campaign.id}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={formData.campaign_ids.includes(campaign.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              campaign_ids: [
                                ...formData.campaign_ids,
                                campaign.id,
                              ],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              campaign_ids: formData.campaign_ids.filter(
                                (id) => id !== campaign.id
                              ),
                            });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {campaign.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Additional Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  重量 (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.weight}
                  onChange={(e) =>
                    setFormData({ ...formData, weight: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  サイズ (例: 30x20x10)
                </label>
                <input
                  type="text"
                  value={formData.dimensions}
                  onChange={(e) =>
                    setFormData({ ...formData, dimensions: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="30x20x10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SEOタイトル
              </label>
              <input
                type="text"
                value={formData.seo_title}
                onChange={(e) =>
                  setFormData({ ...formData, seo_title: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="検索エンジン用のタイトル"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SEO説明
              </label>
              <textarea
                value={formData.seo_description}
                onChange={(e) =>
                  setFormData({ ...formData, seo_description: e.target.value })
                }
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="検索エンジン用の説明文"
              />
            </div>
          </div>
        </form>
        {/* Fixed Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={loading || uploadingImages || isSubmittingRef.current}
            onClick={(e) => {
              // Prevent double-click
              if (loading || uploadingImages || isSubmittingRef.current) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || uploadingImages ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
};
