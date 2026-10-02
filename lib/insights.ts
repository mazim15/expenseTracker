import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDaysInMonth,
  isSameMonth,
  isWeekend,
} from "date-fns";
import { ExpenseType, PAYMENT_METHODS } from "@/types/expense";
import { DateRange, elapsedDays, filterByRange } from "@/lib/dateRange";
import { getExpenseGroup } from "@/lib/utils/expenseGrouping";
import { formatCurrency } from "@/lib/utils";

export type InsightTone = "good" | "warn" | "info";

export interface Insight {
  /** Stable per kind + subject, e.g. "category-up:food". Used to de-duplicate alerts. */
  id: string;
  tone: InsightTone;
  title: string;
  body: string;
  href?: string;
  /** Higher sorts first. */
  weight: number;
}

const MIN_CATEGORY_CHANGE = 0.25; // ±25%
const MIN_SHARE_OF_TOTAL = 0.05; // change must be ≥5% of the period total
const UNUSUAL_MULTIPLIER = 3;
const UNUSUAL_MIN_HISTORY = 5;
const BIG_SHARE = 0.4;

type Money = (n: number) => string;

function sumBy<T>(items: T[], key: (item: T) => string, value: (item: T) => number) {
  const totals = new Map<string, number>();
  for (const item of items) totals.set(key(item), (totals.get(key(item)) ?? 0) + value(item));
  return totals;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function label(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Plain-language observations about spending in `range` compared with `prevRange`.
 * `all` is every expense the user has (used for per-category history).
 */
export function computeInsights(
  all: ExpenseType[],
  range: DateRange,
  prevRange: DateRange,
  now: Date = new Date(),
  money: Money = (n) => formatCurrency(n),
): Insight[] {
  const current = filterByRange(all, range);
  const previous = filterByRange(all, prevRange);
  if (current.length === 0) return [];
  const total = current.reduce((s, e) => s + e.amount, 0);

  const insights: Insight[] = [];

  // 1. Category up/down vs previous period
  const nowByCat = sumBy(
    current,
    (e) => e.category,
    (e) => e.amount,
  );
  const prevByCat = sumBy(
    previous,
    (e) => e.category,
    (e) => e.amount,
  );
  for (const category of new Set([...nowByCat.keys(), ...prevByCat.keys()])) {
    const a = nowByCat.get(category) ?? 0;
    const b = prevByCat.get(category) ?? 0;
    if (b <= 0) continue;
    const change = (a - b) / b;
    if (Math.abs(change) < MIN_CATEGORY_CHANGE || Math.abs(a - b) < total * MIN_SHARE_OF_TOTAL)
      continue;
    const up = change > 0;
    insights.push({
      id: `category-${up ? "up" : "down"}:${category}`,
      tone: up ? "warn" : "good",
      title: `${label(category)} is ${up ? "up" : "down"} ${Math.round(Math.abs(change) * 100)}%`,
      body: `${money(a)} vs ${money(b)} in ${prevRange.label.toLowerCase() === "previous period" ? "the previous period" : prevRange.label}.`,
      href: `/expenses?category=${encodeURIComponent(category)}`,
      weight: (up ? 80 : 50) + Math.min(Math.abs(change) * 10, 15),
    });
  }

  // 2. Unusually large expense (vs that category's history before it)
  let unusual: { expense: ExpenseType; ratio: number } | null = null;
  for (const expense of current) {
    const history = all
      .filter(
        (e) => e.category === expense.category && e.id !== expense.id && e.date < expense.date,
      )
      .map((e) => e.amount);
    if (history.length < UNUSUAL_MIN_HISTORY) continue;
    const m = median(history);
    if (m <= 0) continue;
    const ratio = expense.amount / m;
    if (ratio >= UNUSUAL_MULTIPLIER && (!unusual || ratio > unusual.ratio)) {
      unusual = { expense, ratio };
    }
  }
  if (unusual) {
    const e = unusual.expense;
    insights.push({
      id: `unusual:${e.id}`,
      tone: "warn",
      title: `Unusually large ${e.category} expense`,
      body: `${e.description} (${money(e.amount)}) is ${unusual.ratio.toFixed(1)}× your usual ${e.category} spend.`,
      href: `/expenses?search=${encodeURIComponent(e.description)}`,
      weight: 90,
    });
  }

  // 3. Month-end projection (only meaningful mid-way through the current month)
  if (range.preset === "thisMonth" && isSameMonth(range.start, now)) {
    const sofar = elapsedDays(range, now);
    const daysInMonth = getDaysInMonth(now);
    if (sofar >= 3 && sofar < daysInMonth) {
      const projected = (total / sofar) * daysInMonth;
      const lastTotal = previous.reduce((s, e) => s + e.amount, 0);
      const over = lastTotal > 0 && projected > lastTotal * 1.1;
      insights.push({
        id: "projection",
        tone: over ? "warn" : "info",
        title: `On pace for ${money(projected)}`,
        body:
          lastTotal > 0
            ? `By ${format(endOfMonth(now), "d MMM")} at this rate — ${over ? "more" : "less"} than last month's ${money(lastTotal)}.`
            : `By ${format(endOfMonth(now), "d MMM")} if you keep spending at this rate.`,
        weight: over ? 85 : 40,
      });
    }
  }

  // 4. Top merchant / place
  const groups = new Map<string, { label: string; amount: number; count: number }>();
  for (const e of current) {
    const g = getExpenseGroup(e);
    if (!g || !g.key.startsWith("loc:")) continue;
    const entry = groups.get(g.key) ?? { label: g.label, amount: 0, count: 0 };
    entry.amount += e.amount;
    entry.count += 1;
    groups.set(g.key, entry);
  }
  const top = [...groups.values()].sort((a, b) => b.amount - a.amount)[0];
  if (top && top.count >= 2) {
    insights.push({
      id: `merchant:${top.label.toLowerCase()}`,
      tone: "info",
      title: `${top.label} is your top place`,
      body: `${top.count} visits, ${money(top.amount)} in total.`,
      href: `/expenses?search=${encodeURIComponent(top.label)}`,
      weight: 30,
    });
  }

  // 5. Busiest weekday
  if (current.length >= 7) {
    const byDay = sumBy(
      current,
      (e) => format(e.date, "EEEE"),
      (e) => e.amount,
    );
    const [day, amount] = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
    const share = amount / total;
    if (share >= 0.25) {
      insights.push({
        id: `weekday:${day.toLowerCase()}`,
        tone: "info",
        title: `${day}s cost you the most`,
        body: `${Math.round(share * 100)}% of spending in this period happened on a ${day}.`,
        weight: 20,
      });
    }
  }

  // 6. Average per day vs previous period
  const days = elapsedDays(range, now);
  const prevDays = differenceInCalendarDays(prevRange.end, prevRange.start) + 1;
  const prevTotal = previous.reduce((s, e) => s + e.amount, 0);
  const perDay = total / days;
  const prevPerDay = prevTotal / prevDays;
  if (prevPerDay > 0) {
    const change = (perDay - prevPerDay) / prevPerDay;
    if (Math.abs(change) >= 0.1) {
      const up = change > 0;
      insights.push({
        id: `daily-${up ? "up" : "down"}`,
        tone: up ? "warn" : "good",
        title: `${money(perDay)} a day on average`,
        body: `${Math.round(Math.abs(change) * 100)}% ${up ? "more" : "less"} than ${money(prevPerDay)} a day before.`,
        weight: up ? 60 : 55,
      });
    }
  }

  // 7. No-spend days
  const until = now < range.end ? now : range.end;
  if (until >= range.start) {
    const spentDays = new Set(current.map((e) => format(e.date, "yyyy-MM-dd")));
    const allDays = eachDayOfInterval({ start: range.start, end: until });
    const free = allDays.filter((d) => !spentDays.has(format(d, "yyyy-MM-dd"))).length;
    if (allDays.length >= 7 && free > 0) {
      insights.push({
        id: "no-spend-days",
        tone: "good",
        title: `${free} no-spend day${free === 1 ? "" : "s"}`,
        body: `Out of ${allDays.length} days so far in this period.`,
        weight: 25,
      });
    }
  }

  // 8. Weekend vs weekday
  if (current.length >= 7) {
    const weekend = current.filter((e) => isWeekend(e.date)).reduce((s, e) => s + e.amount, 0);
    const share = weekend / total;
    // Weekends are 2/7 ≈ 29% of days; call it out when clearly above that.
    if (share >= 0.45) {
      insights.push({
        id: "weekend-heavy",
        tone: "info",
        title: "Weekends are expensive",
        body: `${Math.round(share * 100)}% of spending happened on Saturdays and Sundays.`,
        weight: 35,
      });
    }
  }

  // 9. One category dominating
  const [topCat, topCatAmount] = [...nowByCat.entries()].sort((a, b) => b[1] - a[1])[0];
  if (nowByCat.size > 1 && topCatAmount / total >= BIG_SHARE) {
    insights.push({
      id: `big-share:${topCat}`,
      tone: "info",
      title: `${label(topCat)} is ${Math.round((topCatAmount / total) * 100)}% of spending`,
      body: `${money(topCatAmount)} of ${money(total)} in this period.`,
      href: `/expenses?category=${encodeURIComponent(topCat)}`,
      weight: 45,
    });
  }

  // 10. Recurring share
  const recurring = current.filter((e) => e.recurringId).reduce((s, e) => s + e.amount, 0);
  if (recurring > 0) {
    insights.push({
      id: "recurring-share",
      tone: "info",
      title: `${Math.round((recurring / total) * 100)}% goes to recurring bills`,
      body: `${money(recurring)} of fixed costs in this period.`,
      weight: 28,
    });
  }

  // 11. Payment method split
  const tagged = current.filter((e) => e.paymentMethod);
  if (tagged.length >= 5) {
    const byMethod = sumBy(
      tagged,
      (e) => e.paymentMethod!,
      (e) => e.amount,
    );
    const taggedTotal = tagged.reduce((s, e) => s + e.amount, 0);
    const [method, amount] = [...byMethod.entries()].sort((a, b) => b[1] - a[1])[0];
    const name = PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
    insights.push({
      id: `payment:${method}`,
      tone: "info",
      title: `Mostly paid by ${name.toLowerCase()}`,
      body: `${Math.round((amount / taggedTotal) * 100)}% of spending with a payment method set.`,
      weight: 15,
    });
  }

  // 12. New places
  const seenBefore = new Set(
    all
      .filter((e) => e.date < range.start)
      .map((e) => getExpenseGroup(e)?.key)
      .filter((k): k is string => !!k?.startsWith("loc:")),
  );
  const newPlaces = new Map<string, string>();
  for (const e of current) {
    const g = getExpenseGroup(e);
    if (g?.key.startsWith("loc:") && !seenBefore.has(g.key)) newPlaces.set(g.key, g.label);
  }
  if (seenBefore.size > 0 && newPlaces.size > 0) {
    const names = [...newPlaces.values()];
    insights.push({
      id: "new-places",
      tone: "info",
      title: `${names.length} new place${names.length === 1 ? "" : "s"}`,
      body: `First time spending at ${names.slice(0, 3).join(", ")}${names.length > 3 ? " and more" : ""}.`,
      weight: 18,
    });
  }

  // 13. Largest single expense
  const largest = current.reduce((max, e) => (e.amount > max.amount ? e : max), current[0]);
  if (current.length >= 3) {
    insights.push({
      id: `largest:${largest.id}`,
      tone: "info",
      title: `Biggest expense: ${money(largest.amount)}`,
      body: `${largest.description} on ${format(largest.date, "d MMM")} — ${Math.round((largest.amount / total) * 100)}% of the period.`,
      href: `/expenses?search=${encodeURIComponent(largest.description)}`,
      weight: 22,
    });
  }

  return insights.sort((a, b) => b.weight - a.weight);
}
