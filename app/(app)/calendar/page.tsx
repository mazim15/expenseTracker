"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, ChevronDown, Wallet, Flame, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useExpensesQuery } from "@/lib/queries/expenses";
import { ExpenseType, EXPENSE_CATEGORIES } from "@/types/expense";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { CategoryIcon } from "@/components/expenses/CategoryIcon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Intensity buckets: level 5 = highest spend day (darkest), level 1 = lightest.
const LEVEL_ALPHA = [0, 0.16, 0.34, 0.52, 0.72, 0.94];

// Solid accent per category — used for dots and the breakdown bar.
const CATEGORY_DOT: Record<string, string> = {
  food: "bg-orange-500",
  housing: "bg-blue-500",
  transportation: "bg-green-500",
  utilities: "bg-purple-500",
  entertainment: "bg-pink-500",
  healthcare: "bg-red-500",
  shopping: "bg-yellow-500",
  education: "bg-indigo-500",
  personal: "bg-cyan-500",
  other: "bg-gray-400",
};

function dotColor(category: string): string {
  return CATEGORY_DOT[category] ?? CATEGORY_DOT.other;
}

function categoryLabel(category: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

/** Compact number for tiles: 1234 -> 1.2k, 1_250_000 -> 1.3M */
function compact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + "k";
  return String(Math.round(n));
}

type DayData = { total: number; expenses: ExpenseType[]; level: number };

export default function CalendarPage() {
  const { user } = useAuth();
  const expensesQuery = useExpensesQuery(user?.uid);
  const allExpenses = useMemo(() => expensesQuery.data ?? [], [expensesQuery.data]);
  const loading = expensesQuery.isLoading;

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);

  const { days, byDay, monthTotal, monthCount, busiestDay, avgPerActiveDay } = useMemo(() => {
    const map = new Map<string, DayData>();

    // Bucket every expense that falls inside the visible month.
    for (const exp of allExpenses) {
      if (!isSameMonth(exp.date, monthStart)) continue;
      const key = format(exp.date, "yyyy-MM-dd");
      const entry = map.get(key) ?? { total: 0, expenses: [], level: 0 };
      entry.total += exp.amount;
      entry.expenses.push(exp);
      map.set(key, entry);
    }

    const totals = Array.from(map.values()).map((d) => d.total);
    const max = totals.length ? Math.max(...totals) : 0;

    // Assign a heatmap level relative to the busiest day of the month.
    for (const entry of map.values()) {
      entry.level = max > 0 ? Math.min(5, Math.max(1, Math.ceil((entry.total / max) * 5))) : 0;
      entry.expenses.sort((a, b) => b.amount - a.amount);
    }

    const gridDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const total = totals.reduce((s, t) => s + t, 0);
    const count = Array.from(map.values()).reduce((s, d) => s + d.expenses.length, 0);

    let busiest: { date: string; total: number } | null = null;
    for (const [key, d] of map) {
      if (!busiest || d.total > busiest.total) busiest = { date: key, total: d.total };
    }

    return {
      days: gridDays,
      byDay: map,
      monthTotal: total,
      monthCount: count,
      busiestDay: busiest,
      avgPerActiveDay: map.size ? total / map.size : 0,
    };
  }, [allExpenses, monthStart, monthEnd]);

  // Months (across all years) that have any spending — powers the picker dots.
  const activeMonths = useMemo(() => {
    const set = new Set<string>();
    for (const exp of allExpenses) set.add(format(exp.date, "yyyy-MM"));
    return set;
  }, [allExpenses]);

  const leadingBlanks = monthStart.getDay(); // 0 = Sunday

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 lg:px-8 lg:py-2">
      <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-muted-foreground text-sm">
          Your spending across the month — darker means a heavier day.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCursor(startOfMonth(new Date()))}>
            Today
          </Button>
          <div className="bg-card shadow-soft flex items-center rounded-full p-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-full p-0"
              onClick={() => setCursor((c) => subMonths(c, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <MonthPicker value={cursor} onChange={setCursor} activeMonths={activeMonths} />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-full p-0"
              onClick={() => setCursor((c) => addMonths(c, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3 lg:gap-4">
        <StatCard
          label="Month total"
          icon={Wallet}
          value={<AnimatedNumber value={monthTotal} />}
          hint={<span>{monthCount} expenses</span>}
        />
        <StatCard
          label="Busiest day"
          icon={Flame}
          tone="bg-orange-500/12 text-orange-600 dark:text-orange-300"
          value={
            busiestDay ? (
              <AnimatedNumber value={busiestDay.total} />
            ) : (
              <span className="text-muted-foreground text-base font-normal">—</span>
            )
          }
          hint={
            <span>
              {busiestDay ? format(new Date(busiestDay.date), "EEE, MMM d") : "No spending"}
            </span>
          }
        />
        <StatCard
          label="Avg / active day"
          icon={TrendingUp}
          tone="bg-highlight/40 text-highlight-foreground"
          value={<AnimatedNumber value={avgPerActiveDay} />}
          hint={<span>Days with spending</span>}
        />
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          {loading ? (
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="aspect-square rounded-2xl sm:aspect-auto sm:h-[92px]"
                />
              ))}
            </div>
          ) : (
            <>
              <div className="mb-2 grid grid-cols-7 gap-1.5 sm:gap-2">
                {WEEKDAYS.map((d) => (
                  <div
                    key={d}
                    className="text-muted-foreground py-1 text-center text-xs font-medium tracking-wide uppercase"
                  >
                    <span className="hidden sm:inline">{d}</span>
                    <span className="sm:hidden">{d[0]}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {Array.from({ length: leadingBlanks }).map((_, i) => (
                  <div
                    key={`blank-${i}`}
                    className="aspect-square sm:aspect-auto sm:min-h-[92px]"
                  />
                ))}

                {days.map((day, dayIndex) => {
                  const key = format(day, "yyyy-MM-dd");
                  const data = byDay.get(key);
                  const level = data?.level ?? 0;
                  const today = isToday(day);

                  const tile = (
                    <div
                      style={{
                        animationDelay: `${dayIndex * 12}ms`,
                        ...(level > 0
                          ? {
                              backgroundColor: `color-mix(in oklab, var(--primary) ${
                                LEVEL_ALPHA[level] * 100
                              }%, transparent)`,
                            }
                          : {}),
                      }}
                      className={cn(
                        "group animate-scale-in relative flex aspect-square flex-col rounded-2xl p-2 text-left transition-all duration-200 sm:aspect-auto sm:min-h-[92px]",
                        level === 0 && "bg-muted/40",
                        level > 0 &&
                          "hover:shadow-lift cursor-pointer hover:z-10 hover:-translate-y-0.5 hover:scale-[1.04]",
                        level >= 4 && "text-primary-foreground",
                        today && "ring-primary ring-offset-background ring-2 ring-offset-1",
                      )}
                    >
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          level === 0 && "text-muted-foreground",
                          today && level === 0 && "text-primary",
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      {data && (
                        <span
                          className={cn(
                            "mt-auto text-sm font-semibold tabular-nums sm:text-base",
                            level < 4 && "text-foreground",
                          )}
                        >
                          {compact(data.total)}
                        </span>
                      )}
                      {data && (
                        <span
                          className={cn(
                            "text-[10px] leading-none tabular-nums",
                            level >= 4 ? "text-primary-foreground/70" : "text-muted-foreground",
                          )}
                        >
                          {data.expenses.length} item{data.expenses.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  );

                  if (!data) {
                    return <div key={key}>{tile}</div>;
                  }

                  return (
                    <Popover key={key}>
                      <PopoverTrigger asChild>
                        <button type="button" className="block w-full">
                          {tile}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="center"
                        sideOffset={8}
                        className="w-[19rem] overflow-hidden rounded-3xl border-0 p-0"
                      >
                        <DayDetail day={day} data={data} />
                      </PopoverContent>
                    </Popover>
                  );
                })}
              </div>

              {/* Heatmap legend */}
              <div className="mt-4 flex items-center justify-end gap-2 pr-1">
                <span className="text-muted-foreground text-xs">Less</span>
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <span
                    key={lvl}
                    className="h-3.5 w-3.5 rounded-[4px] border"
                    style={{
                      backgroundColor: `color-mix(in oklab, var(--primary) ${
                        LEVEL_ALPHA[lvl] * 100
                      }%, transparent)`,
                      borderColor: "transparent",
                    }}
                  />
                ))}
                <span className="text-muted-foreground text-xs">More</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MonthPicker({
  value,
  onChange,
  activeMonths,
}: {
  value: Date;
  onChange: (d: Date) => void;
  activeMonths: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => value.getFullYear());
  const now = new Date();

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setYear(value.getFullYear());
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="hover:bg-muted flex h-8 min-w-[140px] items-center justify-center gap-1 rounded-full px-3 text-sm font-bold tabular-nums transition-colors"
        >
          {format(value, "MMMM yyyy")}
          <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" sideOffset={8} className="w-64 p-3">
        <div className="mb-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setYear((y) => y - 1)}
            aria-label="Previous year"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold tabular-nums">{year}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setYear((y) => y + 1)}
            aria-label="Next year"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {MONTHS_SHORT.map((label, i) => {
            const selected = value.getFullYear() === year && value.getMonth() === i;
            const isCurrent = now.getFullYear() === year && now.getMonth() === i;
            const hasSpending = activeMonths.has(`${year}-${String(i + 1).padStart(2, "0")}`);
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  onChange(new Date(year, i, 1));
                  setOpen(false);
                }}
                className={cn(
                  "relative rounded-full py-2 text-sm font-semibold transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-muted text-foreground",
                  !selected && isCurrent && "ring-primary/40 ring-1",
                )}
              >
                {label}
                {hasSpending && (
                  <span
                    className={cn(
                      "absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full",
                      selected ? "bg-primary-foreground" : "bg-primary",
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DayDetail({ day, data }: { day: Date; data: DayData }) {
  // Group the day's spending by category for the breakdown bar.
  const segments = useMemo(() => {
    const byCat = new Map<string, number>();
    for (const exp of data.expenses) {
      byCat.set(exp.category, (byCat.get(exp.category) ?? 0) + exp.amount);
    }
    return Array.from(byCat.entries())
      .map(([category, amount]) => ({ category, amount, pct: (amount / data.total) * 100 }))
      .sort((a, b) => b.amount - a.amount);
  }, [data]);

  return (
    <div>
      {/* Gradient header */}
      <div className="bg-hero relative overflow-hidden px-4 pt-3.5 pb-4">
        <div className="pointer-events-none absolute -top-8 -right-6 h-24 w-24 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -right-2 -bottom-10 h-20 w-20 rounded-full bg-white/10" />
        <div className="relative">
          <p className="text-[11px] font-medium tracking-wide text-white/80 uppercase">
            {format(day, "EEEE")}
          </p>
          <p className="text-sm font-semibold">{format(day, "MMMM d, yyyy")}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
            {formatCurrency(data.total)}
          </p>
          <p className="text-xs text-white/80">
            {data.expenses.length} expense{data.expenses.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Category breakdown bar */}
      <div className="px-4 pt-3">
        <div className="bg-muted flex h-2 overflow-hidden rounded-full">
          {segments.map((s) => (
            <div
              key={s.category}
              className={cn("h-full", dotColor(s.category))}
              style={{ width: `${s.pct}%` }}
              title={`${categoryLabel(s.category)} — ${formatCurrency(s.amount)}`}
            />
          ))}
        </div>
      </div>

      {/* Expense rows */}
      <div className="max-h-64 space-y-0.5 overflow-y-auto p-2">
        {data.expenses.map((exp) => (
          <div
            key={exp.id}
            className="hover:bg-muted flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors"
          >
            <CategoryIcon category={exp.category} className="h-9 w-9 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{exp.description}</p>
              <p className="text-muted-foreground truncate text-xs">
                {categoryLabel(exp.category)}
                {exp.location ? ` · ${exp.location}` : ""}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {formatCurrency(exp.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
