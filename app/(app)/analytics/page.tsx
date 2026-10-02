"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { useExpensesQuery } from "@/lib/queries/expenses";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/types/expense";
import MonthlyBarChart from "@/components/analytics/MonthlyBarChart";
import CategoryPieChart from "@/components/analytics/CategoryPieChart";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Calendar,
  TrendingUp,
  PieChart,
  BarChart3,
  Clock,
  Wallet,
  Download,
  RefreshCw,
  Sparkles,
  MapPin,
  TrendingDown,
} from "lucide-react";
import { eachDayOfInterval, format } from "date-fns";
import { ScaleIn } from "@/components/ui/page-transition";
import { motion } from "framer-motion";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon } from "@/components/expenses/CategoryIcon";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { InsightList } from "@/components/insights/InsightList";
import { useLogger } from "@/lib/hooks/useLogger";
import { useDateRange } from "@/lib/hooks/useDateRange";
import { elapsedDays, filterByRange, isDaily, percentChange, sumByBucket } from "@/lib/dateRange";
import { computeInsights, Insight } from "@/lib/insights";
import { getExpenseGroup } from "@/lib/utils/expenseGrouping";
import { exportExpensesToCSV } from "@/lib/utils/exportData";
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover shadow-lift rounded-2xl border px-3 py-2">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <p className="text-sm font-bold tabular-nums">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

const TABS = ["insights", "trends", "categories", "patterns"] as const;
type Tab = (typeof TABS)[number];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function categoryLabel(value: string) {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label || value;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { logAction } = useLogger();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { range, prev, setRange } = useDateRange();

  const expensesQuery = useExpensesQuery(user?.uid);
  const expenses = useMemo(() => expensesQuery.data ?? [], [expensesQuery.data]);
  const loading = expensesQuery.isLoading;

  const rawTab = params.get("tab");
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "insights";
  const setTab = (next: string) => {
    const sp = new URLSearchParams(params.toString());
    if (next === "insights") sp.delete("tab");
    else sp.set("tab", next);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (!user) return;
    logAction("page_visited", {
      page: "analytics",
      timestamp: new Date().toISOString(),
    });
  }, [user, logAction]);

  const insights = useMemo(() => computeInsights(expenses, range, prev), [expenses, range, prev]);

  const analytics = useMemo(() => {
    const current = filterByRange(expenses, range);
    const previous = filterByRange(expenses, prev);
    if (current.length === 0) return null;

    const total = current.reduce((sum, e) => sum + e.amount, 0);
    const previousTotal = previous.reduce((sum, e) => sum + e.amount, 0);
    const days = elapsedDays(range);

    const sumBy = (list: typeof current, key: (e: (typeof current)[number]) => string) => {
      const totals = new Map<string, number>();
      for (const e of list) totals.set(key(e), (totals.get(key(e)) ?? 0) + e.amount);
      return totals;
    };

    const byCategory = sumBy(current, (e) => e.category);
    const prevByCategory = sumBy(previous, (e) => e.category);
    const categories = [...byCategory.entries()]
      .map(([category, amount]) => ({
        category,
        amount,
        share: (amount / total) * 100,
        change: percentChange(amount, prevByCategory.get(category) ?? 0),
      }))
      .sort((a, b) => b.amount - a.amount);

    const byMethod = sumBy(current, (e) => e.paymentMethod ?? "unspecified");
    const payments = [...byMethod.entries()]
      .map(([method, amount]) => ({
        name: PAYMENT_METHODS.find((m) => m.value === method)?.label ?? "Unspecified",
        value: amount,
        originalValue: amount,
      }))
      .sort((a, b) => b.value - a.value);

    const places = new Map<string, { label: string; amount: number; count: number }>();
    for (const e of current) {
      const g = getExpenseGroup(e);
      if (!g?.key.startsWith("loc:")) continue;
      const entry = places.get(g.key) ?? { label: g.label, amount: 0, count: 0 };
      entry.amount += e.amount;
      entry.count += 1;
      places.set(g.key, entry);
    }

    const until = new Date() < range.end ? new Date() : range.end;
    const spentDays = new Set(current.map((e) => format(e.date, "yyyy-MM-dd")));
    const noSpendDays =
      until >= range.start
        ? eachDayOfInterval({ start: range.start, end: until }).filter(
            (d) => !spentDays.has(format(d, "yyyy-MM-dd")),
          ).length
        : 0;

    const sorted = [...current].sort((a, b) => b.amount - a.amount);

    return {
      total,
      previousTotal,
      count: current.length,
      growth: percentChange(total, previousTotal),
      perDay: total / days,
      days,
      averageTransaction: total / current.length,
      highest: sorted[0],
      lowest: sorted[sorted.length - 1],
      noSpendDays,
      categories,
      distribution: categories.map((c) => ({
        name: categoryLabel(c.category),
        value: c.amount,
        originalValue: c.amount,
      })),
      payments,
      topPlaces: [...places.values()].sort((a, b) => b.amount - a.amount).slice(0, 5),
      trend: sumByBucket(current, range),
      weekly: WEEKDAYS.map((day, index) => ({
        day,
        amount: current.filter((e) => e.date.getDay() === index).reduce((s, e) => s + e.amount, 0),
      })),
      expenses: current,
    };
  }, [expenses, range, prev]);

  const grouped = useMemo(() => {
    const order: { tone: Insight["tone"]; title: string }[] = [
      { tone: "warn", title: "Needs attention" },
      { tone: "good", title: "Going well" },
      { tone: "info", title: "Good to know" },
    ];
    return order
      .map((g) => ({ ...g, items: insights.filter((i) => i.tone === g.tone) }))
      .filter((g) => g.items.length > 0);
  }, [insights]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 lg:px-8 lg:py-2">
      <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-muted-foreground text-sm">
          Showing <span className="text-foreground font-semibold">{range.label}</span>, compared
          with {prev.label === "Previous period" ? "the previous period" : prev.label}.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker range={range} onChange={setRange} />
          <Button
            onClick={() => expensesQuery.refetch()}
            variant="ghost"
            size="icon"
            disabled={expensesQuery.isFetching}
            aria-label="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", expensesQuery.isFetching && "animate-spin")} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!analytics}
            onClick={() =>
              analytics &&
              exportExpensesToCSV(
                analytics.expenses,
                `expenses-${format(range.start, "yyyy-MM-dd")}-to-${format(range.end, "yyyy-MM-dd")}.csv`,
              )
            }
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-3xl" />
            ))}
          </div>
          <Skeleton className="h-[420px] rounded-3xl" />
        </div>
      ) : !analytics ? (
        <EmptyState
          variant="card"
          icon={<BarChart3 />}
          image="/illustrations/empty-chart.png"
          title={expenses.length === 0 ? "No data yet" : "Nothing spent in this period"}
          description={
            expenses.length === 0
              ? "Add your first expense to unlock trends, category breakdowns, and spending insights."
              : "Pick a different date range to see your trends."
          }
          actionLabel={expenses.length === 0 ? "Add your first expense" : "Show this month"}
          onAction={() =>
            expenses.length === 0 ? router.push("/expenses?add=true") : setRange("thisMonth")
          }
        />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <ScaleIn delay={0.05}>
              <StatCard
                label="Spent"
                icon={Calendar}
                value={<AnimatedNumber value={analytics.total} />}
                hint={
                  <span>
                    {analytics.count} expenses · {range.label}
                  </span>
                }
              />
            </ScaleIn>
            <ScaleIn delay={0.1}>
              <StatCard
                label="vs previous"
                icon={TrendingUp}
                tone="bg-highlight/40 text-highlight-foreground"
                value={
                  <span className="tabular-nums">
                    {analytics.growth === null
                      ? "—"
                      : `${analytics.growth > 0 ? "+" : ""}${analytics.growth.toFixed(1)}%`}
                  </span>
                }
                trend={
                  analytics.growth
                    ? { value: Math.abs(analytics.growth), isPositive: analytics.growth < 0 }
                    : undefined
                }
                hint={<span>from {formatCurrency(analytics.previousTotal)}</span>}
              />
            </ScaleIn>
            <ScaleIn delay={0.15}>
              <StatCard
                label="Daily average"
                icon={Clock}
                tone="bg-violet-500/12 text-violet-600 dark:text-violet-300"
                value={<AnimatedNumber value={analytics.perDay} />}
                hint={<span>Over {analytics.days} days</span>}
              />
            </ScaleIn>
            <ScaleIn delay={0.2}>
              <StatCard
                label="Avg transaction"
                icon={Wallet}
                tone="bg-orange-500/12 text-orange-600 dark:text-orange-300"
                value={<AnimatedNumber value={analytics.averageTransaction} />}
                hint={<span>{analytics.noSpendDays} no-spend days</span>}
              />
            </ScaleIn>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="space-y-5">
            <TabsList className="grid h-auto w-full grid-cols-4 sm:inline-grid sm:w-auto">
              <TabsTrigger value="insights" className="px-3 py-2 sm:px-4">
                <Sparkles className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Insights</span>
              </TabsTrigger>
              <TabsTrigger value="trends" className="px-3 py-2 sm:px-4">
                <TrendingUp className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Trends</span>
              </TabsTrigger>
              <TabsTrigger value="categories" className="px-3 py-2 sm:px-4">
                <PieChart className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Categories</span>
              </TabsTrigger>
              <TabsTrigger value="patterns" className="px-3 py-2 sm:px-4">
                <BarChart3 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Patterns</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="insights" className="space-y-6">
              {grouped.length === 0 ? (
                <InsightList insights={[]} />
              ) : (
                grouped.map((group) => (
                  <section key={group.tone}>
                    <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
                      {group.title}
                    </h3>
                    <InsightList insights={group.items} columns={3} />
                  </section>
                ))
              )}
            </TabsContent>

            <TabsContent value="trends" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Spending trend</CardTitle>
                    <CardDescription>
                      {isDaily(range) ? "Daily" : "Monthly"} spending · {range.label}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[360px]">
                    <MonthlyBarChart data={analytics.trend} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Weekly pattern</CardTitle>
                    <CardDescription>Your spending by day of the week.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[360px]">
                    <div className="text-muted-foreground h-full w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analytics.weekly}
                          layout="vertical"
                          margin={{ left: -8, right: 8 }}
                        >
                          <defs>
                            <linearGradient id="weekly-bar" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#10B981" stopOpacity={0.55} />
                              <stop offset="100%" stopColor="#A3E635" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="4 6"
                            horizontal={false}
                            stroke="currentColor"
                            strokeOpacity={0.15}
                          />
                          <XAxis
                            type="number"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "currentColor", fontSize: 11 }}
                            tickFormatter={(value) =>
                              formatCurrency(value, { notation: "compact" })
                            }
                          />
                          <YAxis
                            type="category"
                            dataKey="day"
                            width={48}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "currentColor", fontSize: 12 }}
                          />
                          <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
                          />
                          <Bar
                            dataKey="amount"
                            fill="url(#weekly-bar)"
                            radius={[0, 10, 10, 0]}
                            maxBarSize={28}
                            animationDuration={900}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="categories" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-5">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Category distribution</CardTitle>
                    <CardDescription>{range.label}</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[360px]">
                    <CategoryPieChart data={analytics.distribution} />
                  </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="text-base">All categories</CardTitle>
                    <CardDescription>
                      Share of spending and change vs the previous period.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analytics.categories.map((cat, i) => (
                      <div key={cat.category} className="flex items-center gap-3">
                        <CategoryIcon category={cat.category} className="h-10 w-10 rounded-xl" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-semibold">
                              {categoryLabel(cat.category)}
                            </span>
                            <span className="flex items-baseline gap-2">
                              <ChangeChip change={cat.change} />
                              <span className="text-sm font-bold tabular-nums">
                                {formatCurrency(cat.amount)}
                              </span>
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                              <motion.div
                                className="bg-primary h-full rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(cat.share, 100)}%` }}
                                transition={{
                                  duration: 0.9,
                                  delay: 0.1 + i * 0.06,
                                  ease: "easeOut",
                                }}
                              />
                            </div>
                            <span className="text-muted-foreground w-10 text-right text-xs tabular-nums">
                              {cat.share.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="patterns" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Expense range</CardTitle>
                    <CardDescription>Smallest to largest in this period.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "Highest", e: analytics.highest },
                      { label: "Lowest", e: analytics.lowest },
                    ].map(({ label, e }) => (
                      <div key={label} className="bg-muted/60 rounded-2xl p-4">
                        <div className="text-muted-foreground text-xs">{label}</div>
                        <div className="mt-1 text-xl font-bold tabular-nums">
                          {formatCurrency(e.amount)}
                        </div>
                        <div className="text-muted-foreground mt-1 truncate text-xs">
                          {e.description} · {format(e.date, "d MMM")}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Payment methods</CardTitle>
                    <CardDescription>How you paid in this period.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <CategoryPieChart data={analytics.payments} />
                  </CardContent>
                </Card>

                <Card className="md:col-span-2 lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-base">Top places</CardTitle>
                    <CardDescription>Where your money went most.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.topPlaces.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        Add a location to your expenses to see your top places.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {analytics.topPlaces.map((place) => (
                          <li
                            key={place.label}
                            className="bg-muted/40 flex items-center gap-3 rounded-2xl p-3"
                          >
                            <span className="bg-primary/12 text-primary inline-flex h-9 w-9 items-center justify-center rounded-xl">
                              <MapPin className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{place.label}</p>
                              <p className="text-muted-foreground text-xs">
                                {place.count} visit{place.count === 1 ? "" : "s"}
                              </p>
                            </div>
                            <span className="text-sm font-bold tabular-nums">
                              {formatCurrency(place.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function ChangeChip({ change }: { change: number | null }) {
  if (change === null) {
    return <span className="text-muted-foreground text-[11px] font-semibold">new</span>;
  }
  if (Math.abs(change) < 1) return null;
  const up = change > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums",
        up ? "text-destructive" : "text-success",
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(change).toFixed(0)}%
    </span>
  );
}
