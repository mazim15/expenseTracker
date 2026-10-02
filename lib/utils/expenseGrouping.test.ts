import { describe, it, expect } from "vitest";
import { getExpenseGroup, findRelatedExpenses, getLocationArea } from "./expenseGrouping";
import { ExpenseType } from "@/types/expense";

function makeExpense(partial: Partial<ExpenseType>): ExpenseType {
  return {
    id: partial.id ?? crypto.randomUUID(),
    userId: "u1",
    amount: partial.amount ?? 100,
    date: partial.date ?? new Date("2025-01-01"),
    category: partial.category ?? "food",
    description: partial.description ?? "",
    location: partial.location,
    merchant: partial.merchant,
    brand: partial.brand,
    tags: partial.tags ?? [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as ExpenseType;
}

describe("getExpenseGroup", () => {
  it("prefers the saved merchant over the location text", () => {
    const g = getExpenseGroup(makeExpense({ merchant: "KFC", location: "Nazimabad Branch" }));
    expect(g).toEqual({ key: "loc:kfc", label: "KFC" });
  });

  it("links a manual expense to a scanned one from the same merchant", () => {
    const scanned = getExpenseGroup(makeExpense({ merchant: "Imtiaz", description: "Receipt" }));
    const manual = getExpenseGroup(makeExpense({ location: "Imtiaz, Gulshan" }));
    expect(scanned?.key).toBe(manual?.key);
  });

  it("uses the saved brand when there is no merchant", () => {
    const g = getExpenseGroup(makeExpense({ brand: "Tifal", description: "3 wipes xxl" }));
    expect(g).toEqual({ key: "food:tifal", label: "Tifal" });
  });

  it("groups by location when a merchant/place is present", () => {
    const g = getExpenseGroup(makeExpense({ location: "KFC", description: "1 zinger 1 broast" }));
    expect(g).toEqual({ key: "loc:kfc", label: "KFC" });
  });

  it("is case-insensitive on location so 'KFC' and 'kfc' share a key", () => {
    const a = getExpenseGroup(makeExpense({ location: "KFC" }));
    const b = getExpenseGroup(makeExpense({ location: "kfc" }));
    expect(a?.key).toBe(b?.key);
  });

  it("groups the same merchant across different areas ('KFC, Nazimabad' vs 'KFC, 5 Star')", () => {
    const a = getExpenseGroup(makeExpense({ location: "KFC, Nazimabad" }));
    const b = getExpenseGroup(makeExpense({ location: "KFC, 5 Star" }));
    expect(a).toEqual({ key: "loc:kfc", label: "KFC" });
    expect(a?.key).toBe(b?.key);
  });

  it("falls back to category + brand word from description when no location", () => {
    const g = getExpenseGroup(
      makeExpense({ category: "childcare", description: "tifal xxl, 3 wipes" }),
    );
    expect(g).toEqual({ key: "childcare:tifal", label: "tifal" });
  });

  it("collapses size/quantity variants of the same product", () => {
    const a = getExpenseGroup(
      makeExpense({ category: "childcare", description: "tifal xxl, 3 wipes" }),
    );
    const b = getExpenseGroup(
      makeExpense({ category: "childcare", description: "tifal medium, 5 wipes" }),
    );
    expect(a?.key).toBe(b?.key);
  });

  it("skips a leading quantity to find the brand word", () => {
    const g = getExpenseGroup(makeExpense({ category: "childcare", description: "3 wipes" }));
    expect(g?.key).toBe("childcare:wipes");
  });

  it("returns null when there is neither a location nor a usable description", () => {
    expect(getExpenseGroup(makeExpense({ description: "123 456" }))).toBeNull();
  });
});

describe("getLocationArea", () => {
  it("returns the area after the merchant name", () => {
    expect(getLocationArea("KFC, Nazimabad")).toBe("Nazimabad");
    expect(getLocationArea("KFC, 5 Star")).toBe("5 Star");
  });

  it("returns null when there is no area or no location", () => {
    expect(getLocationArea("KFC")).toBeNull();
    expect(getLocationArea(undefined)).toBeNull();
  });
});

describe("findRelatedExpenses", () => {
  it("returns same-location expenses newest first, including the target", () => {
    const target = makeExpense({ id: "t", location: "KFC", date: new Date("2025-03-01") });
    const older = makeExpense({ id: "o", location: "kfc", date: new Date("2025-01-01") });
    const other = makeExpense({ id: "x", location: "McDonalds" });
    const related = findRelatedExpenses(target, [older, other, target]);
    expect(related.map((e) => e.id)).toEqual(["t", "o"]);
  });

  it("groups no-location childcare purchases by brand across size variants", () => {
    const target = makeExpense({
      id: "t",
      category: "childcare",
      description: "tifal xxl, 3 wipes",
    });
    const variant = makeExpense({
      id: "v",
      category: "childcare",
      description: "tifal medium, 5 wipes",
    });
    const unrelated = makeExpense({
      id: "u",
      category: "childcare",
      description: "molfix large",
    });
    const related = findRelatedExpenses(target, [target, variant, unrelated]);
    expect(related.map((e) => e.id).sort()).toEqual(["t", "v"]);
  });
});
