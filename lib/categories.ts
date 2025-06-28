import { 
  setDoc,
  getDoc,
  doc, 
  Timestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ExpenseCategoryType } from "@/types/expense";
import { toast } from "sonner";

// Get categories for a user
export async function getUserCategories(userId: string): Promise<ExpenseCategoryType[]> {
  if (!userId) {
    console.error("getUserCategories: No user ID provided");
    return [];
  }

  try {
    console.log(`Fetching categories for user: ${userId}`);
    // Direct document reference approach
    const userCategoriesDoc = doc(db, "users", userId, "settings", "categories");
    const docSnapshot = await getDoc(userCategoriesDoc);
    
    if (docSnapshot.exists()) {
      console.log("Categories found in database:", docSnapshot.data());
      return docSnapshot.data().categories || [];
    } else {
      console.log("No categories document found for user");
      return [];
    }
  } catch (error) {
    console.error("Error getting user categories:", error);
    toast.error("Failed to load categories");
    return [];
  }
}

// Save categories for a user
export async function saveUserCategories(userId: string, categories: ExpenseCategoryType[]): Promise<void> {
  if (!userId) {
    console.error("saveUserCategories: No user ID provided");
    throw new Error("User ID is required");
  }

  try {
    console.log(`Saving categories for user: ${userId}`, categories);
    const userSettingsDoc = doc(db, "users", userId, "settings", "categories");
    
    await setDoc(userSettingsDoc, {
      categories: categories,
      updatedAt: Timestamp.fromDate(new Date())
    });
    
    console.log("Categories saved successfully to database");
    
    // Also update localStorage for faster access
    if (typeof window !== "undefined") {
      localStorage.setItem("expense-categories", JSON.stringify(categories));
    }
    
    toast.success("Categories saved successfully");
  } catch (error) {
    console.error("Error saving user categories:", error);
    toast.error("Failed to save categories");
    throw error;
  }
} 