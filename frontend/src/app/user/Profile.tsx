import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Edit2,
  Save,
  X,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { apiService } from "../../services/api";
import { UserLayout } from "../../components/layouts/UserLayout";
import { Breadcrumbs } from "../../components/molecules/Breadcrumbs";

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

interface ProfileData {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  postal_code?: string;
  prefecture?: string;
  city?: string;
  street_address?: string;
  apartment?: string;
}

export const Profile = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { success, error } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    postal_code: "",
    prefecture: "",
    city: "",
    street_address: "",
    apartment: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUserProfile();
      if (response.error) {
        error(response.error);
      } else if (response.data) {
        const profileData = response.data as ProfileData;
        setProfile(profileData);
        setFormData({
          first_name: profileData.first_name || "",
          last_name: profileData.last_name || "",
          email: profileData.email || "",
          phone: profileData.phone || "",
          postal_code: profileData.postal_code || "",
          prefecture: profileData.prefecture || "",
          city: profileData.city || "",
          street_address: profileData.street_address || "",
          apartment: profileData.apartment || "",
        });
      }
    } catch {
      error("プロフィールの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        postal_code: profile.postal_code || "",
        prefecture: profile.prefecture || "",
        city: profile.city || "",
        street_address: profile.street_address || "",
        apartment: profile.apartment || "",
      });
    }
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await apiService.updateUserProfile(formData);
      if (response.error) {
        error(response.error);
      } else {
        success("プロフィールを更新しました");
        await loadProfile();
        setIsEditing(false);
      }
    } catch {
      error("プロフィールの更新に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      error("新しいパスワードが一致しません");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      error("新しいパスワードは8文字以上である必要があります");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await apiService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      if (response.error) {
        error(response.error);
      } else {
        success("パスワードを変更しました");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setIsChangingPassword(false);
      }
    } catch {
      error("パスワードの変更に失敗しました");
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <UserLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-600">読み込み中...</div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="min-h-screen bg-gray-50 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { label: "ホーム", path: "/" },
              { label: "マイページ", path: "/profile" },
            ]}
          />

          <div className="bg-white  shadow-md overflow-hidden">
            {/* Header */}
            <div className="bg-[#e2603f] px-6 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-[#e2603f]" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      {profile?.first_name || profile?.last_name
                        ? `${profile.last_name || ""} ${
                            profile.first_name || ""
                          }`.trim()
                        : profile?.username || "ユーザー"}
                    </h1>
                    <p className="text-white/80 text-sm mt-1">
                      {profile?.email}
                    </p>
                  </div>
                </div>
                {!isEditing && (
                  <button
                    onClick={handleEdit}
                    className="flex items-center space-x-2 bg-white text-[#e2603f] px-4 py-2  hover:bg-gray-100 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>編集</span>
                  </button>
                )}
              </div>
            </div>

            {/* Profile Form */}
            <div className="p-6">
              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        姓
                      </label>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            last_name: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent"
                        placeholder="姓"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        名
                      </label>
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            first_name: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent"
                        placeholder="名"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      メールアドレス
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300  focus:ring-2 focus:ring-[#e2603f] focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-2" />
                      電話番号
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300  focus:ring-2 focus:ring-[#e2603f] focus:border-transparent"
                      placeholder="090-1234-5678"
                    />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <MapPin className="w-4 h-4 inline mr-2" />
                        郵便番号
                      </label>
                      <input
                        type="text"
                        value={formData.postal_code}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            postal_code: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent"
                        placeholder="123-4567"
                        maxLength={10}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        都道府県
                      </label>
                      <select
                        value={formData.prefecture}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            prefecture: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent"
                      >
                        <option value="">選択してください</option>
                        {PREFECTURES.map((pref) => (
                          <option key={pref} value={pref}>
                            {pref}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        市区町村
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) =>
                          setFormData({ ...formData, city: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent"
                        placeholder="市区町村を入力してください"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        番地・建物名
                      </label>
                      <input
                        type="text"
                        value={formData.street_address}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            street_address: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent"
                        placeholder="番地・建物名を入力してください"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        マンション名・部屋番号
                      </label>
                      <input
                        type="text"
                        value={formData.apartment}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            apartment: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent"
                        placeholder="マンション名・部屋番号（任意）"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center space-x-2 bg-[#e2603f] text-white px-6 py-2  hover:bg-[#c95a42] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      <span>{submitting ? "保存中..." : "保存"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex items-center space-x-2 bg-gray-200 text-gray-700 px-6 py-2  hover:bg-gray-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>キャンセル</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">
                        姓
                      </label>
                      <p className="text-gray-900">
                        {profile?.last_name || "未設定"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">
                        名
                      </label>
                      <p className="text-gray-900">
                        {profile?.first_name || "未設定"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      メールアドレス
                    </label>
                    <p className="text-gray-900">
                      {profile?.email || "未設定"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      <Phone className="w-4 h-4 inline mr-2" />
                      電話番号
                    </label>
                    <p className="text-gray-900">
                      {profile?.phone || "未設定"}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">
                        <MapPin className="w-4 h-4 inline mr-2" />
                        郵便番号
                      </label>
                      <p className="text-gray-900">
                        {profile?.postal_code || "未設定"}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">
                        都道府県
                      </label>
                      <p className="text-gray-900">
                        {profile?.prefecture || "未設定"}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">
                        市区町村
                      </label>
                      <p className="text-gray-900">
                        {profile?.city || "未設定"}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">
                        番地・建物名
                      </label>
                      <p className="text-gray-900">
                        {profile?.street_address || "未設定"}
                      </p>
                    </div>

                    {profile?.apartment && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">
                          マンション名・部屋番号
                        </label>
                        <p className="text-gray-900">{profile.apartment}</p>
                      </div>
                    )}

                    {!profile?.postal_code &&
                      !profile?.prefecture &&
                      !profile?.city &&
                      !profile?.street_address && (
                        <p className="text-gray-500">住所が未設定です</p>
                      )}
                  </div>
                </div>
              )}
            </div>

            {/* Password Change Section */}
            <div className="border-t border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Lock className="w-5 h-5 mr-2 text-[#e2603f]" />
                  パスワード変更
                </h2>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsChangingPassword(!isChangingPassword);
                    setPasswordData({
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: "",
                    });
                  }}
                  className="text-sm hover:underline text-[#e2603f] hover:text-[#c95a42] transition-colors cursor-pointer"
                >
                  {isChangingPassword ? "キャンセル" : "変更する"}
                </a>
              </div>

              {isChangingPassword && (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      現在のパスワード
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            currentPassword: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      新しいパスワード
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            newPassword: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent pr-10"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      8文字以上である必要があります
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      新しいパスワード（確認）
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            confirmPassword: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#e2603f] focus:border-transparent pr-10"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="bg-[#e2603f] text-white px-6 py-2  hover:bg-[#c95a42] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {changingPassword ? "変更中..." : "パスワードを変更"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};
