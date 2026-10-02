import { describe, it, expect } from "vitest";
import { dueOccurrences, nextOccurrence, occurrenceId } from "./recurringSchedule";

describe("nextOccurrence", () => {
  it("clamps monthly rules on the 31st and returns to the anchor day", () => {
    const feb = nextOccurrence(new Date(2026, 0, 31), "monthly", 31);
    expect(feb).toEqual(new Date(2026, 1, 28));
    expect(nextOccurrence(feb, "monthly", 31)).toEqual(new Date(2026, 2, 31));
  });

  it("adds a week for weekly rules", () => {
    expect(nextOccurrence(new Date(2026, 9, 1), "weekly")).toEqual(new Date(2026, 9, 8));
  });
});

describe("dueOccurrences", () => {
  it("lists every missed date up to today and the next due date", () => {
    const start = new Date(2026, 8, 10);
    const { dates, nextDue } = dueOccurrences(
      { nextDue: start, startDate: start, frequency: "weekly" },
      new Date(2026, 9, 1, 15),
    );
    expect(dates.map((d) => d.getDate())).toEqual([10, 17, 24, 1]);
    expect(nextDue).toEqual(new Date(2026, 9, 8));
  });

  it("returns nothing when not yet due and caps long gaps", () => {
    const future = new Date(2026, 11, 1);
    expect(
      dueOccurrences(
        { nextDue: future, startDate: future, frequency: "monthly" },
        new Date(2026, 9, 1),
      ).dates,
    ).toHaveLength(0);
    const old = new Date(2020, 0, 1);
    expect(
      dueOccurrences({ nextDue: old, startDate: old, frequency: "weekly" }, new Date(2026, 9, 1))
        .dates,
    ).toHaveLength(12);
  });
});

it("occurrenceId is deterministic per rule and day", () => {
  expect(occurrenceId("abc", new Date(2026, 9, 1, 18))).toBe("rec_abc_20261001");
});
