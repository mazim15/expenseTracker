"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  useExpensesQuery,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
} from "@/lib/queries/expenses";
import { formatCurrency } from "@/lib/utils";
import { ExpenseType, EXPENSE_CATEGORIES } from "@/types/expense";
import { handleError, showSuccessMessage } from "@/lib/utils/errorHandler";
import { useLogger } from "@/lib/hooks/useLogger";
import { useDateRange } from "@/lib/hooks/useDateRange";
import { elapsedDays, filterByRange, isDaily, percentChange, sumByBucket } from "@/lib/dateRange";
import { computeInsights } from "@/lib/insights";
import { useRecurringQuery } from "@/lib/queries/recurring";
import { format, formatDistanceToNowStrict, isToday } from "date-fns";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { InsightList } from "@/components/insights/InsightList";

import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { fadeUp, stagger } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { EmptyState } from "@/components/ui/empty-state";
import { CategoryIcon } from "@/components/expenses/CategoryIcon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import ExpenseList from "@/components/expenses/ExpenseList";
import DeleteConfirmDialog from "@/components/expenses/DeleteConfirmDialog";
import MonthlyBarChart from "@/components/analytics/MonthlyBarChart";
import CategoryPieChart from "@/components/analytics/CategoryPieChart";

import {
  ArrowRight,
  Plus,
  Wallet,
  Calendar,
  Sparkles,
  Repeat,
  TrendingUp,
  TrendingDown,
  CreditCard,
  PieChart,
  BarChart3,
} from "lucide-react";

interface ChartData {
  name: string;
  value: number;
  fill?: string;
  category?: string;
  originalValue?: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { logAction } = useLogger();
  const router = useRouter();

  const expensesQuery = useExpensesQuery(user?.uid);
  const expenses = useMemo(() => expensesQuery.data ?? [], [expensesQuery.data]);
  const loading = expensesQuery.isLoading;

  const recurringQuery = useRecurringQuery(user?.uid);
  const upcoming = useMemo(
    () => (recurringQuery.data ?? []).filter((r) => r.active).slice(0, 3),
    [recurringQuery.data],
  );
  const updateMutation = useUpdateExpenseMutation(user?.uid);
  const deleteMutation = useDeleteExpenseMutation(user?.uid);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const { range, prev, setRange } = useDateRange();
  const searchParams = useSearchParams();
  const rangeQuery = searchParams.toString() ? `?${searchParams.toString()}` : "";

  useEffect(() => {
    if (!user) return;
    logAction("page_visited", {
      page: "dashboard",
      timestamp: new Date().toISOString(),
    });
  }, [user, logAction]);

  const handleEditExpense = async (updated: ExpenseType) => {
    if (!user) return;
    try {
      const { id, userId: _u, createdAt: _c, updatedAt: _up, ...patch } = updated;
      await updateMutation.mutateAsync({ id, userId: user.uid, patch });
      showSuccessMessage("Expense updated successfully");
    } catch (err) {
      handleError(err, "Dashboard - updating expense");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!user || !deleteExpenseId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteExpenseId });
      setDeleteExpenseId(null);
      showSuccessMessage("Expense deleted successfully");
    } catch (err) {
      handleError(err, "Dashboard - deleting expense");
      throw err;
    }
  };

  const recentExpenses = useMemo(() => expenses.slice(0, 8), [expenses]);

  const rangeExpenses = useMemo(() => filterByRange(expenses, range), [expenses, range]);
  const rangeTotal = useMemo(
    () => rangeExpenses.reduce((sum, e) => sum + e.amount, 0),
    [rangeExpenses],
  );
  const prevTotal = useMemo(
    () => filterByRange(expenses, prev).reduce((sum, e) => sum + e.amount, 0),
    [expenses, prev],
  );
  const growth = percentChange(rangeTotal, prevTotal);
  const perDay = rangeTotal / elapsedDays(range);

  const insights = useMemo(
    () => computeInsights(expenses, range, prev).slice(0, 4),
    [expenses, range, prev],
  );

  const expensesByCategory = useMemo(
    () =>
      rangeExpenses.reduce(
        (acc, e) => {
          acc[e.category] = (acc[e.category] || 0) + e.amount;
          return acc;
        },
        {} as Record<string, number>,
      ),
    [rangeExpenses],
  );

  const pieChartData = useMemo<ChartData[]>(() => {
    const entries = Object.entries(expensesByCategory)
      .map(([name, value]) => {
        const cat = EXPENSE_CATEGORIES.find((c) => c.value === name);
        return { name: cat ? cat.label : name, value, originalValue: value };
      })
      .sort((a, b) => b.value - a.value);

    const total = entries.reduce((s, e) => s + e.value, 0);
    return entries.reduce<ChartData[]>((acc, curr) => {
      const pct = total > 0 ? (curr.value / total) * 100 : 0;
      if (acc.length < 5 || pct > 3) {
        acc.push(curr);
      } else {
        const others = acc.find((a) => a.name === "Others");
        if (others) {
          others.value += curr.value;
          if (others.originalValue != null && curr.originalValue != null)
            others.originalValue += curr.originalValue;
        } else {
          acc.push({ name: "Others", value: curr.value, originalValue: curr.originalValue });
        }
      }
      return acc;
    }, []);
  }, [expensesByCategory]);

  const trendData = useMemo(() => sumByBucket(rangeExpenses, range), [rangeExpenses, range]);

  const currentWeek = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return expenses.filter((e) => e.date >= oneWeekAgo).reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const averageTransaction = rangeExpenses.length > 0 ? rangeTotal / rangeExpenses.length : 0;

  const topCategory = useMemo(() => {
    const entries = Object.entries(expensesByCategory).sort(([, a], [, b]) => b - a);
    if (!entries.length) return null;
    const [key, amount] = entries[0];
    const cat = EXPENSE_CATEGORIES.find((c) => c.value === key);
    return { name: cat?.label || key, amount };
  }, [expensesByCategory]);

  const topCategories = useMemo(
    () =>
      Object.entries(expensesByCategory)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([key, amount]) => ({
          key,
          name: EXPENSE_CATEGORIES.find((c) => c.value === key)?.label || key,
          amount,
        })),
    [expensesByCategory],
  );

  const statValue = (amount: number) =>
    loading ? <Skeleton className="h-8 w-28" /> : <AnimatedNumber value={amount} />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 lg:px-8 lg:py-2">
      <motion.div initial="hidden" animate="visible" variants={stagger(0.07)} className="space-y-5">
        <motion.div variants={fadeUp} className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            Showing <span className="text-foreground font-semibold">{range.label}</span>
          </p>
          <DateRangePicker range={range} onChange={setRange} />
        </motion.div>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Hero balance card */}
          <motion.div variants={fadeUp} className="lg:col-span-2">
            <div className="bg-hero shadow-lift relative h-full overflow-hidden rounded-3xl p-6 sm:p-8">
              <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
              {/* Decorative sparkline sits behind the content so it never squeezes the amount */}
              <div className="pointer-events-none absolute right-0 bottom-0 h-28 w-3/5 opacity-60 sm:h-32 sm:w-1/2">
                {!loading && <Sparkline data={trendData} />}
              </div>
              <div className="relative">
                <div className="min-w-0">
                  <p className="text-sm font-medium opacity-80">Spent · {range.label}</p>
                  <div className="mt-2 text-[clamp(1.75rem,7vw,3rem)] leading-tight font-extrabold tracking-tight break-words">
                    {loading ? (
                      <Skeleton className="h-12 w-48 bg-white/20" />
                    ) : (
                      <AnimatedNumber value={rangeTotal} />
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                    {!loading && growth !== null && Math.abs(growth) >= 0.1 && (
                      <span className="text-foreground inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 dark:text-[oklch(0.2_0.02_165)]">
                        {growth > 0 ? (
                          <TrendingUp className="h-3.5 w-3.5 text-rose-500" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 text-emerald-600" />
                        )}
                        {Math.abs(growth).toFixed(1)}% vs {prev.label}
                      </span>
                    )}
                    <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
                      {loading
                        ? "…"
                        : `${rangeExpenses.length} transaction${rangeExpenses.length === 1 ? "" : "s"}`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="relative mt-6 flex gap-2">
                <Button
                  asChild
                  size="sm"
                  className="text-foreground bg-white shadow-none hover:bg-white/90 dark:text-[oklch(0.2_0.02_165)]"
                >
                  <Link href="/expenses?add=true">
                    <Plus className="h-4 w-4" />
                    Add expense
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="text-inherit hover:bg-white/15 hover:text-inherit"
                >
                  <Link href="/analytics">
                    Insights
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Top categories */}
          <motion.div variants={fadeUp}>
            <Card className="h-full p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold tracking-tight">Top categories</h2>
                <span className="text-muted-foreground text-xs">{range.label}</span>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-11 w-full" />
                  ))}
                </div>
              ) : topCategories.length > 0 ? (
                <ul className="space-y-3">
                  {topCategories.map((cat, i) => (
                    <li key={cat.key} className="flex items-center gap-3">
                      <CategoryIcon category={cat.key} className="h-10 w-10 rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-semibold">{cat.name}</span>
                          <span className="text-sm font-bold tabular-nums">
                            {formatCurrency(cat.amount, { notation: "compact" })}
                          </span>
                        </div>
                        <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
                          <motion.div
                            className="bg-primary h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{
                              width: `${rangeTotal > 0 ? (cat.amount / rangeTotal) * 100 : 0}%`,
                            }}
                            transition={{ duration: 0.9, delay: 0.2 + i * 0.08, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  variant="minimal"
                  icon={<PieChart />}
                  image="/illustrations/empty-chart.png"
                  title="No categories yet"
                  description="Your top spending categories will appear here."
                />
              )}
            </Card>
          </motion.div>
        </div>

        <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Avg per day"
            value={statValue(perDay)}
            icon={Wallet}
            hint={loading ? undefined : <span>{range.label}</span>}
          />
          <StatCard
            label="This week"
            value={statValue(currentWeek)}
            icon={Calendar}
            tone="bg-highlight/40 text-highlight-foreground"
            hint={loading ? undefined : <span>Last 7 days</span>}
          />
          <StatCard
            label="Avg transaction"
            value={statValue(averageTransaction)}
            icon={CreditCard}
            tone="bg-violet-500/12 text-violet-600 dark:text-violet-300"
            hint={!loading && topCategory ? <span>Top: {topCategory.name}</span> : undefined}
          />
        </motion.div>

        <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-bold tracking-tight">
                <Sparkles className="text-primary h-4 w-4" />
                Insights
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/analytics${rangeQuery}`}>
                  All insights
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <InsightList insights={insights} />
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-bold tracking-tight">
                <Repeat className="text-primary h-4 w-4" />
                Upcoming
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/expenses?recurring=open">
                  Manage
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            {recurringQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : upcoming.length > 0 ? (
              <ul className="space-y-2">
                {upcoming.map((rule) => (
                  <li key={rule.id} className="flex items-center gap-3">
                    <CategoryIcon category={rule.category} className="h-10 w-10 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{rule.description}</p>
                      <p className="text-muted-foreground text-xs">
                        {isToday(rule.nextDue)
                          ? "Due today"
                          : `${format(rule.nextDue, "EEE d MMM")} · in ${formatDistanceToNowStrict(rule.nextDue)}`}
                      </p>
                    </div>
                    <span className="text-sm font-bold tabular-nums">
                      {formatCurrency(rule.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                Set an expense to repeat (rent, subscriptions, bills) and it&apos;ll be added
                automatically. Upcoming ones show here.
              </p>
            )}
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Spending trend</CardTitle>
                <CardDescription className="mt-1.5">
                  {isDaily(range) ? "By day" : "By month"} · {range.label}
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-xs">Total</p>
                <p className="text-base font-bold tabular-nums">{formatCurrency(rangeTotal)}</p>
              </div>
            </CardHeader>
            <CardContent className="h-[300px]">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : trendData.some((m) => m.amount > 0) ? (
                <MonthlyBarChart data={trendData} />
              ) : (
                <EmptyChart icon={BarChart3} label="Nothing spent in this period" />
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle>By category</CardTitle>
              <CardDescription className="mt-1.5">
                {Object.keys(expensesByCategory).length} categories
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {loading ? (
                <Skeleton className="mx-auto aspect-square h-full rounded-full" />
              ) : pieChartData.length > 0 ? (
                <CategoryPieChart data={pieChartData} />
              ) : (
                <EmptyChart icon={PieChart} label="No category data yet" />
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle>Recent transactions</CardTitle>
                <CardDescription className="mt-1.5">Your last 8 expenses</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/expenses">
                  See all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="px-3 pt-0 sm:px-4">
              {loading ? (
                <div className="space-y-3 px-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-11 w-11 rounded-2xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-1/3" />
                        <Skeleton className="h-3 w-1/5" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : recentExpenses.length > 0 ? (
                <ExpenseList
                  expenses={recentExpenses}
                  onEdit={handleEditExpense}
                  onDelete={(id) => setDeleteExpenseId(id)}
                  viewMode="list"
                />
              ) : (
                <EmptyState
                  icon={<Wallet />}
                  image="/illustrations/empty-expenses.png"
                  title="No expenses yet"
                  description="Add your first expense or scan a receipt to see it here."
                  actionLabel="Add expense"
                  onAction={() => router.push("/expenses?add=true")}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <DeleteConfirmDialog
        open={!!deleteExpenseId}
        onOpenChange={() => setDeleteExpenseId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete expense"
        description="Are you sure? This action cannot be undone."
      />
    </div>
  );
}

function Sparkline({ data }: { data: { name: string; amount: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="hero-spark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#ffffff"
          strokeWidth={2.5}
          fill="url(#hero-spark)"
          animationDuration={1200}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <EmptyState
      variant="minimal"
      className="h-full"
      icon={<Icon />}
      image="/illustrations/empty-chart.png"
      title={label}
      description="Add a few expenses and your chart will come to life."
    />
  );
}
