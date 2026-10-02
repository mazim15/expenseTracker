// Centralized category color mappings (soft pastel chips that work in light and dark)
export const CATEGORY_COLORS = {
  food: "border-transparent bg-orange-500/12 text-orange-700 dark:text-orange-300",
  housing: "border-transparent bg-sky-500/12 text-sky-700 dark:text-sky-300",
  transportation: "border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  utilities: "border-transparent bg-violet-500/12 text-violet-700 dark:text-violet-300",
  entertainment: "border-transparent bg-pink-500/12 text-pink-700 dark:text-pink-300",
  healthcare: "border-transparent bg-rose-500/12 text-rose-700 dark:text-rose-300",
  shopping: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
  education: "border-transparent bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
  personal: "border-transparent bg-teal-500/12 text-teal-700 dark:text-teal-300",
  other: "border-transparent bg-slate-500/12 text-slate-700 dark:text-slate-300",
} as const;

export type CategoryColorKey = keyof typeof CATEGORY_COLORS;

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category as CategoryColorKey] || CATEGORY_COLORS.other;
}

// Chart colors for pie charts and other visualizations, harmonized with the emerald/lime theme
export const CHART_COLORS = [
  "#10B981",
  "#A3E635",
  "#F59E0B",
  "#FB7185",
  "#A78BFA",
  "#14B8A6",
  "#38BDF8",
  "#FB923C",
  "#F472B6",
  "#94A3B8",
] as const;
