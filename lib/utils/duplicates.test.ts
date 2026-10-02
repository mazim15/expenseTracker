import { describe, it, expect } from "vitest";
import { findLikelyDuplicate, descriptionSimilarity } from "./duplicates";
import { ExpenseType } from "@/types/expense";

const existing: ExpenseType = {
  id: "1",
  userId: "u",
  amount: 1250,
  date: new Date(2026, 9, 1),
  category: "food",
  description: "KFC zinger meal",
  location: "KFC, Nazimabad",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("findLikelyDuplicate", () => {
  it("matches same amount, next day, same merchant", () => {
    const dup = findLikelyDuplicate(
      {
        amount: 1250,
        date: new Date(2026, 9, 2),
        description: "Dinner",
        category: "food",
        location: "KFC, Gulshan",
      },
      [existing],
    );
    expect(dup?.id).toBe("1");
  });

  it("ignores different amounts, far dates and the expense itself", () => {
    const base = { date: existing.date, description: existing.description, category: "food" };
    expect(findLikelyDuplicate({ ...base, amount: 1300 }, [existing])).toBeNull();
    expect(
      findLikelyDuplicate({ ...base, amount: 1250, date: new Date(2026, 9, 5) }, [existing]),
    ).toBeNull();
    expect(findLikelyDuplicate({ ...base, amount: 1250, id: "1" }, [existing])).toBeNull();
  });
});

it("descriptionSimilarity scores shared words", () => {
  expect(descriptionSimilarity("Zinger meal KFC", "kfc zinger")).toBe(1);
  expect(descriptionSimilarity("petrol", "groceries")).toBe(0);
});
