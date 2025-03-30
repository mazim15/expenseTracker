import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp,
  // startAt,
  // endAt
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ExpenseType } from "@/types/expense";

// Get expenses for a user with optional limit
export async function getExpenses(userId: string, limitCount?: number): Promise<ExpenseType[]> {
  try {
    // Create a reference to the user's expenses subcollection
    const userExpensesCollection = collection(db, "users", userId, "expenses");
    
    let q = query(
      userExpensesCollection,
      orderBy("date", "desc")
    );
    
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return [];
    }
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: userId,
        amount: data.amount,
        date: data.date.toDate(),
        category: data.category,
        description: data.description,
        tags: data.tags || [],
        location: data.location || "",
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      };
    });
  } catch (error) {
    console.error("Error getting expenses:", error);
    return [];
  }
}

// Get expenses for a specific month
export async function getExpensesByMonth(userId: string, month: number, year: number): Promise<ExpenseType[]> {
  // Create date range for the month
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999); // Last day of month
  
  // Create a reference to the user's expenses subcollection
  const userExpensesCollection = collection(db, "users", userId, "expenses");
  
  const q = query(
    userExpensesCollection,
    where("date", ">=", Timestamp.fromDate(startDate)),
    where("date", "<=", Timestamp.fromDate(endDate)),
    orderBy("date", "desc")
  );
  
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: userId,
      amount: data.amount,
      date: data.date.toDate(),
      category: data.category,
      description: data.description,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate()
    };
  });
}

// Add a new expense
export async function addExpense(expense: Omit<ExpenseType, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<string> {
  try {
    // Create a reference to the user's expenses subcollection
    const userExpensesCollection = collection(db, "users", userId, "expenses");
    
    const now = new Date();
    const docRef = await addDoc(userExpensesCollection, {
      ...expense,
      // We don't need to store userId in the document since it's in the path
      date: Timestamp.fromDate(expense.date),
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding expense:", error);
    throw error;
  }
}

// Update an expense
export async function updateExpense(userId: string, expenseId: string, expenseData: Partial<ExpenseType>): Promise<void> {
  try {
    const expenseDoc = doc(db, "users", userId, "expenses", expenseId);
    
    // Create a properly typed update object
    const updateData: Record<string, unknown> = {
      amount: expenseData.amount,
      category: expenseData.category,
      description: expenseData.description,
      date: expenseData.date ? Timestamp.fromDate(expenseData.date) : undefined,
      // Add new fields
      tags: expenseData.tags,
      location: expenseData.location,
      updatedAt: Timestamp.fromDate(new Date())
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Type assertion to match Firestore's expected type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateDoc(expenseDoc, updateData as { [x: string]: any });
  } catch (error) {
    console.error("Error updating expense:", error);
    throw error;
  }
}

// Delete an expense
export async function deleteExpense(id: string, userId: string): Promise<void> {
  try {
    // Create a reference to the specific expense document
    const expenseDoc = doc(db, "users", userId, "expenses", id);
    await deleteDoc(expenseDoc);
  } catch (error) {
    console.error("Error deleting expense:", error);
    throw error;
  }
}

// Get expenses for a specific month and year
export async function getExpensesForPeriod(userId: string, month: number, year: number): Promise<ExpenseType[]> {
  try {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);
    
    const expensesCollection = collection(db, "users", userId, "expenses");
    const q = query(
      expensesCollection,
      where("date", ">=", Timestamp.fromDate(startDate)),
      where("date", "<=", Timestamp.fromDate(endDate)),
      orderBy("date", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        amount: data.amount,
        date: data.date.toDate(),
        category: data.category,
        description: data.description,
        tags: data.tags || [],
        location: data.location || "",
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      };
    });
  } catch (error) {
    console.error("Error getting expenses for period:", error);
    throw error;
  }
} 