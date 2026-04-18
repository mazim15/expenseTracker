"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { getAllExpenses } from "@/lib/expenses";
import { ExpenseType, EXPENSE_CATEGORIES } from "@/types/expense";
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
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { PageTransition, ScaleIn } from "@/components/ui/page-transition";
import { useLogger } from "@/lib/hooks/useLogger";
import AIInsights from "@/components/analytics/AIInsights";
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
      <div className="bg-background rounded-lg border p-3 shadow-lg">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-primary text-sm">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { logAction } = useLogger();
  const [expenses, setExpenses] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendMonths, setTrendMonths] = useState(6);

  const fetchExpenses = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const allExpenses = await getAllExpenses(user.uid);
      setExpenses(allExpenses);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    logAction("page_visited", {
      page: "analytics",
      timestamp: new Date().toISOString(),
    });

    fetchExpenses();
  }, [user, logAction, fetchExpenses]);

  const analytics = useMemo(() => {
    if (expenses.length === 0) return null;

    const now = new Date();
    const currentMonth = startOfMonth(now);
    const previousMonth = startOfMonth(subMonths(now, 1));

    const currentMonthExpenses = expenses.filter(
      (expense) => expense.date >= currentMonth && expense.date <= endOfMonth(currentMonth),
    );
    const previousMonthExpenses = expenses.filter(
      (expense) => expense.date >= previousMonth && expense.date <= endOfMonth(previousMonth),
    );

    const currentTotal = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const previousTotal = previousMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalAllTime = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    const monthOverMonthGrowth =
      previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

    const categoryTotals: Record<string, number> = {};
    currentMonthExpenses.forEach((expense) => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });

    const topCategories = Object.entries(categoryTotals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const averageDaily = currentMonthExpenses.length > 0 ? currentTotal / now.getDate() : 0;
    const averageTransaction = expenses.length > 0 ? totalAllTime / expenses.length : 0;

    const highestExpense = expenses.reduce(
      (max, expense) => (expense.amount > max.amount ? expense : max),
      expenses[0],
    );
    const lowestExpense = expenses.reduce(
      (min, expense) => (expense.amount < min.amount ? expense : min),
      expenses[0],
    );

    const monthlyData = [];
    for (let i = trendMonths - 1; i >= 0; i--) {
      const month = subMonths(now, i);
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthExpenses = expenses.filter(
        (expense) => expense.date >= monthStart && expense.date <= monthEnd,
      );
      const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);

      monthlyData.push({
        name: format(month, "MMM"),
        amount: monthTotal,
        count: monthExpenses.length,
      });
    }

    const categoryData = Object.entries(categoryTotals)
      .map(([category, amount]) => {
        const categoryInfo = EXPENSE_CATEGORIES.find((c) => c.value === category);
        return {
          name: categoryInfo?.label || category,
          value: amount,
          originalValue: amount,
        };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const weeklyPattern = Array.from({ length: 7 }, (_, index) => {
      const dayName = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ][index];
      const dayTotal = expenses
        .filter((expense) => expense.date.getDay() === index)
        .reduce((sum, expense) => sum + expense.amount, 0);

      return { day: dayName, amount: dayTotal };
    });

    return {
      currentMonth: {
        total: currentTotal,
        expenses: currentMonthExpenses,
        count: currentMonthExpenses.length,
      },
      previousMonth: {
        total: previousTotal,
        expenses: previousMonthExpenses,
      },
      growth: {
        monthOverMonth: monthOverMonthGrowth,
        isIncrease: monthOverMonthGrowth > 0,
      },
      categories: {
        top: topCategories,
        distribution: categoryData,
      },
      metrics: {
        totalAllTime,
        averageDaily,
        averageTransaction,
        highestExpense,
        lowestExpense,
        totalTransactions: expenses.length,
      },
      charts: {
        monthlyTrend: monthlyData,
        weeklyPattern,
      },
    };
  }, [expenses, trendMonths]);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      food: "#f97316",
      housing: "#3b82f6",
      transportation: "#22c55e",
      utilities: "#a855f7",
      entertainment: "#ec4899",
      healthcare: "#ef4444",
      shopping: "#eab308",
      education: "#6366f1",
      personal: "#06b6d4",
      other: "#6b7280",
    };
    return colors[category] || colors.other;
  };

  return (
    <PageTransition>
      <div className="container mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
        <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Insights into your spending patterns and trends.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={fetchExpenses} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
          </div>
        ) : !analytics ? (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center px-6 py-16 text-center">
                <div className="bg-muted mb-4 rounded-full p-4">
                  <BarChart3 className="text-muted-foreground h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold">No data yet</h3>
                <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                  Add your first expense to unlock trends, category breakdowns, and spending
                  insights.
                </p>
                <div className="mt-5">
                  <Button asChild size="sm">
                    <Link href="/expenses?add=true">Add your first expense</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ScaleIn delay={0.05}>
                <StatCard
                  label="This month"
                  icon={Calendar}
                  value={
                    <span className="tabular-nums">
                      {formatCurrency(analytics.currentMonth.total)}
                    </span>
                  }
                  hint={
                    <span>
                      {analytics.currentMonth.count} expenses · {format(new Date(), "MMM yyyy")}
                    </span>
                  }
                />
              </ScaleIn>
              <ScaleIn delay={0.1}>
                <StatCard
                  label="vs last month"
                  icon={TrendingUp}
                  value={
                    <span className="tabular-nums">
                      {analytics.growth.isIncrease ? "+" : ""}
                      {analytics.growth.monthOverMonth.toFixed(1)}%
                    </span>
                  }
                  trend={
                    analytics.growth.monthOverMonth !== 0
                      ? {
                          value: Math.abs(analytics.growth.monthOverMonth),
                          isPositive: !analytics.growth.isIncrease,
                        }
                      : undefined
                  }
                  hint={<span>from {formatCurrency(analytics.previousMonth.total)}</span>}
                />
              </ScaleIn>
              <ScaleIn delay={0.15}>
                <StatCard
                  label="Daily average"
                  icon={Clock}
                  value={
                    <span className="tabular-nums">
                      {formatCurrency(analytics.metrics.averageDaily)}
                    </span>
                  }
                  hint={<span>Based on {new Date().getDate()} days this month</span>}
                />
              </ScaleIn>
              <ScaleIn delay={0.2}>
                <StatCard
                  label="All time"
                  icon={Wallet}
                  value={
                    <span className="tabular-nums">
                      {formatCurrency(analytics.metrics.totalAllTime)}
                    </span>
                  }
                  hint={<span>{analytics.metrics.totalTransactions} transactions</span>}
                />
              </ScaleIn>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Insights</CardTitle>
                <CardDescription>Spending breakdowns, trends, and patterns.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="trends" className="space-y-6">
                  <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
                    <TabsTrigger value="trends" className="px-3 py-2 text-sm font-medium">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Trends
                    </TabsTrigger>
                    <TabsTrigger value="categories" className="px-3 py-2 text-sm font-medium">
                      <PieChart className="mr-2 h-4 w-4" />
                      Categories
                    </TabsTrigger>
                    <TabsTrigger value="patterns" className="px-3 py-2 text-sm font-medium">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Patterns
                    </TabsTrigger>
                    <TabsTrigger value="insights" className="px-3 py-2 text-sm font-medium">
                      <Wallet className="mr-2 h-4 w-4" />
                      AI Insights
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="trends" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                      <Card>
                        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                          <div>
                            <CardTitle className="text-base">
                              {trendMonths}-month spending trend
                            </CardTitle>
                            <CardDescription>
                              Monthly spending progression over time.
                            </CardDescription>
                          </div>
                          <Select
                            value={String(trendMonths)}
                            onValueChange={(v) => setTrendMonths(Number(v))}
                          >
                            <SelectTrigger className="h-8 w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3">Last 3 months</SelectItem>
                              <SelectItem value="6">Last 6 months</SelectItem>
                              <SelectItem value="12">Last 12 months</SelectItem>
                              <SelectItem value="24">Last 24 months</SelectItem>
                            </SelectContent>
                          </Select>
                        </CardHeader>
                        <CardContent className="h-[360px]">
                          <MonthlyBarChart data={analytics.charts.monthlyTrend} />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Weekly pattern</CardTitle>
                          <CardDescription>Your spending by day of the week.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[360px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.charts.weeklyPattern} layout="vertical">
                              <CartesianGrid
                                strokeDasharray="3 3"
                                horizontal={true}
                                vertical={false}
                              />
                              <XAxis
                                type="number"
                                tickFormatter={(value) =>
                                  formatCurrency(value, { notation: "compact" })
                                }
                              />
                              <YAxis type="category" dataKey="day" width={80} />
                              <Tooltip content={<CustomTooltip />} />
                              <Bar dataKey="amount" fill="#10B981" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="categories" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                      <Card className="lg:col-span-2">
                        <CardHeader>
                          <CardTitle className="text-base">Category distribution</CardTitle>
                          <CardDescription>
                            This month&apos;s spending breakdown by category.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[360px]">
                          <CategoryPieChart data={analytics.categories.distribution} />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Top categories</CardTitle>
                          <CardDescription>Your biggest spending areas.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {analytics.categories.top.map((cat) => {
                            const category = EXPENSE_CATEGORIES.find(
                              (c) => c.value === cat.category,
                            );
                            const pct =
                              analytics.currentMonth.total > 0
                                ? (cat.amount / analytics.currentMonth.total) * 100
                                : 0;
                            return (
                              <div
                                key={cat.category}
                                className="hover:bg-muted/60 flex items-center justify-between rounded-md px-2 py-2 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: getCategoryColor(cat.category) }}
                                  />
                                  <span className="text-sm font-medium">
                                    {category?.label || cat.category}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold tabular-nums">
                                    {formatCurrency(cat.amount)}
                                  </div>
                                  <div className="text-muted-foreground text-xs tabular-nums">
                                    {pct.toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="patterns" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Expense range</CardTitle>
                          <CardDescription>
                            Your spending range across all expenses.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-muted/40 rounded-md p-4">
                              <div className="text-muted-foreground text-xs">Highest</div>
                              <div className="mt-1 text-xl font-semibold tabular-nums">
                                {formatCurrency(analytics.metrics.highestExpense.amount)}
                              </div>
                              <div className="text-muted-foreground mt-1 truncate text-xs">
                                {analytics.metrics.highestExpense.description}
                              </div>
                            </div>
                            <div className="bg-muted/40 rounded-md p-4">
                              <div className="text-muted-foreground text-xs">Lowest</div>
                              <div className="mt-1 text-xl font-semibold tabular-nums">
                                {formatCurrency(analytics.metrics.lowestExpense.amount)}
                              </div>
                              <div className="text-muted-foreground mt-1 truncate text-xs">
                                {analytics.metrics.lowestExpense.description}
                              </div>
                            </div>
                          </div>
                          <div className="bg-muted/40 rounded-md p-4">
                            <div className="text-muted-foreground text-xs">Average transaction</div>
                            <div className="mt-1 text-xl font-semibold tabular-nums">
                              {formatCurrency(analytics.metrics.averageTransaction)}
                            </div>
                            <div className="text-muted-foreground mt-1 text-xs">
                              Across all {analytics.metrics.totalTransactions} expenses
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Spending velocity</CardTitle>
                          <CardDescription>How your spending pace compares.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                          <div>
                            <div className="mb-2 flex justify-between text-sm">
                              <span className="text-muted-foreground">This month progress</span>
                              <span className="font-medium tabular-nums">
                                {new Date().getDate()} of{" "}
                                {new Date(
                                  new Date().getFullYear(),
                                  new Date().getMonth() + 1,
                                  0,
                                ).getDate()}{" "}
                                days
                              </span>
                            </div>
                            <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                              <div
                                className="bg-primary h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${(new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-muted/40 rounded-md p-3">
                              <div className="text-muted-foreground text-xs">Transactions</div>
                              <div className="mt-1 text-lg font-semibold tabular-nums">
                                {analytics.currentMonth.count}
                              </div>
                            </div>
                            <div className="bg-muted/40 rounded-md p-3">
                              <div className="text-muted-foreground text-xs">Per day</div>
                              <div className="mt-1 text-lg font-semibold tabular-nums">
                                {(analytics.currentMonth.count / new Date().getDate()).toFixed(1)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="insights" className="space-y-6">
                    <AIInsights expenses={expenses} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageTransition>
  );
}
