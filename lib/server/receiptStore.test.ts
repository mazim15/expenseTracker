import { describe, it, expect } from "vitest";
import { ownsReceiptPath } from "./receiptStore";

const UUID = "123e4567-e89b-42d3-a456-426614174000";

describe("ownsReceiptPath", () => {
  it("accepts the user's own receipt", () => {
    expect(ownsReceiptPath("user1", `receipts/user1/${UUID}.jpg`)).toBe(true);
  });

  it("rejects another user's receipt", () => {
    expect(ownsReceiptPath("user1", `receipts/user2/${UUID}.jpg`)).toBe(false);
  });

  it("rejects path tricks and other files", () => {
    expect(ownsReceiptPath("user1", `receipts/user1/../user2/${UUID}.jpg`)).toBe(false);
    expect(ownsReceiptPath("user1", `receipts/user1/${UUID}.jpg/../x`)).toBe(false);
    expect(ownsReceiptPath("user1", "receipts/user1/")).toBe(false);
    expect(ownsReceiptPath("user1", "")).toBe(false);
  });
});
