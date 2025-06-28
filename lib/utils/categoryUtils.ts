import { EXPENSE_CATEGORIES as DEFAULT_CATEGORIES, ExpenseCategoryType } from '@/types/expense';
import { getCategoryColor } from '@/lib/constants/categoryColors';

// Get current categories from localStorage or defaults
function getCurrentCategories(): ExpenseCategoryType[] {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("expense-categories");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error("Error parsing stored categories:", error);
      }
    }
  }
  return DEFAULT_CATEGORIES;
}

// Get category label by value
export function getCategoryLabel(categoryValue: string): string {
  const categories = getCurrentCategories();
  const category = categories.find(cat => cat.value === categoryValue);
  return category ? category.label : categoryValue;
}

// Get all categories
export function getAllCategories(): ExpenseCategoryType[] {
  return getCurrentCategories();
}

// Check if category exists
export function isCategoryValid(categoryValue: string): boolean {
  const categories = getCurrentCategories();
  return categories.some(cat => cat.value === categoryValue);
}

// Get category by value
export function getCategoryByValue(categoryValue: string): ExpenseCategoryType | undefined {
  const categories = getCurrentCategories();
  return categories.find(cat => cat.value === categoryValue);
}

// Format category for display
export function formatCategoryForDisplay(categoryValue: string): {
  label: string;
  value: string;
  color: string;
} {
  const category = getCategoryByValue(categoryValue);
  return {
    label: category ? category.label : categoryValue,
    value: categoryValue,
    color: getCategoryColor(categoryValue)
  };
}

