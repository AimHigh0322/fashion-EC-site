import { Tag } from "lucide-react";

interface CampaignBadgeProps {
  label?: string;
  name?: string;
  discountType?: string;
  discountValue?: number;
  className?: string;
}

export const CampaignBadge = ({
  label,
  name,
  discountType,
  discountValue,
  className = "",
}: CampaignBadgeProps) => {
  const displayText = label || name || "キャンペーン";
  let badgeColor = "bg-red-500";
  let discountText = "";

  if (discountType === "percent" && discountValue) {
    discountText = `-${discountValue}%`;
    badgeColor = "bg-red-500";
  } else if (discountType === "amount" && discountValue) {
    discountText = `-¥${discountValue.toLocaleString()}`;
    badgeColor = "bg-blue-500";
  } else if (discountType === "freeShipping") {
    discountText = "送料無料";
    badgeColor = "bg-green-500";
  } else if (discountType === "points" && discountValue) {
    discountText = `+${discountValue}P`;
    badgeColor = "bg-purple-500";
  }

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 ${badgeColor} text-white text-xs font-bold rounded-md shadow-sm ${className}`}
    >
      <Tag className="w-3 h-3" />
      <span>{displayText}</span>
      {discountText && <span className="ml-1">({discountText})</span>}
    </div>
  );
};
