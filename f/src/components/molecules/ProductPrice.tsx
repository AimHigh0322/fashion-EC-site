interface ProductPriceProps {
  originalPrice: number;
  discountedPrice?: number;
  campaign?: {
    id: string;
    name: string;
    label?: string;
    discountType?: string;
    discountValue?: number;
  };
  className?: string;
}

export const ProductPrice = ({
  originalPrice,
  discountedPrice,
  campaign,
  className = "",
}: ProductPriceProps) => {
  const hasDiscount =
    discountedPrice !== undefined && discountedPrice < originalPrice;
  const finalPrice =
    discountedPrice !== undefined ? discountedPrice : originalPrice;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-baseline gap-2">
        <span className="text-base sm:text-lg font-bold text-red-600">
          ¥{finalPrice.toLocaleString()}
        </span>
        {hasDiscount && (
          <span className="text-xs text-gray-400 line-through">
            ¥{originalPrice.toLocaleString()}
          </span>
        )}
        <span className="text-xs text-gray-500">(税込)</span>
      </div>
      {hasDiscount && campaign && (
        <div className="text-xs text-green-600 font-medium">
          {campaign.label || campaign.name}適用中
        </div>
      )}
    </div>
  );
};
