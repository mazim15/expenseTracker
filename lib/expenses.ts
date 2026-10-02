import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  writeBatch,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  FieldValue,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { deleteReceipt } from "@/lib/receipts";
import { enrichInBackground } from "@/lib/enrichment";
import { ExpenseType } from "@/types/expense";
import { transformFirebaseExpense } from "@/lib/utils/typeGuards";
import { logError, logUserActionWithUserId } from "@/lib/logging";

// Get expenses for a user with optional limit and pagination
export async function getExpenses(
  userId: string,
  limitCount?: number,
  lastVisible?: QueryDocumentSnapshot<DocumentData>,
): Promise<{
  expenses: ExpenseType[];
  lastVisible: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}> {
  try {
    // Create a reference to the user's expenses subcollection
    const userExpensesCollection = collection(db, "users", userId, "expenses");

    let q = query(userExpensesCollection, orderBy("date", "desc"));

    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    if (lastVisible) {
      q = query(q, startAfter(lastVisible));
    }

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { expenses: [], lastVisible: null, hasMore: false };
    }

    const expenses = querySnapshot.docs
      .map((doc) => transformFirebaseExpense(doc, userId))
      .filter((expense): expense is ExpenseType => expense !== null);

    const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
    const hasMore = querySnapshot.docs.length === (limitCount || Infinity);

    return {
      expenses,
      lastVisible: lastDoc,
      hasMore,
    };
  } catch (error) {
    await logError(error as Error, "getExpenses", { userId, limitCount });
    if (error instanceof Error) {
      throw new Error(`Failed to fetch expenses: ${error.message}`);
    }
    throw new Error("Failed to fetch expenses: Unknown error");
  }
}

// Simple wrapper for backward compatibility
export async function getAllExpenses(userId: string): Promise<ExpenseType[]> {
  const result = await getExpenses(userId);
  return result.expenses;
}

// Get expenses for a specific month
export async function getExpensesByMonth(
  userId: string,
  month: number,
  year: number,
): Promise<ExpenseType[]> {
  // Create date range for the month
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999); // Last day of month

  // Create a reference to the user's expenses subcollection
  const userExpensesCollection = collection(db, "users", userId, "expenses");

  const q = query(
    userExpensesCollection,
    where("date", ">=", Timestamp.fromDate(startDate)),
    where("date", "<=", Timestamp.fromDate(endDate)),
    orderBy("date", "desc"),
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs
    .map((doc) => transformFirebaseExpense(doc, userId))
    .filter((expense): expense is ExpenseType => expense !== null);
}

// Add a new expense
export async function addExpense(
  expense: Omit<ExpenseType, "id" | "createdAt" | "updatedAt">,
  userId: string,
): Promise<string> {
  try {
    // Create a reference to the user's expenses subcollection
    const userExpensesCollection = collection(db, "users", userId, "expenses");

    const now = new Date();
    const data: Record<string, unknown> = {
      ...expense,
      // We don't need to store userId in the document since it's in the path
      date: Timestamp.fromDate(expense.date),
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };
    // Firestore rejects undefined values (e.g. an unset paymentMethod)
    Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
    const docRef = await addDoc(userExpensesCollection, data);

    // Log expense creation
    const logDetails: Record<string, unknown> = {
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      date: expense.date.toISOString().split("T")[0], // YYYY-MM-DD format
    };

    // Only add location if it exists and is not empty
    if (expense.location && expense.location.trim()) {
      logDetails.location = expense.location;
    }

    await logUserActionWithUserId(userId, "expense_created", logDetails);

    // Scanned expenses arrive already enriched; the rest get merchant/brand from AI afterwards
    if (!expense.enrichedAt) {
      enrichInBackground(userId, [{ id: docRef.id, ...expense }]);
    }

    return docRef.id;
  } catch (error) {
    await logError(error as Error, "addExpense", {
      userId,
      expense: { ...expense, amount: expense.amount },
    });
    if (error instanceof Error) {
      throw new Error(`Failed to add expense: ${error.message}`);
    }
    throw new Error("Failed to add expense: Unknown error");
  }
}

// Update an expense
export async function updateExpense(
  userId: string,
  expenseId: string,
  expenseData: Partial<ExpenseType>,
): Promise<void> {
  try {
    const expenseDoc = doc(db, "users", userId, "expenses", expenseId);

    // Merchant/brand come from the description and location, so redo them when those change
    const before =
      expenseData.description !== undefined || expenseData.location !== undefined
        ? (await getDoc(expenseDoc)).data()
        : undefined;
    const textChanged =
      !!before &&
      ((expenseData.description !== undefined && expenseData.description !== before.description) ||
        (expenseData.location !== undefined && expenseData.location !== (before.location ?? "")));

    // Create a properly typed update object
    const updateData: Record<string, unknown> = {
      amount: expenseData.amount,
      category: expenseData.category,
      description: expenseData.description,
      date: expenseData.date ? Timestamp.fromDate(expenseData.date) : undefined,
      // Add new fields
      tags: expenseData.tags,
      location: expenseData.location,
      paymentMethod: expenseData.paymentMethod,
      receiptPath: expenseData.receiptPath,
      updatedAt: Timestamp.fromDate(new Date()),
    };

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Type assertion to match Firestore's expected type
    await updateDoc(
      expenseDoc,
      updateData as Record<string, FieldValue | Partial<unknown> | undefined>,
    );

    // Log expense update
    const logDetails: Record<string, unknown> = {};

    if (expenseData.amount !== undefined) logDetails.amount = expenseData.amount;
    if (expenseData.category) logDetails.category = expenseData.category;
    if (expenseData.description) logDetails.description = expenseData.description;
    if (expenseData.date) logDetails.date = expenseData.date.toISOString().split("T")[0];
    if (expenseData.location && expenseData.location.trim())
      logDetails.location = expenseData.location;

    await logUserActionWithUserId(userId, "expense_updated", logDetails);

    if (before && textChanged) {
      enrichInBackground(userId, [
        {
          id: expenseId,
          description: expenseData.description ?? before.description,
          location: expenseData.location ?? before.location,
          category: expenseData.category ?? before.category,
        },
      ]);
    }
  } catch (error) {
    await logError(error as Error, "updateExpense", {
      userId,
      expenseId,
      updateFields: Object.keys(expenseData),
    });
    if (error instanceof Error) {
      throw new Error(`Failed to update expense: ${error.message}`);
    }
    throw new Error("Failed to update expense: Unknown error");
  }
}

// Delete an expense
export async function deleteExpense(id: string, userId: string): Promise<void> {
  try {
    // Create a reference to the specific expense document
    const expenseDoc = doc(db, "users", userId, "expenses", id);
    const snapshot = await getDoc(expenseDoc);
    const receiptPath = snapshot.data()?.receiptPath;
    await deleteDoc(expenseDoc);
    if (typeof receiptPath === "string") await deleteReceipt(receiptPath);

    // Log expense deletion
    await logUserActionWithUserId(userId, "expense_deleted", {});
  } catch (error) {
    await logError(error as Error, "deleteExpense", { userId, expenseId: id });
    if (error instanceof Error) {
      throw new Error(`Failed to delete expense: ${error.message}`);
    }
    throw new Error("Failed to delete expense: Unknown error");
  }
}

// Get expenses for a specific month and year
export async function getExpensesForPeriod(
  userId: string,
  month: number,
  year: number,
): Promise<ExpenseType[]> {
  try {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    const expensesCollection = collection(db, "users", userId, "expenses");
    const q = query(
      expensesCollection,
      where("date", ">=", Timestamp.fromDate(startDate)),
      where("date", "<=", Timestamp.fromDate(endDate)),
      orderBy("date", "desc"),
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs
      .map((doc) => transformFirebaseExpense(doc, userId))
      .filter((expense): expense is ExpenseType => expense !== null);
  } catch (error) {
    console.error("Error getting expenses for period:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to get expenses for period: ${error.message}`);
    }
    throw new Error("Failed to get expenses for period: Unknown error");
  }
}

// Import many expenses at once (CSV import). Writes in batches of 400.
export async function importExpenses(
  userId: string,
  items: Omit<ExpenseType, "id" | "userId" | "createdAt" | "updatedAt">[],
): Promise<number> {
  const userExpensesCollection = collection(db, "users", userId, "expenses");
  const now = Timestamp.now();
  const saved: { id: string; description: string; location?: string; category: string }[] = [];
  for (let i = 0; i < items.length; i += 400) {
    const batch = writeBatch(db);
    for (const item of items.slice(i, i + 400)) {
      const data: Record<string, unknown> = {
        ...item,
        date: Timestamp.fromDate(item.date),
        createdAt: now,
        updatedAt: now,
      };
      Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
      const ref = doc(userExpensesCollection);
      batch.set(ref, data);
      saved.push({ id: ref.id, ...item });
    }
    await batch.commit();
  }
  await logUserActionWithUserId(userId, "expenses_imported", { count: items.length });
  enrichInBackground(userId, saved);
  return items.length;
}
