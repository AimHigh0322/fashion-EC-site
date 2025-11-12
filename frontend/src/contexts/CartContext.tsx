import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { apiService } from "../services/api";
import { useAuth } from "./AuthContext";

interface CartContextType {
  cartCount: number;
  totalQuantity: number;
  loading: boolean;
  refreshCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number) => Promise<boolean>;
  removeFromCart: (productId: string) => Promise<boolean>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider = ({ children }: CartProviderProps) => {
  const { isAuthenticated } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load cart count when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshCart();
    } else {
      // Clear cart when user logs out
      setCartCount(0);
      setTotalQuantity(0);
    }
  }, [isAuthenticated]);

  const refreshCart = async () => {
    if (!isAuthenticated) {
      setCartCount(0);
      setTotalQuantity(0);
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.getCartCount();
      if (response.data) {
        setCartCount(response.data.itemCount || 0);
        setTotalQuantity(response.data.totalQuantity || 0);
      }
    } catch (error) {
      console.error("Failed to load cart count:", error);
      setCartCount(0);
      setTotalQuantity(0);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId: string, quantity: number = 1): Promise<boolean> => {
    if (!isAuthenticated) {
      console.warn("User not authenticated, cannot add to cart");
      return false;
    }

    try {
      const response = await apiService.addToCart(productId, quantity);
      if (response.error) {
        console.error("Error adding to cart:", response.error);
        return false;
      }
      // Refresh cart count after adding
      await refreshCart();
      return true;
    } catch (error) {
      console.error("Failed to add to cart:", error);
      return false;
    }
  };

  const removeFromCart = async (productId: string): Promise<boolean> => {
    if (!isAuthenticated) {
      console.warn("User not authenticated, cannot remove from cart");
      return false;
    }

    try {
      const response = await apiService.removeFromCart(productId);
      if (response.error) {
        console.error("Error removing from cart:", response.error);
        return false;
      }
      // Refresh cart count after removing
      await refreshCart();
      return true;
    } catch (error) {
      console.error("Failed to remove from cart:", error);
      return false;
    }
  };

  const value: CartContextType = {
    cartCount,
    totalQuantity,
    loading,
    refreshCart,
    addToCart,
    removeFromCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

