// Centralized category color mappings
export const CATEGORY_COLORS = {
  food: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  housing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  transportation: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  utilities: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  entertainment: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  healthcare: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  shopping: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  education: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  personal: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
} as const;

export type CategoryColorKey = keyof typeof CATEGORY_COLORS;

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category as CategoryColorKey] || CATEGORY_COLORS.other;
}

// Chart colors for pie charts and other visualizations
export const CHART_COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', 
  '#FF6B6B', '#6B8E23', '#483D8B', '#CD853F', '#708090'
] as const;