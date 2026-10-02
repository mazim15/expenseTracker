import { describe, it, expect } from "vitest";
import { computeInsights } from "./insights";
import { resolveRange, previousRange } from "./dateRange";
import { ExpenseType } from "@/types/expense";

let n = 0;
function exp(
  day: Date,
  amount: number,
  category = "food",
  extra: Partial<ExpenseType> = {},
): ExpenseType {
  n += 1;
  return {
    id: `e${n}`,
    userId: "u",
    amount,
    date: day,
    category,
    description: extra.description ?? `${category} ${n}`,
    createdAt: day,
    updatedAt: day,
    ...extra,
  };
}

const now = new Date(2026, 9, 20, 12);
const range = resolveRange("thisMonth", null, null, now);
const prev = previousRange(range);
const money = (x: number) => `Rs ${Math.round(x)}`;
const ids = (list: { id: string }[]) => list.map((i) => i.id);

describe("computeInsights", () => {
  it("returns nothing for an empty period", () => {
    expect(computeInsights([], range, prev, now, money)).toEqual([]);
  });

  it("flags a category that grew a lot vs last month", () => {
    const data = [
      exp(new Date(2026, 8, 5), 1000, "food"),
      exp(new Date(2026, 9, 5), 2000, "food"),
      exp(new Date(2026, 9, 6), 100, "transportation"),
    ];
    const list = computeInsights(data, range, prev, now, money);
    const up = list.find((i) => i.id === "category-up:food");
    expect(up?.tone).toBe("warn");
    expect(up?.title).toBe("Food is up 100%");
    expect(up?.href).toBe("/expenses?category=food");
  });

  it("detects an unusually large expense against category history", () => {
    const history = [1, 2, 3, 4, 5].map((d) => exp(new Date(2026, 7, d), 500, "food"));
    const big = exp(new Date(2026, 9, 10), 4000, "food", { description: "Wedding dinner" });
    const list = computeInsights([...history, big], range, prev, now, money);
    expect(ids(list)).toContain(`unusual:${big.id}`);
  });

  it("projects month-end spend and counts no-spend days", () => {
    const data = [exp(new Date(2026, 9, 2), 1000), exp(new Date(2026, 8, 3), 500)];
    const list = computeInsights(data, range, prev, now, money);
    const projection = list.find((i) => i.id === "projection");
    expect(projection?.title).toBe("On pace for Rs 1550");
    expect(list.find((i) => i.id === "no-spend-days")?.title).toBe("19 no-spend days");
  });

  it("reports recurring share and new places, sorted by weight", () => {
    const data = [
      exp(new Date(2026, 8, 1), 300, "food", { location: "KFC" }),
      exp(new Date(2026, 9, 1), 3000, "housing", { recurringId: "r1" }),
      exp(new Date(2026, 9, 3), 600, "food", { location: "Cafe Aylanto, Gulberg" }),
    ];
    const list = computeInsights(data, range, prev, now, money);
    expect(list.find((i) => i.id === "recurring-share")?.title).toBe("83% goes to recurring bills");
    expect(list.find((i) => i.id === "new-places")?.body).toContain("Cafe Aylanto");
    const weights = list.map((i) => i.weight);
    expect(weights).toEqual([...weights].sort((a, b) => b - a));
  });
});
