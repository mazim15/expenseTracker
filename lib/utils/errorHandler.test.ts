import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

import { toast } from "sonner";
import { AppError, getErrorMessage, handleError, withErrorHandling } from "./errorHandler";

describe("getErrorMessage", () => {
  it("returns userMessage for AppError when provided", () => {
    const err = new AppError("internal", "some-code", "error", "friendly");
    expect(getErrorMessage(err)).toBe("friendly");
  });

  it("maps Firebase error codes to friendly messages", () => {
    const err = Object.assign(new Error("raw"), { code: "permission-denied" });
    expect(getErrorMessage(err)).toMatch(/permission/i);
  });

  it("falls back to error.message for generic Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns the string itself for string errors", () => {
    expect(getErrorMessage("oops")).toBe("oops");
  });

  it("has a default for unknown types", () => {
    expect(getErrorMessage(42)).toMatch(/unexpected/i);
  });
});

describe("handleError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches to toast.error by default", () => {
    handleError(new Error("boom"), "test");
    expect(toast.error).toHaveBeenCalledWith("boom");
  });

  it("respects AppError severity (warning)", () => {
    handleError(new AppError("careful", undefined, "warning"), "test");
    expect(toast.warning).toHaveBeenCalledWith("careful");
  });
});

describe("withErrorHandling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the result on success", async () => {
    const result = await withErrorHandling(async () => 7, "test");
    expect(result).toBe(7);
  });

  it("returns null and reports on failure", async () => {
    const result = await withErrorHandling(async () => {
      throw new Error("nope");
    }, "test");
    expect(result).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("nope");
  });
});
