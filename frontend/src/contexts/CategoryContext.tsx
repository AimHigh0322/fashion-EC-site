import { createContext, useContext, useState, type ReactNode } from "react";

interface CategoryContextType {
  selectedCategoryId: string | null;
  setSelectedCategoryId: (categoryId: string | null) => void;
  selectedCategoryName: string | null;
  setSelectedCategoryName: (categoryName: string | null) => void;
}

const CategoryContext = createContext<CategoryContextType | undefined>(
  undefined
);

export const CategoryProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedCategoryName, setSelectedCategoryName] = useState<
    string | null
  >(null);

  return (
    <CategoryContext.Provider
      value={{
        selectedCategoryId,
        setSelectedCategoryId,
        selectedCategoryName,
        setSelectedCategoryName,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCategory = () => {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error("useCategory must be used within a CategoryProvider");
  }
  return context;
};
