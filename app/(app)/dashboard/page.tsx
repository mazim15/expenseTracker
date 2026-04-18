"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { getAllExpenses } from "@/lib/expenses";
import { formatCurrency } from "@/lib/utils";
import { ExpenseType, EXPENSE_CATEGORIES } from "@/types/expense";
import { handleError } from "@/lib/utils/errorHandler";
import { useLogger } from "@/lib/hooks/useLogger";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import ExpenseList from "@/components/expenses/ExpenseList";
import MonthlyBarChart from "@/components/analytics/MonthlyBarChart";
import CategoryPieChart from "@/components/analytics/CategoryPieChart";
import AIInsights from "@/components/analytics/AIInsights";

import {
  ArrowRight,
  Plus,
  Wallet,
  Calendar,
  TrendingUp,
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
  const [expenses, setExpenses] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    logAction("page_visited", {
      page: "dashboard",
      timestamp: new Date().toISOString(),
    });

    const fetchExpenses = async () => {
      try {
        setLoading(true);
        const allData = await getAllExpenses(user.uid);
        setExpenses(allData);
      } catch (error) {
        handleError(error, "Dashboard - fetching expenses");
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [user, logAction]);

  const recentExpenses = useMemo(() => expenses.slice(0, 8), [expenses]);

  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  const expensesByCategory = useMemo(
    () =>
      expenses.reduce(
        (acc, e) => {
          acc[e.category] = (acc[e.category] || 0) + e.amount;
          return acc;
        },
        {} as Record<string, number>,
      ),
    [expenses],
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

  const monthlyData = useMemo(() => {
    const totals: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      totals[month.toLocaleString("default", { month: "short" })] = 0;
    }
    expenses.forEach((e) => {
      const key = e.date.toLocaleString("default", { month: "short" });
      if (totals[key] !== undefined) totals[key] += e.amount;
    });
    return Object.entries(totals).map(([name, amount]) => ({ name, amount }));
  }, [expenses]);

  const currentMonth = useMemo(() => {
    const now = new Date();
    return expenses
      .filter(
        (e) => e.date.getMonth() === now.getMonth() && e.date.getFullYear() === now.getFullYear(),
      )
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const previousMonth = useMemo(() => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return expenses
      .filter(
        (e) => e.date.getMonth() === prev.getMonth() && e.date.getFullYear() === prev.getFullYear(),
      )
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const monthlyGrowth = useMemo(() => {
    if (previousMonth === 0) return 0;
    return ((currentMonth - previousMonth) / previousMonth) * 100;
  }, [currentMonth, previousMonth]);

  const currentWeek = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return expenses.filter((e) => e.date >= oneWeekAgo).reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const averageTransaction = useMemo(
    () => (expenses.length > 0 ? totalExpenses / expenses.length : 0),
    [totalExpenses, expenses.length],
  );

  const topCategory = useMemo(() => {
    const entries = Object.entries(expensesByCategory).sort(([, a], [, b]) => b - a);
    if (!entries.length) return null;
    const [key, amount] = entries[0];
    const cat = EXPENSE_CATEGORIES.find((c) => c.value === key);
    return { name: cat?.label || key, amount };
  }, [expensesByCategory]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {loading
              ? "Loading your overview…"
              : `${expenses.length} expenses tracked · ${formatCurrency(totalExpenses)} total`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/expenses">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/expenses?add=true">
              <Plus className="h-4 w-4" />
              Add expense
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total"
          value={<span className="tabular-nums">{formatCurrency(totalExpenses)}</span>}
          icon={Wallet}
          hint={<span>{expenses.length} transactions</span>}
        />
        <StatCard
          label="This month"
          value={<span className="tabular-nums">{formatCurrency(currentMonth)}</span>}
          icon={Calendar}
          trend={
            monthlyGrowth !== 0
              ? { value: Math.abs(monthlyGrowth), isPositive: monthlyGrowth < 0 }
              : undefined
          }
          hint={<span>vs last month</span>}
        />
        <StatCard
          label="This week"
          value={<span className="tabular-nums">{formatCurrency(currentWeek)}</span>}
          icon={TrendingUp}
          hint={<span>Last 7 days</span>}
        />
        <StatCard
          label="Avg transaction"
          value={<span className="tabular-nums">{formatCurrency(averageTransaction)}</span>}
          icon={CreditCard}
          hint={topCategory ? <span>Top: {topCategory.name}</span> : undefined}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="text-muted-foreground h-4 w-4" />
                Monthly trend
              </CardTitle>
              <CardDescription className="mt-1">6-month spending progression</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-xs">Current month</p>
              <p className="text-base font-semibold tabular-nums">{formatCurrency(currentMonth)}</p>
            </div>
          </CardHeader>
          <CardContent className="h-[320px]">
            {monthlyData.some((m) => m.amount > 0) ? (
              <MonthlyBarChart data={monthlyData} />
            ) : (
              <EmptyChart icon={BarChart3} label="No monthly data" />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="text-muted-foreground h-4 w-4" />
                By category
              </CardTitle>
              <CardDescription className="mt-1">
                {Object.keys(expensesByCategory).length} categories
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-[320px]">
            {pieChartData.length > 0 ? (
              <CategoryPieChart data={pieChartData} />
            ) : (
              <EmptyChart icon={PieChart} label="No category data" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <AIInsights expenses={expenses} className="h-full" />
        </div>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Recent expenses</CardTitle>
              <CardDescription className="mt-1">Last 8 transactions</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/expenses">
                All
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-2">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
              </div>
            ) : recentExpenses.length > 0 ? (
              <ExpenseList
                expenses={recentExpenses}
                onEdit={() => {}}
                onDelete={() => {}}
                viewMode="list"
              />
            ) : (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="bg-muted mb-3 rounded-full p-3">
                  <Wallet className="text-muted-foreground h-5 w-5" />
                </div>
                <p className="text-sm font-medium">No expenses yet</p>
                <p className="text-muted-foreground mt-1 text-xs">Add your first to see it here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
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
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <div className="bg-muted rounded-full p-3">
        <Icon className="text-muted-foreground h-5 w-5" />
      </div>
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
  );
}
