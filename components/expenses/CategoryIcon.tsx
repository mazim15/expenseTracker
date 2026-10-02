import {
  Utensils,
  Home,
  Car,
  Zap,
  Clapperboard,
  HeartPulse,
  ShoppingBag,
  GraduationCap,
  User,
  CircleDashed,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategoryColor } from "@/lib/constants/categoryColors";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  food: Utensils,
  housing: Home,
  transportation: Car,
  utilities: Zap,
  entertainment: Clapperboard,
  healthcare: HeartPulse,
  shopping: ShoppingBag,
  education: GraduationCap,
  personal: User,
  other: CircleDashed,
};

/** Round tinted tile with the category's icon. */
export function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const Icon = CATEGORY_ICONS[category] ?? CATEGORY_ICONS.other;
  return (
    <span
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
        getCategoryColor(category),
        className,
      )}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}
