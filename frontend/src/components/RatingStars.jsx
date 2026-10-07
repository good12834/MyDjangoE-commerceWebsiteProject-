import { Star, StarHalf } from "lucide-react";

export default function RatingStars({ value = 0, count = null, size = 14 }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (value >= i - 0.25) stars.push(<Star key={i} size={size} className="text-amber-400" fill="currentColor" />);
    else if (value >= i - 0.75) stars.push(<StarHalf key={i} size={size} className="text-amber-400" fill="currentColor" />);
    else stars.push(<Star key={i} size={size} className="text-gray-300" />);
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex gap-0.5">{stars}</span>
      {count != null && <span className="text-xs text-gray-400">({count})</span>}
    </span>
  );
}
