import { ExpenseType } from "@/types/expense";

export type ExpenseGroup = {
  key: string;
  label: string;
};

const QUANTITY_ONLY = /^\d+([.,]\d+)?$/;

/**
 * First meaningful word of a description — the brand/product token —
 * skipping leading quantities like "3" in "3 wipes" so that
 * "tifal xxl, 3 wipes" and "tifal medium, 5 wipes" both resolve to "tifal".
 */
function firstBrandWord(description: string): string | null {
  const words = description
    .split(/[^a-zA-Z0-9]+/)
    .map((w) => w.trim())
    .filter(Boolean);
  for (const w of words) {
    if (QUANTITY_ONLY.test(w)) continue;
    if (/[a-zA-Z]/.test(w)) return w;
  }
  return null;
}

/**
 * The area/branch part of a location saved as "Merchant, Area"
 * (e.g. "KFC, Nazimabad" -> "Nazimabad"). Null when there is no area.
 */
export function getLocationArea(location?: string): string | null {
  if (!location) return null;
  const area = location.split(",").slice(1).join(",").trim();
  return area || null;
}

/**
 * Groups an expense by its merchant when present, otherwise by
 * `category` + its brand.
 * The saved `merchant` (from a receipt scan or AI enrichment) wins. Without it,
 * locations saved as "Merchant, Area" (e.g. "KFC, Nazimabad") give the merchant
 * name (before the first comma) — the same merchant across different areas
 * shares one group. The brand is the saved `brand`, else the brand word
 * extracted from the `description`. Returns null when nothing yields a key.
 */
export function getExpenseGroup(
  e: Pick<ExpenseType, "location" | "category" | "description" | "merchant" | "brand">,
): ExpenseGroup | null {
  const merchant = e.merchant?.trim() || e.location?.split(",")[0].trim();
  if (merchant) {
    return { key: `loc:${merchant.toLowerCase()}`, label: merchant };
  }
  const brand = e.brand?.trim() || firstBrandWord(e.description);
  if (!brand) return null;
  return { key: `${e.category}:${brand.toLowerCase()}`, label: brand };
}

/**
 * All expenses that belong to the same group as `target` (including `target`),
 * newest first.
 */
export function findRelatedExpenses(target: ExpenseType, all: ExpenseType[]): ExpenseType[] {
  const group = getExpenseGroup(target);
  if (!group) return [target];
  return all
    .filter((e) => getExpenseGroup(e)?.key === group.key)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}
