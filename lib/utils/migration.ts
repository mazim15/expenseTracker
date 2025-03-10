import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Copies all expenses from one user to another
 * @param sourceUserId The user ID to copy expenses from
 * @param targetUserId The user ID to copy expenses to
 * @returns The number of expenses copied
 */
export async function copyExpensesBetweenUsers(
  sourceUserId: string,
  targetUserId: string
): Promise<number> {
  try {
    // Get reference to source user's expenses
    const sourceExpensesRef = collection(db, "users", sourceUserId, "expenses");
    
    // Get all expenses from source user
    const sourceExpensesSnapshot = await getDocs(sourceExpensesRef);
    
    if (sourceExpensesSnapshot.empty) {
      console.log("No expenses found for source user");
      return 0;
    }
    
    // Get reference to target user's expenses
    const targetExpensesRef = collection(db, "users", targetUserId, "expenses");
    
    // Copy each expense to the target user
    let copiedCount = 0;
    const now = new Date();
    
    for (const doc of sourceExpensesSnapshot.docs) {
      const expenseData = doc.data();
      
      // Create a new expense document for the target user
      await addDoc(targetExpensesRef, {
        amount: expenseData.amount,
        category: expenseData.category,
        description: expenseData.description,
        date: expenseData.date, // Keep the original date
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      });
      
      copiedCount++;
    }
    
    console.log(`Successfully copied ${copiedCount} expenses from ${sourceUserId} to ${targetUserId}`);
    return copiedCount;
  } catch (error) {
    console.error("Error copying expenses between users:", error);
    throw error;
  }
} 