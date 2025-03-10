import { ExpenseCategoryType } from "@/types/expense";

const STORAGE_KEY = "expense-categories";

// Get categories from localStorage or return default categories
export function getStoredCategories(): ExpenseCategoryType[] {
  if (typeof window === "undefined") return [];
  
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

// Save categories to localStorage
export function storeCategories(categories: ExpenseCategoryType[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
} 