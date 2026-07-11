import { describe, it, expect } from "vitest";
import { transformFirebaseExpense } from "./typeGuards";

function makeDoc(category: unknown) {
  const now = { toDate: () => new Date("2025-01-01") };
  return {
    id: "exp-1",
    data: () => ({
      amount: 100,
      category,
      description: "Daycare",
      date: now,
      createdAt: now,
      updatedAt: now,
    }),
  };
}

describe("transformFirebaseExpense category handling", () => {
  it("preserves a custom category (regression: childcare became 'other')", () => {
    const result = transformFirebaseExpense(makeDoc("childcare"), "user-1");
    expect(result?.category).toBe("childcare");
  });

  it("preserves a built-in category", () => {
    const result = transformFirebaseExpense(makeDoc("food"), "user-1");
    expect(result?.category).toBe("food");
  });

  it("falls back to 'other' when category is missing or empty", () => {
    expect(transformFirebaseExpense(makeDoc(undefined), "user-1")?.category).toBe("other");
    expect(transformFirebaseExpense(makeDoc("  "), "user-1")?.category).toBe("other");
  });
});
