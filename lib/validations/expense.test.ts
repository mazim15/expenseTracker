import { describe, it, expect } from "vitest";
import { createExpenseSchema, updateExpenseSchema } from "./expense";

const validInput = {
  description: "Coffee",
  amount: 4.5,
  category: "food",
  date: new Date("2025-01-01"),
  userId: "user-1",
};

describe("createExpenseSchema", () => {
  it("accepts a valid expense", () => {
    expect(createExpenseSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects negative amounts", () => {
    const result = createExpenseSchema.safeParse({ ...validInput, amount: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects future dates", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const result = createExpenseSchema.safeParse({ ...validInput, date: future });
    expect(result.success).toBe(false);
  });

  it("rejects empty descriptions", () => {
    const result = createExpenseSchema.safeParse({ ...validInput, description: "" });
    expect(result.success).toBe(false);
  });

  it("rejects amounts above cap", () => {
    const result = createExpenseSchema.safeParse({ ...validInput, amount: 1_000_001 });
    expect(result.success).toBe(false);
  });
});

describe("updateExpenseSchema", () => {
  it("requires an id", () => {
    const result = updateExpenseSchema.safeParse({ title: "x" });
    expect(result.success).toBe(false);
  });

  it("accepts partial updates with id", () => {
    const result = updateExpenseSchema.safeParse({ id: "abc", description: "New" });
    expect(result.success).toBe(true);
  });
});
