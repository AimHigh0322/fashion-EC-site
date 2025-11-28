import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Star,
  Check,
  User,
  Phone,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { apiService } from "../../services/api";
import { UserLayout } from "../../components/layouts/UserLayout";
import { Breadcrumbs } from "../../components/molecules/Breadcrumbs";

interface ShippingAddress {
  id: string;
  name: string;
  postal_code: string;
  prefecture: string;
  city: string;
  address_line1: string;
  address_line2?: string;
  phone: string;
  is_default: boolean;
}

const PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
];

export const ShippingAddresses = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { success, error } = useToast();
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(
    null
  );
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    postal_code: "",
    prefecture: "",
    city: "",
    address_line1: "",
    address_line2: "",
    phone: "",
    is_default: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [useProfileAddress, setUseProfileAddress] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadAddresses();
    loadUserProfile();
  }, [isAuthenticated, navigate]);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const response = await apiService.getShippingAddresses();
      if (response.error) {
        error(response.error);
        setAddresses([]);
      } else if (response.data) {
        setAddresses(response.data);
      }
    } catch {
      error("配送先の読み込みに失敗しました");
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      setLoadingProfile(true);
      const response = await apiService.getUserProfile();
      if (response.data) {
        setUserProfile(response.data);
      }
    } catch {
      // Silently fail - profile will be loaded when needed
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleOpenModal = async (address?: ShippingAddress) => {
    if (address) {
      setEditingAddress(address);
      setUseProfileAddress(false);
      setFormData({
        name: address.name,
        postal_code: address.postal_code,
        prefecture: address.prefecture,
        city: address.city,
        address_line1: address.address_line1,
        address_line2: address.address_line2 || "",
        phone: address.phone,
        is_default: address.is_default,
      });
    } else {
      setEditingAddress(null);
      setUseProfileAddress(false);
      // Load profile if not already loaded
      let profile = userProfile;
      if (!profile) {
        try {
          setLoadingProfile(true);
          const response = await apiService.getUserProfile();
          profile = response.data;
          setUserProfile(profile);
        } catch (error) {
          console.error("Failed to load profile:", error);
        } finally {
          setLoadingProfile(false);
        }
      }

      // Set default values from profile
      const fullName = profile
        ? `${profile.last_name || ""} ${profile.first_name || ""}`.trim() ||
          "配送先"
        : "配送先";
      setFormData({
        name: fullName,
        postal_code: "",
        prefecture: "",
        city: "",
        address_line1: "",
        address_line2: "",
        phone: profile?.phone || "",
        is_default: false,
      });
    }
    setShowModal(true);
  };

  const handleUseProfileAddress = () => {
    if (userProfile) {
      setFormData({
        ...formData,
        postal_code: userProfile.postal_code || "",
        prefecture: userProfile.prefecture || "",
        city: userProfile.city || "",
        address_line1: userProfile.street_address || "",
        address_line2: userProfile.apartment || "",
      });
    } else {
      // If profile is not loaded, try to load it
      loadUserProfile().then(() => {
        if (userProfile) {
          setFormData({
            ...formData,
            postal_code: userProfile.postal_code || "",
            prefecture: userProfile.prefecture || "",
            city: userProfile.city || "",
            address_line1: userProfile.street_address || "",
            address_line2: userProfile.apartment || "",
          });
        }
      });
    }
  };

  const handleAddressOptionChange = (useProfile: boolean) => {
    setUseProfileAddress(useProfile);
    if (useProfile) {
      handleUseProfileAddress();
    } else {
      // Clear address fields when switching to manual entry
      setFormData({
        ...formData,
        postal_code: "",
        prefecture: "",
        city: "",
        address_line1: "",
        address_line2: "",
      });
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAddress(null);
    setUseProfileAddress(false);
    setFormData({
      name: "",
      postal_code: "",
      prefecture: "",
      city: "",
      address_line1: "",
      address_line2: "",
      phone: "",
      is_default: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Ensure profile is loaded
      let profile = userProfile;
      if (!profile) {
        try {
          setLoadingProfile(true);
          const response = await apiService.getUserProfile();
          profile = response.data;
          setUserProfile(profile);
        } catch (error) {
          console.error("Failed to load profile:", error);
        } finally {
          setLoadingProfile(false);
        }
      }

      // Use profile phone if not provided in form
      const submitData = {
        name: formData.name.trim(),
        postal_code: formData.postal_code.trim(),
        prefecture: formData.prefecture.trim(),
        city: formData.city.trim(),
        address_line1: formData.address_line1.trim(),
        address_line2: formData.address_line2?.trim() || "",
        phone: (formData.phone || profile?.phone || "").trim(),
        is_default: formData.is_default || false,
      };

      // Validate required fields
      if (!submitData.name) {
        error("配送先の名前を入力してください");
        setSubmitting(false);
        return;
      }
      if (!submitData.postal_code) {
        error("郵便番号を入力してください");
        setSubmitting(false);
        return;
      }
      if (!submitData.prefecture) {
        error("都道府県を選択してください");
        setSubmitting(false);
        return;
      }
      if (!submitData.city) {
        error("市区町村を入力してください");
        setSubmitting(false);
        return;
      }
      if (!submitData.address_line1) {
        error("番地・建物名を入力してください");
        setSubmitting(false);
        return;
      }
      if (!submitData.phone) {
        error(
          "電話番号がプロフィールに設定されていません。マイページで設定してください。"
        );
        setSubmitting(false);
        return;
      }

      let response;
      if (editingAddress) {
        response = await apiService.updateShippingAddress(
          editingAddress.id,
          submitData
        );
      } else {
        response = await apiService.createShippingAddress(submitData);
      }

      if (response.error) {
        error(response.error);
      } else {
        success(
          editingAddress ? "配送先を更新しました" : "配送先を追加しました"
        );
        handleCloseModal();
        await loadAddresses();
      }
    } catch {
      error(
        editingAddress
          ? "配送先の更新に失敗しました"
          : "配送先の追加に失敗しました"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!confirm("この配送先を削除しますか？")) {
      return;
    }

    setDeleting(addressId);
    try {
      const response = await apiService.deleteShippingAddress(addressId);
      if (response.error) {
        error(response.error);
      } else {
        success("配送先を削除しました");
        await loadAddresses();
      }
    } catch {
      error("配送先の削除に失敗しました");
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      const response = await apiService.setDefaultShippingAddress(addressId);
      if (response.error) {
        error(response.error);
      } else {
        success("デフォルト配送先を設定しました");
        await loadAddresses();
      }
    } catch {
      error("デフォルト配送先の設定に失敗しました");
    }
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">読み込み中...</p>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Breadcrumbs
              items={[
                { label: "商品一覧", path: "/" },
                { label: "配送先管理" },
              ]}
            />
            <div className="flex items-center justify-between mt-4">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <MapPin className="w-6 h-6 mr-2 text-[#e2603f] cursor-pointer" />
                配送先管理
              </h1>
              <button
                onClick={() => handleOpenModal()}
                className="flex items-center px-4 py-2 bg-[#e2603f] hover:bg-[#c95a42] text-white font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-2 cursor-pointer" />
                新しい配送先を追加
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {addresses.length === 0 ? (
            <div className="bg-white  shadow-sm p-12 text-center">
              <MapPin className="w-20 h-20 text-gray-300 mx-auto mb-4 cursor-pointer" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                配送先が登録されていません
              </h2>
              <p className="text-gray-600 mb-6">
                配送先を追加して、スムーズにお買い物をお楽しみください
              </p>
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center px-6 py-3 bg-[#e2603f] hover:bg-[#c95a42] text-white font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-5 h-5 mr-2 cursor-pointer" />
                配送先を追加
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className="bg-white  shadow-sm border-2 border-gray-200 hover:border-[#e2603f] transition-all p-6 relative"
                >
                  {address.is_default && (
                    <div className="absolute top-4 right-4">
                      <span className="flex items-center text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold cursor-pointer">
                        <Star className="w-3 h-3 mr-1 fill-current cursor-pointer" />
                        デフォルト
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {address.name}
                    </h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>〒{address.postal_code}</p>
                      <p>
                        {address.prefecture} {address.city}
                      </p>
                      <p>{address.address_line1}</p>
                      {address.address_line2 && <p>{address.address_line2}</p>}
                      <p className="pt-2">電話: {address.phone}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    {!address.is_default && (
                      <button
                        onClick={() => handleSetDefault(address.id)}
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded transition-colors cursor-pointer"
                        title="デフォルトに設定"
                      >
                        <Check className="w-4 h-4 mr-1 cursor-pointer" />
                        デフォルト
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenModal(address)}
                      className="flex-1 flex items-center justify-center px-3 py-2 bg-orange-50 hover:bg-orange-100 text-[#e2603f] text-sm font-medium rounded transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4 mr-1 cursor-pointer" />
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(address.id)}
                      disabled={deleting === address.id}
                      className="flex items-center justify-center px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {deleting === address.id ? (
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="w-4 h-4 cursor-pointer" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 rounded-lg">
          <div className="bg-white shadow-xl max-w-2xl w-full h-[700px] max-h-[80vh] flex flex-col rounded-lg">
            {/* Fixed Header */}
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingAddress ? "配送先を編集" : "新しい配送先を追加"}
              </h2>
            </div>
            {/* Scrollable Body */}
            <form
              onSubmit={handleSubmit}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {/* Profile Information Display */}
                  <div className="bg-gray-50  p-4 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      お客様情報（プロフィールから取得）
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2 cursor-pointer" />
                        <div>
                          <p className="text-xs text-gray-500">お名前</p>
                          <p className="text-sm font-medium text-gray-900">
                            {loadingProfile
                              ? "読み込み中..."
                              : userProfile
                              ? `${userProfile.last_name || ""} ${
                                  userProfile.first_name || ""
                                }`.trim() || "未設定"
                              : "未設定"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 text-gray-400 mr-2 cursor-pointer" />
                        <div>
                          <p className="text-xs text-gray-500">電話番号</p>
                          <p className="text-sm font-medium text-gray-900">
                            {loadingProfile
                              ? "読み込み中..."
                              : userProfile?.phone || "未設定"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address Label */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      配送先の名前{" "}
                      <span className="text-gray-500 text-xs">
                        (例: 自宅、会社など)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent"
                      placeholder="自宅"
                    />
                  </div>

                  {/* Address Source Selection - Only show when adding new address */}
                  {!editingAddress && (
                    <div className="bg-blue-50 border border-blue-200  p-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        住所の選択
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="addressSource"
                            checked={useProfileAddress}
                            onChange={() => handleAddressOptionChange(true)}
                            className="w-4 h-4 text-[#e2603f] border-gray-300 focus:ring-[#e2603f]"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            ご自宅住所（プロフィールに登録されている住所）を使用
                          </span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="addressSource"
                            checked={!useProfileAddress}
                            onChange={() => handleAddressOptionChange(false)}
                            className="w-4 h-4 text-[#e2603f] border-gray-300 focus:ring-[#e2603f]"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            別の住所を入力
                          </span>
                        </label>
                      </div>
                      {useProfileAddress && (
                        <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                          <p className="text-xs text-gray-600 mb-1">
                            プロフィール住所:
                          </p>
                          <p className="text-sm text-gray-900">
                            {userProfile?.postal_code &&
                              `〒${userProfile.postal_code} `}
                            {userProfile?.prefecture &&
                              `${userProfile.prefecture} `}
                            {userProfile?.city && `${userProfile.city} `}
                            {userProfile?.street_address &&
                              `${userProfile.street_address} `}
                            {userProfile?.apartment && userProfile.apartment}
                            {!userProfile?.postal_code &&
                              !userProfile?.prefecture &&
                              !userProfile?.city &&
                              !userProfile?.street_address && (
                                <span className="text-red-500">
                                  プロフィールに住所が登録されていません
                                </span>
                              )}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        郵便番号 <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.postal_code}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            postal_code: e.target.value,
                          })
                        }
                        disabled={useProfileAddress && !editingAddress}
                        className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="123-4567"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        都道府県 <span className="text-red-600">*</span>
                      </label>
                      <select
                        required
                        value={formData.prefecture}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            prefecture: e.target.value,
                          })
                        }
                        disabled={useProfileAddress && !editingAddress}
                        className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">選択してください</option>
                        {PREFECTURES.map((pref) => (
                          <option key={pref} value={pref}>
                            {pref}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      市区町村 <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      disabled={useProfileAddress && !editingAddress}
                      className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="渋谷区"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      番地・建物名 <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address_line1}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address_line1: e.target.value,
                        })
                      }
                      disabled={useProfileAddress && !editingAddress}
                      className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="渋谷1-2-3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      マンション名・部屋番号
                    </label>
                    <input
                      type="text"
                      value={formData.address_line2}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address_line2: e.target.value,
                        })
                      }
                      disabled={useProfileAddress && !editingAddress}
                      className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="渋谷マンション101号室"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_default"
                      checked={formData.is_default}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_default: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-[#e2603f] border-gray-300 rounded focus:ring-[#e2603f]"
                    />
                    <label
                      htmlFor="is_default"
                      className="ml-2 block text-sm text-gray-700"
                    >
                      デフォルトの配送先に設定する
                    </label>
                  </div>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="flex gap-3 p-6 border-t border-gray-200 flex-shrink-0 bg-white rounded-b-lg">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-[#e2603f] hover:bg-[#c95a42] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium transition-colors cursor-pointer"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      保存中...
                    </div>
                  ) : editingAddress ? (
                    "更新"
                  ) : (
                    "追加"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </UserLayout>
  );
};
