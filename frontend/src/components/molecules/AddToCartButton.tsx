import { ShoppingCart, Trash2 } from "lucide-react";

interface AddToCartButtonProps {
  productId: string;
  isAuthenticated: boolean;
  isAdding: boolean;
  isInCart: boolean;
  onAddToCart: (productId: string) => Promise<void>;
  onRemoveFromCart: (productId: string) => Promise<void>;
  disabled?: boolean;
}

/**
 * Add to Cart Button Component
 *
 * Style: Orange solid color design
 * - Orange solid color (bg-[#e2603f])
 * - Clean, modern appearance
 * - Loading state with spinner
 * - Shopping cart icon
 * - Smooth transitions and hover effects
 *
 * Classes:
 * - Base: w-full bg-[#e2603f] text-white text-sm font-medium py-2 px-4 rounded-full
 * - Hover: hover:bg-[#b86d5a] hover:shadow-lg
 * - Disabled: disabled:bg-gray-300 disabled:cursor-not-allowed
 * - Transitions: transition-all duration-200 shadow-sm
 * - Layout: flex items-center justify-center gap-2
 */
export const AddToCartButton = ({
  productId,
  isAuthenticated,
  isAdding,
  isInCart,
  onAddToCart,
  onRemoveFromCart,
  disabled = false,
}: AddToCartButtonProps) => {
  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated || disabled || isAdding) {
      return;
    }

    if (isInCart) {
      await onRemoveFromCart(productId);
    } else {
      await onAddToCart(productId);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isAdding || !isAuthenticated || disabled}
      className={`w-full transition-all duration-200 shadow-sm flex items-center justify-center gap-2 text-xs sm:text-sm font-medium py-2 px-4 rounded-full cursor-pointer ${
        isInCart
          ? "bg-green-500 hover:bg-green-600 text-white"
          : "bg-[#e2603f] hover:bg-[#c95a42] disabled:bg-gray-300 disabled:cursor-not-allowed text-white"
      }`}
    >
      {isAdding ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>追加中...</span>
        </>
      ) : isInCart ? (
        <>
          <Trash2 className="w-4 h-4" />
          <span>カートから削除</span>
        </>
      ) : (
        <>
          <ShoppingCart className="w-4 h-4" />
          <span>カートに入れる</span>
        </>
      )}
    </button>
  );
};
