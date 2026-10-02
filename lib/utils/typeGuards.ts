import {
  ExpenseType,
  ExpenseCategory,
  ReceiptItem,
  ReceiptTotals,
  isPaymentMethod,
} from "@/types/expense";

// Type guard for ExpenseType
export function isExpenseType(obj: unknown): obj is ExpenseType {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const expense = obj as Record<string, unknown>;

  return (
    typeof expense.id === "string" &&
    typeof expense.userId === "string" &&
    typeof expense.amount === "number" &&
    expense.date instanceof Date &&
    typeof expense.category === "string" &&
    typeof expense.description === "string" &&
    expense.createdAt instanceof Date &&
    expense.updatedAt instanceof Date &&
    (expense.tags === undefined || Array.isArray(expense.tags)) &&
    (expense.location === undefined || typeof expense.location === "string")
  );
}

// Type guard for ExpenseCategory
// Categories are user-defined (stored per-user in Firestore), so any
// non-empty string is a valid category — not just the built-in defaults.
export function isExpenseCategory(value: string): value is ExpenseCategory {
  return value.trim().length > 0;
}

function isTimestamp(value: unknown): value is { toDate: () => Date } {
  return (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  );
}

function parseReceiptItems(raw: unknown[]): ReceiptItem[] {
  return raw.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const i = item as Record<string, unknown>;
    if (typeof i.name !== "string" || typeof i.price !== "number") return [];
    return [
      {
        name: i.name,
        price: i.price,
        quantity: typeof i.quantity === "number" ? i.quantity : 1,
        ...(typeof i.category === "string" && { category: i.category }),
        ...(typeof i.brand === "string" && i.brand && { brand: i.brand }),
      },
    ];
  });
}

/** `brands`, or the single `brand` that early enriched expenses were saved with. */
function parseBrands(data: Record<string, unknown>): string[] | undefined {
  if (Array.isArray(data.brands)) {
    const brands = data.brands.filter((b): b is string => typeof b === "string" && !!b);
    return brands.length ? brands : undefined;
  }
  return typeof data.brand === "string" && data.brand ? [data.brand] : undefined;
}

function isReceiptTotals(value: unknown): value is ReceiptTotals {
  if (typeof value !== "object" || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.subtotal === "number" && typeof t.discount === "number" && typeof t.fees === "number"
  );
}

// Safe expense transformer for Firebase data
export function transformFirebaseExpense(
  doc: { id: string; data: () => Record<string, unknown> },
  userId: string,
): ExpenseType | null {
  try {
    const data = doc.data();

    if (!data) return null;

    const expense: ExpenseType = {
      id: doc.id,
      userId: userId,
      amount: typeof data.amount === "number" ? data.amount : 0,
      date:
        data.date &&
        typeof data.date === "object" &&
        "toDate" in data.date &&
        typeof data.date.toDate === "function"
          ? data.date.toDate()
          : new Date(),
      category:
        typeof data.category === "string" && isExpenseCategory(data.category)
          ? data.category
          : "other",
      description: typeof data.description === "string" ? data.description : "",
      tags: Array.isArray(data.tags)
        ? data.tags.filter((tag: unknown) => typeof tag === "string")
        : [],
      location: typeof data.location === "string" ? data.location : "",
      ...(isPaymentMethod(data.paymentMethod) && { paymentMethod: data.paymentMethod }),
      ...(typeof data.recurringId === "string" && { recurringId: data.recurringId }),
      ...(typeof data.receiptPath === "string" && { receiptPath: data.receiptPath }),
      ...(typeof data.merchant === "string" && data.merchant && { merchant: data.merchant }),
      ...(parseBrands(data) && { brands: parseBrands(data) }),
      ...(Array.isArray(data.items) && { items: parseReceiptItems(data.items) }),
      ...(isReceiptTotals(data.receiptTotals) && { receiptTotals: data.receiptTotals }),
      ...(typeof data.receiptId === "string" && { receiptId: data.receiptId }),
      ...(isTimestamp(data.enrichedAt) && { enrichedAt: data.enrichedAt.toDate() }),
      createdAt:
        data.createdAt &&
        typeof data.createdAt === "object" &&
        "toDate" in data.createdAt &&
        typeof data.createdAt.toDate === "function"
          ? data.createdAt.toDate()
          : new Date(),
      updatedAt:
        data.updatedAt &&
        typeof data.updatedAt === "object" &&
        "toDate" in data.updatedAt &&
        typeof data.updatedAt.toDate === "function"
          ? data.updatedAt.toDate()
          : new Date(),
    };

    return isExpenseType(expense) ? expense : null;
  } catch (error) {
    console.error("Error transforming Firebase expense:", error);
    return null;
  }
}

// Type guard for partial expense data used in updates
export function isPartialExpenseData(obj: unknown): obj is Partial<ExpenseType> {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const partial = obj as Record<string, unknown>;

  // Check each property if it exists
  if (partial.amount !== undefined && typeof partial.amount !== "number") return false;
  if (partial.date !== undefined && !(partial.date instanceof Date)) return false;
  if (
    partial.category !== undefined &&
    (typeof partial.category !== "string" || !isExpenseCategory(partial.category))
  )
    return false;
  if (partial.description !== undefined && typeof partial.description !== "string") return false;
  if (partial.tags !== undefined && !Array.isArray(partial.tags)) return false;
  if (partial.location !== undefined && typeof partial.location !== "string") return false;

  return true;
}
