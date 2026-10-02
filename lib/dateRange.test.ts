import { describe, it, expect } from "vitest";
import { resolveRange, previousRange, bucketsFor, sumByBucket, percentChange } from "./dateRange";

const now = new Date(2026, 9, 15); // 15 Oct 2026

describe("resolveRange", () => {
  it("this month spans the whole calendar month", () => {
    const r = resolveRange("thisMonth", null, null, now);
    expect(r.start).toEqual(new Date(2026, 9, 1));
    expect(r.end.getDate()).toBe(31);
  });

  it("custom range swaps reversed dates and falls back when invalid", () => {
    const r = resolveRange("custom", "2026-10-10", "2026-10-01", now);
    expect(r.start).toEqual(new Date(2026, 9, 1));
    expect(r.end.getDate()).toBe(10);
    expect(resolveRange("custom", "nope", null, now).preset).toBe("thisMonth");
  });
});

describe("previousRange", () => {
  it("compares this month with last calendar month", () => {
    const p = previousRange(resolveRange("thisMonth", null, null, now));
    expect(p.start).toEqual(new Date(2026, 8, 1));
    expect(p.end.getDate()).toBe(30);
  });

  it("custom ranges get an equal-length period right before", () => {
    const p = previousRange(resolveRange("custom", "2026-10-08", "2026-10-14", now));
    expect(p.start).toEqual(new Date(2026, 9, 1));
    expect(p.end.getDate()).toBe(7);
  });
});

describe("buckets", () => {
  it("uses days for a month and months for a year", () => {
    expect(bucketsFor(resolveRange("thisMonth", null, null, now))).toHaveLength(31);
    expect(bucketsFor(resolveRange("thisYear", null, null, now))).toHaveLength(12);
  });

  it("sums amounts into the right bucket", () => {
    const r = resolveRange("thisYear", null, null, now);
    const data = sumByBucket(
      [
        { date: new Date(2026, 0, 5), amount: 10 },
        { date: new Date(2026, 0, 20), amount: 5 },
        { date: new Date(2026, 2, 1), amount: 7 },
      ],
      r,
    );
    expect(data[0].amount).toBe(15);
    expect(data[2].amount).toBe(7);
  });
});

it("percentChange returns null without a baseline", () => {
  expect(percentChange(50, 0)).toBeNull();
  expect(percentChange(150, 100)).toBe(50);
});
