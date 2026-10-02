import {
  addMonths,
  addWeeks,
  format,
  getDate,
  setDate,
  getDaysInMonth,
  startOfDay,
} from "date-fns";

export type RecurringFrequency = "weekly" | "monthly";

export const RECURRING_FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

/** Upper bound of expenses one rule may create in a single catch-up run. */
export const MAX_OCCURRENCES_PER_RUN = 12;

/**
 * The occurrence after `from`. Monthly rules keep the rule's original day of month
 * (`anchorDay`), clamped to the last day of shorter months — so a rule on the 31st
 * runs on 30 Apr, 28 Feb, then back to 31 May.
 */
export function nextOccurrence(
  from: Date,
  frequency: RecurringFrequency,
  anchorDay: number = getDate(from),
): Date {
  if (frequency === "weekly") return addWeeks(startOfDay(from), 1);
  const next = addMonths(startOfDay(from), 1);
  return setDate(next, Math.min(anchorDay, getDaysInMonth(next)));
}

/**
 * Every due date from `nextDue` up to and including today, oldest first,
 * plus the `nextDue` the rule should have after they are created.
 */
export function dueOccurrences(
  rule: { nextDue: Date; frequency: RecurringFrequency; startDate: Date },
  now: Date = new Date(),
  max: number = MAX_OCCURRENCES_PER_RUN,
): { dates: Date[]; nextDue: Date } {
  const anchorDay = getDate(rule.startDate);
  const today = startOfDay(now);
  const dates: Date[] = [];
  let cursor = startOfDay(rule.nextDue);
  while (cursor <= today && dates.length < max) {
    dates.push(cursor);
    cursor = nextOccurrence(cursor, rule.frequency, anchorDay);
  }
  return { dates, nextDue: cursor };
}

/** Deterministic expense id for one occurrence, so re-runs never create duplicates. */
export function occurrenceId(ruleId: string, date: Date): string {
  return `rec_${ruleId}_${format(date, "yyyyMMdd")}`;
}
