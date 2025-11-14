// API service for backend communication
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8888/api";

interface ApiResponse<T> {
  data?: T;
  error?: string;
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

interface Order {
  id: string;
  order_number: string;
  customer_email?: string;
  total_amount: number;
  status: string;
  createdAt: string;
  [key: string]: unknown;
}

interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  [key: string]: unknown;
}

interface ShippingTracking {
  tracking_number: string;
  carrier: string;
  carrier_url?: string;
  status?: string;
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

      // Handle backend response structure: { success: true, data: ..., total: ... } or direct data
      if (data && typeof data === "object" && "success" in data && "data" in data) {
        // Preserve metadata like total, count, etc.
        const response: ApiResponse<T> & { total?: number; count?: number } = { data: data.data };
        if ("total" in data) {
          (response as any).total = data.total;
        }
        if ("count" in data) {
          (response as any).count = data.count;
        }
        return response;
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
  }) {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.status) query.append("status", params.status);
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.offset) query.append("offset", params.offset.toString());
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
  async getOrders(params?: { status?: string; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
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

  async addShippingTracking(id: string, tracking: ShippingTracking) {
    return this.request<{ id: string }>(`/orders/${id}/tracking`, {
      method: "POST",
      body: JSON.stringify(tracking),
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
  async getCampaigns() {
    return this.request<Campaign[]>("/campaigns");
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
    if (banner.title || banner.name) formData.append("title", banner.title || banner.name || "");
    if (banner.description) formData.append("description", banner.description);
    if (banner.title_color) formData.append("title_color", banner.title_color);
    if (banner.title_font_size) formData.append("title_font_size", banner.title_font_size);
    if (banner.title_position) formData.append("title_position", banner.title_position);
    if (banner.title_vertical_position) formData.append("title_vertical_position", banner.title_vertical_position);
    if (banner.description_color)
      formData.append("description_color", banner.description_color);
    if (banner.description_font_size) formData.append("description_font_size", banner.description_font_size);
    if (banner.description_position) formData.append("description_position", banner.description_position);
    if (banner.description_vertical_position) formData.append("description_vertical_position", banner.description_vertical_position);
    if (banner.image_url) formData.append("image_url", banner.image_url);
    if (banner.page_url || banner.link_url) formData.append("page_url", banner.page_url || banner.link_url || "");
    if (banner.display_text !== undefined) formData.append("display_text", banner.display_text || "");
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
    if (banner.title || banner.name) formData.append("title", banner.title || banner.name || "");
    if (banner.description !== undefined)
      formData.append("description", banner.description || "");
    if (banner.title_color) formData.append("title_color", banner.title_color);
    if (banner.title_font_size) formData.append("title_font_size", banner.title_font_size);
    if (banner.title_position) formData.append("title_position", banner.title_position);
    if (banner.title_vertical_position) formData.append("title_vertical_position", banner.title_vertical_position);
    if (banner.description_color)
      formData.append("description_color", banner.description_color);
    if (banner.description_font_size) formData.append("description_font_size", banner.description_font_size);
    if (banner.description_position) formData.append("description_position", banner.description_position);
    if (banner.description_vertical_position) formData.append("description_vertical_position", banner.description_vertical_position);
    if (banner.image_url) formData.append("image_url", banner.image_url);
    if (banner.page_url || banner.link_url) formData.append("page_url", banner.page_url || banner.link_url || "");
    if (banner.display_text !== undefined) formData.append("display_text", banner.display_text || "");
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

  async updateUser(id: string, userData: {
    username?: string;
    email?: string;
    role?: string;
  }) {
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

  // Checkout endpoints
  async createCheckoutSession() {
    return this.request<{
      sessionId: string;
      url: string;
    }>("/checkout/create-session", {
      method: "POST",
    });
  }
}

export const apiService = new ApiService();
