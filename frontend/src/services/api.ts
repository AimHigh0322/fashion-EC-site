// API service for backend communication
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8888/api";

interface ApiResponse<T> {
  data?: T;
  error?: string;
  total?: number;
  count?: number;
}

// Type definitions
interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  stock_quantity: number;
  status: string;
  [key: string]: unknown;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string;
  level: number;
  [key: string]: unknown;
}

interface OrderItem {
  id: string;
  product_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_email?: string;
  total_amount: number;
  status: string;
  payment_status?: string;
  payment_method?: string;
  shipping_cost?: number;
  tax_amount?: number;
  createdAt: string;
  items?: OrderItem[];
  [key: string]: unknown;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  [key: string]: unknown;
}

interface NotificationSettings {
  email_notifications?: boolean;
  order_updates?: boolean;
  promotions?: boolean;
  [key: string]: unknown;
}

interface Review {
  id: string;
  product_id: string;
  order_id: string;
  user_id: string;
  rating: number;
  title?: string;
  comment?: string;
  status: string;
  createdAt: string;
  [key: string]: unknown;
}

interface StockHistory {
  id: string;
  product_id: string;
  quantity_change: number;
  change_type: string;
  notes?: string;
  created_by?: string;
  createdAt: string;
  [key: string]: unknown;
}

interface StockUpdate {
  product_id?: string;
  quantityChange: number;
  changeType: string;
  notes?: string;
}

interface BulkStockUpdateResult {
  product_id: string;
  success: boolean;
  error?: string;
}

interface Campaign {
  id: string;
  name: string;
  description?: string;
  label?: string;
  type: string;
  target_type?: "product" | "category" | "all";
  discount_type?: "percent" | "amount" | "freeShipping" | "points";
  discount_percent?: number;
  discount_value?: number;
  fixed_price?: number;
  minimum_purchase?: number;
  usage_limit?: number;
  user_limit?: number;
  current_usage?: number;
  status?: "active" | "inactive";
  start_date: string;
  end_date: string;
  is_active: boolean;
  target_ids?: string[];
  target_count?: number | string;
  products?: unknown[];
  categories?: unknown[];
  [key: string]: unknown;
}

interface AttributeDefinition {
  id: string;
  name: string;
  type: string;
  is_required: boolean;
  [key: string]: unknown;
}

interface Banner {
  id: string;
  title: string;
  title_color?: string;
  title_font_size?: string;
  title_position?: string;
  title_vertical_position?: string;
  description?: string;
  description_color?: string;
  description_font_size?: string;
  description_position?: string;
  description_vertical_position?: string;
  image_url: string;
  page_url?: string;
  display_text?: string;
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
  // Legacy fields for backward compatibility
  name?: string;
  link_url?: string;
  is_active?: boolean;
  [key: string]: unknown;
}

class ApiService {
  private getAuthToken(): string | null {
    return localStorage.getItem("token");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      let data;
      try {
        data = await response.json();
      } catch {
        // If response is not JSON, return a generic error
        return {
          error: "サーバーからの応答を解析できませんでした。",
        };
      }

      if (!response.ok) {
        // Return the error message from backend (already in Japanese)
        return {
          error: data.error || data.message || "リクエストに失敗しました。",
        };
      }

      // Handle backend response structure: { success: true/false, data: ..., message: ..., total: ... } or direct data
      if (data && typeof data === "object" && "success" in data) {
        // If success is false, return error
        if (data.success === false) {
          return {
            error: data.message || data.error || "リクエストに失敗しました。",
          };
        }

        // If success is true and has data, return the data
        if ("data" in data) {
          const response: ApiResponse<T> = { data: data.data };
          if ("total" in data && typeof data.total === "number") {
            response.total = data.total;
          }
          if ("count" in data && typeof data.count === "number") {
            response.count = data.count;
          }
          return response;
        }
      }

      return { data };
    } catch (error) {
      // Handle network errors (fetch failed - backend not running, CORS, etc.)
      if (error instanceof TypeError) {
        if (
          error.message.includes("fetch") ||
          error.message.includes("Failed to fetch")
        ) {
          return {
            error:
              "サーバーに接続できません。バックエンドが起動しているか確認してください。",
          };
        }
      }
      // Handle other network errors
      if (error instanceof Error && error.message.includes("NetworkError")) {
        return {
          error:
            "ネットワークエラーが発生しました。インターネット接続を確認してください。",
        };
      }
      return {
        error:
          error instanceof Error
            ? error.message
            : "ネットワークエラーが発生しました。",
      };
    }
  }

  // Auth endpoints
  async register(
    username: string,
    email: string,
    password: string,
    role: string = "user"
  ) {
    return this.request<{
      user: { id: string; username: string; email: string; role: string };
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password, role }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{
      token: string;
      user: {
        id: string;
        username: string;
        email: string;
        role: string;
        createdAt: string;
      };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request<{
      id: string;
      username: string;
      email: string;
      role: string;
      createdAt: string;
      updatedAt: string;
    }>("/auth/me", {
      method: "GET",
    });
  }

  // Test endpoint
  async test() {
    return this.request<{ status: string; time: number }>("/test", {
      method: "GET",
    });
  }

  // Product endpoints
  async getProducts(params?: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
    category_id?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.status) query.append("status", params.status);
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.offset) query.append("offset", params.offset.toString());
    if (params?.category_id) query.append("category_id", params.category_id);
    return this.request<Product[]>(`/products?${query.toString()}`);
  }

  async getProduct(id: string) {
    return this.request<Product>(`/products/${id}`);
  }

  async createProduct(product: Partial<Product>) {
    return this.request<Product>("/products", {
      method: "POST",
      body: JSON.stringify(product),
    });
  }

  async updateProduct(id: string, product: Partial<Product>) {
    return this.request<Product>(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(product),
    });
  }

  async deleteProduct(id: string) {
    return this.request<void>(`/products/${id}`, {
      method: "DELETE",
    });
  }

  async bulkUploadProducts(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const token = this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/products/bulk-upload`, {
      method: "POST",
      headers,
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) return { error: data.message || "Upload failed" };
    return { data };
  }

  async bulkUpdateStatus(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const token = this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(
      `${API_BASE_URL}/products/bulk-update-status`,
      {
        method: "POST",
        headers,
        body: formData,
      }
    );
    const data = await response.json();
    if (!response.ok) return { error: data.message || "Update failed" };
    return { data };
  }

  async exportProducts() {
    try {
      const token = this.getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/products/export/csv`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          error:
            errorData.message ||
            errorData.error ||
            `エクスポートに失敗しました (${response.status})`,
        };
      }

      // Check if response is actually CSV
      const contentType = response.headers.get("content-type") || "";
      const isCSV =
        contentType.includes("text/csv") ||
        contentType.includes("application/csv");

      if (!isCSV) {
        // If not CSV, try to get error message as text first
        const text = await response.text();
        try {
          const errorData = JSON.parse(text);
          return {
            error:
              errorData.message ||
              errorData.error ||
              "エクスポートに失敗しました",
          };
        } catch {
          return { error: text || "無効なレスポンス形式です" };
        }
      }

      const blob = await response.blob();

      // Check if blob is empty
      if (blob.size === 0) {
        return { error: "エクスポートデータが空です" };
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const filename = `products_${Date.now()}.csv`;
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none";

      // Append to body first
      document.body.appendChild(a);

      // Small delay to ensure DOM is ready, then trigger download
      await new Promise((resolve) => setTimeout(resolve, 10));
      a.click();

      // Clean up after download is triggered
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        window.URL.revokeObjectURL(url);
      }, 100);

      return { data: true };
    } catch (error) {
      console.error("Export error:", error);
      return {
        error:
          error instanceof Error
            ? error.message
            : "エクスポート中にエラーが発生しました",
      };
    }
  }

  // Category endpoints
  async getCategories() {
    return this.request<Category[]>("/categories");
  }

  async getCategoryTree() {
    return this.request<Category[]>("/categories/tree");
  }

  async createCategory(category: Partial<Category>) {
    return this.request<Category>("/categories", {
      method: "POST",
      body: JSON.stringify(category),
    });
  }

  async updateCategory(id: string, category: Partial<Category>) {
    return this.request<Category>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(category),
    });
  }

  async deleteCategory(id: string) {
    return this.request<void>(`/categories/${id}`, {
      method: "DELETE",
    });
  }

  async getCategory(id: string) {
    return this.request<Category>(`/categories/${id}`);
  }

  // Attribute endpoints
  async getAttributeDefinitionsByCategories(categoryIds: string[]) {
    const query = new URLSearchParams();
    if (categoryIds.length > 0) {
      query.append("category_ids", categoryIds.join(","));
    }
    return this.request<AttributeDefinition[]>(
      "/attributes/by-categories?" + query.toString()
    );
  }

  // Order endpoints
  async getOrders(params?: {
    status?: string;
    payment_status?: string;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.payment_status)
      query.append("payment_status", params.payment_status);
    if (params?.limit) query.append("limit", params.limit.toString());
    return this.request<Order[]>(`/orders?${query.toString()}`);
  }

  async getOrder(id: string) {
    return this.request<Order>(`/orders/${id}`);
  }

  async updateOrderStatus(id: string, status: string) {
    return this.request<Order>(`/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  async exportOrders() {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/orders/export`, {
      method: "GET",
      headers,
    });
    if (!response.ok) return { error: "Export failed" };
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_${Date.now()}.xlsx`;
    a.click();
    return { data: true };
  }

  // Campaign endpoints
  async getCampaigns(params?: { is_active?: boolean; status?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.is_active !== undefined) {
      queryParams.append("is_active", params.is_active.toString());
    }
    if (params?.status) {
      queryParams.append("status", params.status);
    }
    const query = queryParams.toString();
    return this.request<Campaign[]>(`/campaigns${query ? `?${query}` : ""}`);
  }

  async getActiveCampaigns() {
    return this.request<Campaign[]>("/campaigns/active");
  }

  async getCampaignsForProduct(productId: string, categoryIds?: string[]) {
    const queryParams = new URLSearchParams();
    if (categoryIds && categoryIds.length > 0) {
      queryParams.append("category_ids", categoryIds.join(","));
    }
    const query = queryParams.toString();
    return this.request<Campaign[]>(
      `/campaigns/apply-to-product/${productId}${query ? `?${query}` : ""}`
    );
  }

  async createCampaign(campaign: Partial<Campaign>) {
    return this.request<Campaign>("/campaigns", {
      method: "POST",
      body: JSON.stringify(campaign),
    });
  }

  async updateCampaign(id: string, campaign: Partial<Campaign>) {
    return this.request<Campaign>(`/campaigns/${id}`, {
      method: "PUT",
      body: JSON.stringify(campaign),
    });
  }

  async deleteCampaign(id: string) {
    return this.request(`/campaigns/${id}`, {
      method: "DELETE",
    });
  }

  // Cart campaign endpoints
  async applyCampaignsToCart() {
    return this.request<{
      items: Array<{
        id: string;
        product_id: string;
        quantity: number;
        originalPrice: number;
        discountedPrice: number;
        discount: number;
        itemTotal: number;
        itemDiscount: number;
        campaign?: {
          id: string;
          name: string;
          label?: string;
          description?: string;
          discountType: string;
          discountValue: number;
        };
      }>;
      subtotal: number;
      totalDiscount: number;
      freeShipping: boolean;
      appliedCampaigns: Array<{
        id: string;
        name: string;
        label?: string;
        type?: string;
        discount?: number;
      }>;
      finalTotal: number;
    }>("/cart/apply-campaigns", {
      method: "POST",
    });
  }

  // Checkout campaign endpoints
  async validateCampaigns() {
    return this.request<{
      success: boolean;
      valid: boolean;
      errors: string[];
      validationResults: Array<{
        campaignId: string;
        campaignName: string;
        productId: string;
        valid: boolean;
        error?: string;
      }>;
      discounts: {
        subtotal: number;
        totalDiscount: number;
        freeShipping: boolean;
        appliedCampaigns: Array<{
          id: string;
          name: string;
          label?: string;
        }>;
        finalTotal: number;
      };
    }>("/checkout/validate-campaigns", {
      method: "POST",
    });
  }

  // Dashboard endpoints
  async getDashboardStats() {
    return this.request<{
      totalSales: number;
      totalOrders: number;
      totalProducts: number;
      totalCustomers: number;
      salesChange: number;
      ordersChange: number;
      productsChange: number;
      customersChange: number;
    }>("/admin/dashboard/stats");
  }

  async getRecentOrders(limit: number = 5) {
    return this.request<
      Array<{
        id: string;
        orderNumber: string;
        customer: string;
        amount: number;
        status: string;
        paymentStatus: string;
        createdAt: string;
      }>
    >(`/admin/dashboard/recent-orders?limit=${limit}`);
  }

  // Image upload
  async uploadImage(file: File) {
    const formData = new FormData();
    formData.append("image", file);
    const token = this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/images/upload`, {
      method: "POST",
      headers,
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) return { error: data.message || "Upload failed" };
    return { data };
  }

  // Banner endpoints
  async getBanners(params?: {
    position?: string;
    is_active?: boolean;
    active_only?: boolean;
    link_type?: string;
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.position) query.append("position", params.position);
    if (params?.is_active !== undefined)
      query.append("is_active", params.is_active.toString());
    if (params?.active_only) query.append("active_only", "true");
    if (params?.link_type) query.append("link_type", params.link_type);
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.offset) query.append("offset", params.offset.toString());
    return this.request<Banner[]>(`/banners?${query.toString()}`);
  }

  async getBanner(id: string) {
    return this.request<Banner>(`/banners/${id}`);
  }

  async createBanner(banner: Partial<Banner>, imageFile?: File) {
    const formData = new FormData();
    if (imageFile) {
      formData.append("image", imageFile);
    }
    if (banner.title || banner.name)
      formData.append("title", banner.title || banner.name || "");
    if (banner.description) formData.append("description", banner.description);
    if (banner.title_color) formData.append("title_color", banner.title_color);
    if (banner.title_font_size)
      formData.append("title_font_size", banner.title_font_size);
    if (banner.title_position)
      formData.append("title_position", banner.title_position);
    if (banner.title_vertical_position)
      formData.append(
        "title_vertical_position",
        banner.title_vertical_position
      );
    if (banner.description_color)
      formData.append("description_color", banner.description_color);
    if (banner.description_font_size)
      formData.append("description_font_size", banner.description_font_size);
    if (banner.description_position)
      formData.append("description_position", banner.description_position);
    if (banner.description_vertical_position)
      formData.append(
        "description_vertical_position",
        banner.description_vertical_position
      );
    if (banner.image_url) formData.append("image_url", banner.image_url);
    if (banner.page_url || banner.link_url)
      formData.append("page_url", banner.page_url || banner.link_url || "");
    if (banner.display_text !== undefined)
      formData.append("display_text", banner.display_text || "");
    if (banner.status) formData.append("status", banner.status);
    // Legacy fields for backward compatibility
    if (banner.is_active !== undefined)
      formData.append("is_active", banner.is_active.toString());

    const token = this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/banners`, {
      method: "POST",
      headers,
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) return { error: data.message || "Create failed" };
    return { data };
  }

  async updateBanner(id: string, banner: Partial<Banner>, imageFile?: File) {
    const formData = new FormData();
    if (imageFile) {
      formData.append("image", imageFile);
    }
    if (banner.title || banner.name)
      formData.append("title", banner.title || banner.name || "");
    if (banner.description !== undefined)
      formData.append("description", banner.description || "");
    if (banner.title_color) formData.append("title_color", banner.title_color);
    if (banner.title_font_size)
      formData.append("title_font_size", banner.title_font_size);
    if (banner.title_position)
      formData.append("title_position", banner.title_position);
    if (banner.title_vertical_position)
      formData.append(
        "title_vertical_position",
        banner.title_vertical_position
      );
    if (banner.description_color)
      formData.append("description_color", banner.description_color);
    if (banner.description_font_size)
      formData.append("description_font_size", banner.description_font_size);
    if (banner.description_position)
      formData.append("description_position", banner.description_position);
    if (banner.description_vertical_position)
      formData.append(
        "description_vertical_position",
        banner.description_vertical_position
      );
    if (banner.image_url) formData.append("image_url", banner.image_url);
    if (banner.page_url || banner.link_url)
      formData.append("page_url", banner.page_url || banner.link_url || "");
    if (banner.display_text !== undefined)
      formData.append("display_text", banner.display_text || "");
    if (banner.status) formData.append("status", banner.status);
    // Legacy fields for backward compatibility
    if (banner.is_active !== undefined)
      formData.append("is_active", banner.is_active.toString());

    const token = this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/banners/${id}`, {
      method: "PUT",
      headers,
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) return { error: data.message || "Update failed" };
    return { data };
  }

  async deleteBanner(id: string) {
    return this.request<void>(`/banners/${id}`, {
      method: "DELETE",
    });
  }

  async getActiveBanners() {
    return this.request<Banner[]>(`/banners/active`);
  }

  // Favorites endpoints
  async addFavorite(productId: string) {
    return this.request<{ id: string; user_id: string; product_id: string }>(
      "/favorites",
      {
        method: "POST",
        body: JSON.stringify({ product_id: productId }),
      }
    );
  }

  async removeFavorite(productId: string) {
    return this.request<void>(`/favorites/${productId}`, {
      method: "DELETE",
    });
  }

  async getFavorites() {
    return this.request<
      Array<{
        id: string;
        user_id: string;
        product_id: string;
        name: string;
        sku: string;
        price: number;
        main_image_url: string;
        status: string;
        createdAt: string;
      }>
    >("/favorites", {
      method: "GET",
    });
  }

  async checkFavorite(productId: string) {
    return this.request<{ is_favorited: boolean }>(
      `/favorites/check/${productId}`,
      {
        method: "GET",
      }
    );
  }

  async getFavoriteStatus(productIds: string[]) {
    const query = new URLSearchParams();
    query.append("product_ids", productIds.join(","));
    return this.request<string[]>(`/favorites/status?${query.toString()}`, {
      method: "GET",
    });
  }

  async getProductFavoriteCount(productId: string) {
    return this.request<{ count: number }>(`/favorites/count/${productId}`, {
      method: "GET",
    });
  }

  // User management endpoints
  async getUsers(params?: {
    search?: string;
    role?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.role) query.append("role", params.role);
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.offset) query.append("offset", params.offset.toString());
    if (params?.sortBy) query.append("sortBy", params.sortBy);
    if (params?.sortOrder) query.append("sortOrder", params.sortOrder);
    return this.request<{
      users: Array<{
        id: string;
        username: string;
        email: string;
        role: string;
        orders: number;
        status: string;
        createdAt: string;
        updatedAt: string;
      }>;
      total: number;
      limit: number;
      offset: number;
    }>(`/users?${query.toString()}`);
  }

  async getUser(id: string) {
    return this.request<{
      id: string;
      username: string;
      email: string;
      role: string;
      orders: number;
      status: string;
      createdAt: string;
      updatedAt: string;
    }>(`/users/${id}`);
  }

  async updateUser(
    id: string,
    userData: {
      username?: string;
      email?: string;
      role?: string;
    }
  ) {
    return this.request<{
      message: string;
      user: {
        id: string;
        username: string;
        email: string;
        role: string;
        createdAt: string;
        updatedAt: string;
      };
    }>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string) {
    return this.request<{ message: string }>(`/users/${id}`, {
      method: "DELETE",
    });
  }

  async getUserStats() {
    return this.request<{
      total: number;
      active: number;
      admins: number;
      orderCounts: Array<{
        id: string;
        username: string;
        email: string;
        order_count: number;
      }>;
    }>("/users/stats");
  }

  // Cart endpoints
  async addToCart(productId: string, quantity: number = 1) {
    return this.request<{
      id: string;
      user_id: string;
      product_id: string;
      quantity: number;
    }>("/cart", {
      method: "POST",
      body: JSON.stringify({ product_id: productId, quantity }),
    });
  }

  async removeFromCart(productId: string) {
    return this.request<void>(`/cart/${productId}`, {
      method: "DELETE",
    });
  }

  async updateCartQuantity(productId: string, quantity: number) {
    return this.request<{
      user_id: string;
      product_id: string;
      quantity: number;
    }>(`/cart/${productId}`, {
      method: "PUT",
      body: JSON.stringify({ quantity }),
    });
  }

  async getCart() {
    return this.request<
      Array<{
        id: string;
        user_id: string;
        product_id: string;
        quantity: number;
        name: string;
        sku: string;
        price: number;
        main_image_url: string;
        status: string;
        stock_quantity: number;
        createdAt: string;
        updatedAt: string;
      }>
    >("/cart", {
      method: "GET",
    });
  }

  async getCartCount() {
    return this.request<{
      itemCount: number;
      totalQuantity: number;
    }>("/cart/count", {
      method: "GET",
    });
  }

  async clearCart() {
    return this.request<void>("/cart", {
      method: "DELETE",
    });
  }

  // Shipping address endpoints
  async getShippingAddresses() {
    return this.request<
      Array<{
        id: string;
        user_id: string;
        name: string;
        postal_code: string;
        prefecture: string;
        city: string;
        address_line1: string;
        address_line2?: string;
        phone: string;
        is_default: boolean;
        createdAt: string;
        updatedAt: string;
      }>
    >("/shipping-addresses");
  }

  async getShippingAddress(id: string) {
    return this.request<{
      id: string;
      user_id: string;
      name: string;
      postal_code: string;
      prefecture: string;
      city: string;
      address_line1: string;
      address_line2?: string;
      phone: string;
      is_default: boolean;
      createdAt: string;
      updatedAt: string;
    }>(`/shipping-addresses/${id}`);
  }

  async createShippingAddress(data: {
    name: string;
    postal_code: string;
    prefecture: string;
    city: string;
    address_line1: string;
    address_line2?: string;
    phone: string;
    is_default?: boolean;
  }) {
    return this.request<{ id: string }>("/shipping-addresses", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateShippingAddress(
    id: string,
    data: {
      name?: string;
      postal_code?: string;
      prefecture?: string;
      city?: string;
      address_line1?: string;
      address_line2?: string;
      phone?: string;
      is_default?: boolean;
    }
  ) {
    return this.request<{ id: string }>(`/shipping-addresses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteShippingAddress(id: string) {
    return this.request<{ id: string }>(`/shipping-addresses/${id}`, {
      method: "DELETE",
    });
  }

  async setDefaultShippingAddress(id: string) {
    return this.request<{ id: string }>(
      `/shipping-addresses/${id}/set-default`,
      {
        method: "POST",
      }
    );
  }

  async calculateShipping(prefecture: string, cartTotal: number) {
    return this.request<{ shipping_cost: number }>(
      "/shipping-addresses/calculate-shipping",
      {
        method: "POST",
        body: JSON.stringify({ prefecture, cart_total: cartTotal }),
      }
    );
  }

  // Checkout endpoints
  async createCheckoutSession(shippingAddressId: string) {
    return this.request<{ session_id: string; url: string }>(
      "/checkout/create-session",
      {
        method: "POST",
        body: JSON.stringify({ shipping_address_id: shippingAddressId }),
      }
    );
  }

  async verifyPaymentAndCreateOrder(sessionId: string) {
    return this.request<{ order_id: string; order_number: string }>(
      `/checkout/verify-payment?session_id=${sessionId}`
    );
  }

  // Enhanced order endpoints
  async cancelOrder(orderId: string) {
    return this.request<{ id: string; status: string }>(
      `/orders/${orderId}/cancel`,
      {
        method: "POST",
      }
    );
  }

  // Profile endpoints
  async getUserProfile() {
    return this.request<UserProfile>("/profile");
  }

  async updateUserProfile(data: Partial<UserProfile>) {
    return this.request<UserProfile>("/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    return this.request<{ success: boolean; message: string }>(
      "/profile/change-password",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async getNotificationSettings() {
    return this.request<NotificationSettings>("/profile/notifications");
  }

  async updateNotificationSettings(data: Partial<NotificationSettings>) {
    return this.request<NotificationSettings>("/profile/notifications", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async getPurchaseHistory(limit = 50, offset = 0) {
    return this.request<{
      orders: Order[];
      total: number;
      limit: number;
      offset: number;
    }>(`/profile/purchase-history?limit=${limit}&offset=${offset}`);
  }

  // Review endpoints
  async createReview(data: {
    productId: string;
    orderId: string;
    rating: number;
    title?: string;
    comment?: string;
  }) {
    return this.request<Review>("/reviews", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getProductReviews(
    productId: string,
    status = "approved",
    limit = 50,
    offset = 0
  ) {
    return this.request<{ reviews: Review[]; total: number }>(
      `/reviews/product/${productId}?status=${status}&limit=${limit}&offset=${offset}`
    );
  }

  async getUserReviews(limit = 50, offset = 0) {
    return this.request<{ reviews: Review[]; total: number }>(
      `/reviews/user?limit=${limit}&offset=${offset}`
    );
  }

  async getReviewableProducts() {
    return this.request<Product[]>("/reviews/reviewable");
  }

  async updateReview(reviewId: string, data: Partial<Review>) {
    return this.request<Review>(`/reviews/${reviewId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteReview(reviewId: string) {
    return this.request<{ success: boolean; message: string }>(
      `/reviews/${reviewId}`,
      {
        method: "DELETE",
      }
    );
  }

  // Admin review endpoints
  async getAllReviews(
    filters: { status?: string; product_id?: string } = {},
    limit = 50,
    offset = 0
  ) {
    const queryParams = new URLSearchParams({
      ...filters,
      limit: limit.toString(),
      offset: offset.toString(),
    });
    return this.request<{ reviews: Review[]; total: number }>(
      `/reviews/admin/all?${queryParams.toString()}`
    );
  }

  async moderateReview(reviewId: string, status: string) {
    return this.request<Review>(`/reviews/${reviewId}/moderate`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  }

  async addAdminReplyToReview(reviewId: string, reply: string) {
    return this.request<Review>(`/reviews/${reviewId}/reply`, {
      method: "POST",
      body: JSON.stringify({ reply }),
    });
  }

  // Stock management endpoints
  async getStockHistory(productId: string, limit = 50, offset = 0) {
    return this.request<{ history: StockHistory[]; total: number }>(
      `/stock/history/${productId}?limit=${limit}&offset=${offset}`
    );
  }

  async getAllStockHistory(
    filters: { product_id?: string; change_type?: string } = {},
    limit = 100,
    offset = 0
  ) {
    const queryParams = new URLSearchParams({
      ...filters,
      limit: limit.toString(),
      offset: offset.toString(),
    });
    return this.request<{ history: StockHistory[]; total: number }>(
      `/stock/history?${queryParams.toString()}`
    );
  }

  async getLowStockProducts() {
    return this.request<Product[]>("/stock/low-stock");
  }

  async updateProductStock(productId: string, data: StockUpdate) {
    return this.request<StockHistory>(`/stock/${productId}/update`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async bulkUpdateStock(updates: StockUpdate[]) {
    return this.request<{
      success: number;
      failed: number;
      results: BulkStockUpdateResult[];
      errors: BulkStockUpdateResult[];
    }>("/stock/bulk-update", {
      method: "POST",
      body: JSON.stringify({ updates }),
    });
  }

  // Shipping tracking endpoints
  async addShippingTracking(
    orderId: string,
    trackingData: {
      tracking_number: string;
      carrier: string;
      carrier_url?: string;
      status?: string;
      shipped_at?: string;
    }
  ) {
    return this.request<{ id: string }>(`/orders/${orderId}/tracking`, {
      method: "POST",
      body: JSON.stringify(trackingData),
    });
  }

  async updateShippingTracking(
    trackingId: string,
    trackingData: {
      tracking_number?: string;
      carrier?: string;
      carrier_url?: string;
      status?: string;
      delivered_at?: string;
    }
  ) {
    return this.request<{ id: string }>(`/orders/tracking/${trackingId}`, {
      method: "PUT",
      body: JSON.stringify(trackingData),
    });
  }
}

export const apiService = new ApiService();
