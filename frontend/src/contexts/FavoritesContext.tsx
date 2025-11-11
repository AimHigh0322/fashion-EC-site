import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { apiService } from "../services/api";
import { useAuth } from "./AuthContext";

interface FavoritesContextType {
  favorites: Set<string>;
  loading: boolean;
  toggleFavorite: (productId: string) => Promise<boolean>;
  isFavorited: (productId: string) => boolean;
  loadFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(
  undefined
);

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
};

interface FavoritesProviderProps {
  children: ReactNode;
}

export const FavoritesProvider = ({ children }: FavoritesProviderProps) => {
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Load favorites when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadFavorites();
    } else {
      // Clear favorites when user logs out
      setFavorites(new Set());
    }
  }, [isAuthenticated]);

  const loadFavorites = async () => {
    if (!isAuthenticated) {
      setFavorites(new Set());
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.getFavorites();
      if (response.data) {
        const favoriteIds = new Set(
          response.data.map((fav: { product_id: string }) => fav.product_id)
        );
        setFavorites(favoriteIds);
      }
    } catch (error) {
      console.error("Failed to load favorites:", error);
      setFavorites(new Set());
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (productId: string): Promise<boolean> => {
    if (!isAuthenticated) {
      console.warn("User not authenticated, cannot toggle favorite");
      return false;
    }

    const isFav = favorites.has(productId);
    const newFavorites = new Set(favorites);

    try {
      if (isFav) {
        // Optimistic update: remove from favorites
        newFavorites.delete(productId);
        setFavorites(newFavorites);

        const response = await apiService.removeFavorite(productId);
        console.log("Remove favorite response:", response);
        if (response.error) {
          console.error("Error removing favorite:", response.error);
          // Revert on error
          setFavorites(favorites);
          return false;
        }
        return true;
      } else {
        // Optimistic update: add to favorites
        newFavorites.add(productId);
        setFavorites(newFavorites);

        const response = await apiService.addFavorite(productId);
        console.log("Add favorite response:", response);
        if (response.error) {
          console.error("Error adding favorite:", response.error);
          // Revert on error
          setFavorites(favorites);
          return false;
        }
        return true;
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      // Revert on error
      setFavorites(favorites);
      return false;
    }
  };

  const isFavorited = (productId: string): boolean => {
    return favorites.has(productId);
  };

  const value: FavoritesContextType = {
    favorites,
    loading,
    toggleFavorite,
    isFavorited,
    loadFavorites,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

