import {
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";
import { ExpenseType } from "@/types/expense";

export const RANGE_PRESETS = [
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "last3Months", label: "Last 3 months" },
  { value: "thisYear", label: "This year" },
  { value: "custom", label: "Custom" },
] as const;

export type RangePreset = (typeof RANGE_PRESETS)[number]["value"];

export interface DateRange {
  preset: RangePreset;
  start: Date;
  end: Date;
  label: string;
}

export function isRangePreset(value: string | null | undefined): value is RangePreset {
  return RANGE_PRESETS.some((p) => p.value === value);
}

function parseDay(value?: string | null): Date | null {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
}

/** Turns a preset (plus `from`/`to` as yyyy-MM-dd for "custom") into concrete dates. */
export function resolveRange(
  preset: RangePreset,
  from?: string | null,
  to?: string | null,
  now: Date = new Date(),
): DateRange {
  switch (preset) {
    case "lastMonth": {
      const m = subMonths(now, 1);
      return { preset, start: startOfMonth(m), end: endOfMonth(m), label: format(m, "MMMM yyyy") };
    }
    case "last3Months":
      return {
        preset,
        start: startOfMonth(subMonths(now, 2)),
        end: endOfMonth(now),
        label: "Last 3 months",
      };
    case "thisYear":
      return { preset, start: startOfYear(now), end: endOfYear(now), label: format(now, "yyyy") };
    case "custom": {
      const a = parseDay(from);
      const b = parseDay(to) ?? a;
      if (a && b) {
        const [s, e] = a <= b ? [a, b] : [b, a];
        return {
          preset,
          start: startOfDay(s),
          end: endOfDay(e),
          label: `${format(s, "d MMM")} – ${format(e, "d MMM yyyy")}`,
        };
      }
      return resolveRange("thisMonth", null, null, now);
    }
    case "thisMonth":
    default:
      return {
        preset: "thisMonth",
        start: startOfMonth(now),
        end: endOfMonth(now),
        label: "This month",
      };
  }
}

/** The period of the same length that ends right before `range` starts. */
export function previousRange(range: DateRange): DateRange {
  // Month-aligned presets compare against whole calendar months.
  if (range.preset === "thisMonth" || range.preset === "lastMonth") {
    const m = subMonths(range.start, 1);
    return { ...range, start: startOfMonth(m), end: endOfMonth(m), label: format(m, "MMMM") };
  }
  if (range.preset === "last3Months") {
    const start = startOfMonth(subMonths(range.start, 3));
    return {
      ...range,
      start,
      end: endOfMonth(subMonths(range.start, 1)),
      label: "Previous 3 months",
    };
  }
  if (range.preset === "thisYear") {
    const start = startOfYear(subMonths(range.start, 12));
    return { ...range, start, end: endOfYear(start), label: format(start, "yyyy") };
  }
  const days = differenceInCalendarDays(range.end, range.start) + 1;
  const end = endOfDay(subDays(range.start, 1));
  return { ...range, start: startOfDay(subDays(end, days - 1)), end, label: "Previous period" };
}

export function inRange(date: Date, range: Pick<DateRange, "start" | "end">): boolean {
  return date >= range.start && date <= range.end;
}

export function filterByRange<T extends { date: Date }>(items: T[], range: DateRange): T[] {
  return items.filter((e) => inRange(e.date, range));
}

export interface Bucket {
  name: string;
  start: Date;
  end: Date;
}

export function rangeDays(range: Pick<DateRange, "start" | "end">): number {
  return differenceInCalendarDays(range.end, range.start) + 1;
}

/** Charts use daily buckets for ranges up to 62 days, monthly buckets otherwise. */
export function isDaily(range: DateRange): boolean {
  return rangeDays(range) <= 62;
}

export function bucketsFor(range: DateRange): Bucket[] {
  const days = rangeDays(range);
  if (isDaily(range)) {
    return eachDayOfInterval({ start: range.start, end: range.end }).map((d) => ({
      name: format(d, days <= 7 ? "EEE" : "d MMM"),
      start: startOfDay(d),
      end: endOfDay(d),
    }));
  }
  return eachMonthOfInterval({ start: range.start, end: range.end }).map((m) => ({
    name: format(m, days > 400 ? "MMM yy" : "MMM"),
    start: startOfMonth(m),
    end: endOfMonth(m),
  }));
}

export function sumByBucket(
  expenses: Pick<ExpenseType, "date" | "amount">[],
  range: DateRange,
): { name: string; amount: number }[] {
  return bucketsFor(range).map((b) => ({
    name: b.name,
    amount: expenses.reduce((sum, e) => (inRange(e.date, b) ? sum + e.amount : sum), 0),
  }));
}

/** Number of days of `range` that have already happened (at least 1). */
export function elapsedDays(range: DateRange, now: Date = new Date()): number {
  const until = now < range.end ? now : range.end;
  return Math.max(1, differenceInCalendarDays(until, range.start) + 1);
}

export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}
