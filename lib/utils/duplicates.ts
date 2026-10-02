import { differenceInCalendarDays } from "date-fns";
import { ExpenseType } from "@/types/expense";
import { getExpenseGroup } from "@/lib/utils/expenseGrouping";

type Candidate = Pick<ExpenseType, "amount" | "date" | "description" | "category" | "location"> & {
  id?: string;
};

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1),
  );
}

/** Share of words the two descriptions have in common (0–1). */
export function descriptionSimilarity(a: string, b: string): number {
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 || wb.size === 0)
    return a.trim().toLowerCase() === b.trim().toLowerCase() ? 1 : 0;
  let common = 0;
  for (const w of wa) if (wb.has(w)) common++;
  return common / Math.min(wa.size, wb.size);
}

/**
 * An existing expense that `candidate` most likely repeats: same amount, within a day,
 * and the same merchant/brand group or mostly the same description words.
 */
export function findLikelyDuplicate(candidate: Candidate, all: ExpenseType[]): ExpenseType | null {
  const group = getExpenseGroup(candidate);
  for (const e of all) {
    if (candidate.id && e.id === candidate.id) continue;
    if (Math.abs(e.amount - candidate.amount) > 0.009) continue;
    if (Math.abs(differenceInCalendarDays(e.date, candidate.date)) > 1) continue;
    const sameGroup = group && getExpenseGroup(e)?.key === group.key;
    if (sameGroup || descriptionSimilarity(e.description, candidate.description) >= 0.6) return e;
  }
  return null;
}
