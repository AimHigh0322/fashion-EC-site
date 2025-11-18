import "./App.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { FavoritesProvider } from "./contexts/FavoritesContext";
import { CartProvider } from "./contexts/CartContext";
import { ToastProvider } from "./contexts/ToastContext";
import { CategoryProvider } from "./contexts/CategoryContext";
import { Login } from "./app/user/auth/Login";
import { Register } from "./app/user/auth/Register";
import { Dashboard } from "./app/admin/Dashboard";
import { Products } from "./app/admin/Products";
import { Orders as AdminOrders } from "./app/admin/Orders";
import { Users } from "./app/admin/Users";
import { Categories } from "./app/admin/Categories";
import { Settings } from "./app/admin/Settings";
import { ProductDetail as AdminProductDetail } from "./app/admin/ProductDetail";
import { Banners } from "./app/admin/Banners";
import { BannerCreate } from "./app/admin/BannerCreate";
import { BannerEdit } from "./app/admin/BannerEdit";
import { HomePage } from "./app/home/HomePage";
import { Cart } from "./app/user/Cart";
import { Favorites } from "./app/user/Favorites";
import { ProductDetail } from "./app/user/ProductDetail";
import { Checkout } from "./app/user/Checkout";
import { CheckoutSuccess } from "./app/user/CheckoutSuccess";
import { Orders as UserOrders } from "./app/user/Orders";
import { OrderDetail } from "./app/user/OrderDetail";
import { ShippingAddresses } from "./app/user/ShippingAddresses";
import { Profile } from "./app/user/Profile";
import { StockAlerts } from "./app/admin/StockAlerts";
import { Reviews as AdminReviews } from "./app/admin/Reviews";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AuthPages = () => {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <>
      {showRegister ? (
        <Register onSwitchToLogin={() => setShowRegister(false)} />
      ) : (
        <Login onSwitchToRegister={() => setShowRegister(true)} />
      )}
    </>
  );
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CategoryProvider>
          <FavoritesProvider>
            <CartProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<AuthPages />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <HomePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/cart"
                    element={
                      <ProtectedRoute>
                        <Cart />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/favorites"
                    element={
                      <ProtectedRoute>
                        <Favorites />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/product/:id"
                    element={
                      <ProtectedRoute>
                        <ProductDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/checkout"
                    element={
                      <ProtectedRoute>
                        <Checkout />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/checkout/success"
                    element={
                      <ProtectedRoute>
                        <CheckoutSuccess />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/orders"
                    element={
                      <ProtectedRoute>
                        <UserOrders />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/orders/:id"
                    element={
                      <ProtectedRoute>
                        <OrderDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/shipping-addresses"
                    element={
                      <ProtectedRoute>
                        <ShippingAddresses />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/shipping-addresses/new"
                    element={
                      <ProtectedRoute>
                        <ShippingAddresses />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route
                    path="/admin"
                    element={
                      <AdminRoute>
                        <Dashboard />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/products"
                    element={
                      <AdminRoute>
                        <Products />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/products/:id"
                    element={
                      <AdminRoute>
                        <AdminProductDetail />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/orders"
                    element={
                      <AdminRoute>
                        <AdminOrders />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/stock-alerts"
                    element={
                      <AdminRoute>
                        <StockAlerts />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/reviews"
                    element={
                      <AdminRoute>
                        <AdminReviews />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <AdminRoute>
                        <Users />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/categories"
                    element={
                      <AdminRoute>
                        <Categories />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/settings"
                    element={
                      <AdminRoute>
                        <Settings />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/banners"
                    element={
                      <AdminRoute>
                        <Banners />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/banners/create"
                    element={
                      <AdminRoute>
                        <BannerCreate />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/banners/edit/:id"
                    element={
                      <AdminRoute>
                        <BannerEdit />
                      </AdminRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </CartProvider>
          </FavoritesProvider>
        </CategoryProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
