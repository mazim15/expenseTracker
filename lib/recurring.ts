import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ExpenseType, isPaymentMethod, PaymentMethod } from "@/types/expense";
import { logError, logUserActionWithUserId } from "@/lib/logging";
import {
  dueOccurrences,
  nextOccurrence,
  occurrenceId,
  RecurringFrequency,
} from "@/lib/utils/recurringSchedule";

export interface RecurringRule {
  id: string;
  amount: number;
  category: string;
  description: string;
  tags?: string[];
  location?: string;
  paymentMethod?: PaymentMethod;
  frequency: RecurringFrequency;
  startDate: Date;
  nextDue: Date;
  active: boolean;
  createdAt: Date;
}

export type RecurringRuleInput = Omit<RecurringRule, "id" | "createdAt" | "nextDue"> & {
  nextDue?: Date;
};

const rulesCollection = (userId: string) => collection(db, "users", userId, "recurring");

function toDate(value: unknown): Date {
  return value instanceof Timestamp ? value.toDate() : new Date();
}

/** Drops undefined/empty optional fields so Firestore never receives `undefined`. */
function clean<T extends Record<string, unknown>>(data: T): T {
  const out = { ...data };
  for (const key of Object.keys(out)) {
    const v = out[key];
    if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) delete out[key];
  }
  return out;
}

export async function listRecurringRules(userId: string): Promise<RecurringRule[]> {
  const snap = await getDocs(query(rulesCollection(userId), orderBy("nextDue", "asc")));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      amount: typeof data.amount === "number" ? data.amount : 0,
      category: typeof data.category === "string" ? data.category : "other",
      description: typeof data.description === "string" ? data.description : "",
      tags: Array.isArray(data.tags) ? data.tags.filter((t) => typeof t === "string") : [],
      location: typeof data.location === "string" ? data.location : undefined,
      paymentMethod: isPaymentMethod(data.paymentMethod) ? data.paymentMethod : undefined,
      frequency: data.frequency === "weekly" ? "weekly" : "monthly",
      startDate: toDate(data.startDate),
      nextDue: toDate(data.nextDue),
      active: data.active !== false,
      createdAt: toDate(data.createdAt),
    };
  });
}

function ruleFields(rule: Partial<RecurringRuleInput>) {
  return clean({
    amount: rule.amount,
    category: rule.category,
    description: rule.description,
    tags: rule.tags,
    location: rule.location,
    paymentMethod: rule.paymentMethod,
    frequency: rule.frequency,
    startDate: rule.startDate ? Timestamp.fromDate(rule.startDate) : undefined,
    nextDue: rule.nextDue ? Timestamp.fromDate(rule.nextDue) : undefined,
    active: rule.active,
  });
}

/**
 * Creates a rule. When `firstAlreadySaved` is true the expense for `startDate` was
 * saved by the caller, so the rule starts from the occurrence after it.
 */
export async function createRecurringRule(
  userId: string,
  rule: RecurringRuleInput,
  firstAlreadySaved = false,
): Promise<string> {
  const nextDue =
    rule.nextDue ??
    (firstAlreadySaved ? nextOccurrence(rule.startDate, rule.frequency) : rule.startDate);
  const ref = await addDoc(rulesCollection(userId), {
    ...ruleFields({ ...rule, nextDue }),
    createdAt: Timestamp.now(),
  });
  await logUserActionWithUserId(userId, "recurring_created", {
    frequency: rule.frequency,
    amount: rule.amount,
  });
  return ref.id;
}

export async function updateRecurringRule(
  userId: string,
  id: string,
  patch: Partial<RecurringRuleInput>,
): Promise<void> {
  await updateDoc(doc(db, "users", userId, "recurring", id), ruleFields(patch));
}

export async function deleteRecurringRule(userId: string, id: string): Promise<void> {
  await deleteDoc(doc(db, "users", userId, "recurring", id));
  await logUserActionWithUserId(userId, "recurring_deleted", {});
}

/**
 * Creates every expense that has fallen due for the user's active rules and moves each
 * rule's `nextDue` forward. Expense ids are deterministic per rule + day, so running this
 * twice (two tabs, a reload) never creates duplicates. Returns the expenses created.
 */
export async function runRecurring(
  userId: string,
  now: Date = new Date(),
): Promise<Pick<ExpenseType, "description" | "amount">[]> {
  const created: Pick<ExpenseType, "description" | "amount">[] = [];
  try {
    const rules = (await listRecurringRules(userId)).filter((r) => r.active && r.nextDue <= now);
    for (const rule of rules) {
      const { dates, nextDue } = dueOccurrences(rule, now);
      if (dates.length === 0) continue;

      const batch = writeBatch(db);
      for (const date of dates) {
        const ts = Timestamp.fromDate(date);
        batch.set(
          doc(db, "users", userId, "expenses", occurrenceId(rule.id, date)),
          clean({
            amount: rule.amount,
            category: rule.category,
            description: rule.description,
            tags: rule.tags,
            location: rule.location,
            paymentMethod: rule.paymentMethod,
            recurringId: rule.id,
            date: ts,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          }),
        );
        created.push({ description: rule.description, amount: rule.amount });
      }
      batch.update(doc(db, "users", userId, "recurring", rule.id), {
        nextDue: Timestamp.fromDate(nextDue),
      });
      await batch.commit();
    }
    if (created.length > 0) {
      await logUserActionWithUserId(userId, "recurring_expenses_added", { count: created.length });
    }
  } catch (error) {
    await logError(error as Error, "runRecurring", { userId });
  }
  return created;
}
