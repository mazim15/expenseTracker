"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllExpenses } from "@/lib/expenses";
import { formatCurrency } from "@/lib/utils";
import { ExpenseType } from "@/types/expense";
import ExpenseList from "@/components/expenses/ExpenseList";
import { ChartLoadingSpinner } from "@/components/ui/loading-spinner";
import MonthlyBarChart from "@/components/analytics/MonthlyBarChart";
import CategoryPieChart from "@/components/analytics/CategoryPieChart";
import { handleError } from "@/lib/utils/errorHandler";
import AIInsights from "@/components/analytics/AIInsights";
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
} from "recharts";
import { EXPENSE_CATEGORIES } from "@/types/expense";
import Link from "next/link";
import {
  Plus,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Target,
  Calendar,
  CreditCard,
  Zap,
  Wallet,
  Activity,
  PieChart,
  BarChart3,
  Clock,
  Sparkles,
  Eye,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  ScaleIn,
} from "@/components/ui/page-transition";
import { useLogger } from "@/lib/hooks/useLogger";

interface ChartData {
  name: string;
  value: number;
  fill?: string;
  category?: string;
  originalValue?: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background rounded-lg border p-2 shadow-lg">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-primary text-sm">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { logAction } = useLogger();
  const [expenses, setExpenses] = useState<ExpenseType[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Log page visit
    logAction("page_visited", {
      page: "dashboard",
      timestamp: new Date().toISOString(),
    });

    const fetchExpenses = async () => {
      try {
        setLoading(true);
        // Get all expenses for analytics
        const allData = await getAllExpenses(user.uid);
        setExpenses(allData);

        // Get only recent expenses for the list view
        setRecentExpenses(allData.slice(0, 10));
      } catch (error) {
        handleError(error, "Dashboard - fetching expenses");
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [user, logAction]);

  // Memoized calculations for performance
  const totalExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses],
  );

  const expensesByCategory = useMemo(
    () =>
      expenses.reduce(
        (acc, expense) => {
          const { category, amount } = expense;
          acc[category] = (acc[category] || 0) + amount;
          return acc;
        },
        {} as Record<string, number>,
      ),
    [expenses],
  );

  // Memoized pie chart data preparation
  const pieChartData = useMemo(
    () =>
      Object.entries(expensesByCategory)
        .map(([name, value]) => {
          const category = EXPENSE_CATEGORIES.find((c) => c.value === name);
          return {
            name: category ? category.label : name,
            value,
            originalValue: value,
          };
        })
        .sort((a, b) => b.value - a.value)
        .reduce((acc: ChartData[], curr) => {
          const total = Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0);
          const percentage = (curr.value / total) * 100;

          if (acc.length < 5 || percentage > 3) {
            acc.push(curr);
          } else {
            const othersIndex = acc.findIndex((item) => item.name === "Others");
            if (othersIndex === -1) {
              acc.push({ name: "Others", value: curr.value, originalValue: curr.value });
            } else {
              acc[othersIndex].value += curr.value;
              acc[othersIndex].originalValue! += curr.originalValue!;
            }
          }
          return acc;
        }, []),
    [expensesByCategory],
  );

  // Memoized monthly data calculation
  const getMonthlyData = useMemo(() => {
    const monthlyTotals: Record<string, number> = {};
    const now = new Date();

    // Initialize last 6 months with 0
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = month.toLocaleString("default", { month: "short" });
      monthlyTotals[monthKey] = 0;
    }

    // Sum up expenses for each month
    expenses.forEach((expense) => {
      const monthKey = expense.date.toLocaleString("default", { month: "short" });
      if (monthlyTotals[monthKey] !== undefined) {
        monthlyTotals[monthKey] += expense.amount;
      }
    });

    // Convert to array format for chart
    return Object.entries(monthlyTotals).map(([name, amount]) => ({
      name,
      amount,
    }));
  }, [expenses]);

  // Memoized monthly trends calculation
  const calculateMonthlyTrends = useMemo(() => {
    const monthlyTotals: Record<string, number> = {};

    // Group expenses by month
    expenses.forEach((expense) => {
      const monthYear = expense.date.toLocaleString("default", { month: "short", year: "2-digit" });
      monthlyTotals[monthYear] = (monthlyTotals[monthYear] || 0) + expense.amount;
    });

    // Convert to array for chart
    return Object.entries(monthlyTotals)
      .map(([month, amount]) => ({
        month,
        amount,
      }))
      .sort((a, b) => {
        // Sort by date (assuming format is "MMM YY")
        const [aMonth, aYear] = a.month.split(" ");
        const [bMonth, bYear] = b.month.split(" ");

        if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);

        const months = [
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
        return months.indexOf(aMonth) - months.indexOf(bMonth);
      });
  }, [expenses]);

  // Memoized category percentages for radar chart
  const categoryPercentages = useMemo(() => {
    const total = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0);
    if (total === 0) return [];

    return Object.entries(expensesByCategory).map(([category, amount]) => {
      const cat = EXPENSE_CATEGORIES.find((c) => c.value === category);
      return {
        category: cat ? cat.label : category,
        percentage: (amount / total) * 100,
      };
    });
  }, [expensesByCategory]);

  // Memoized day of week spending patterns
  const dayOfWeekSpending = useMemo(() => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayTotals = days.reduce(
      (acc, day) => ({ ...acc, [day]: 0 }),
      {} as Record<string, number>,
    );

    expenses.forEach((expense) => {
      const day = days[expense.date.getDay()];
      dayTotals[day] = (dayTotals[day] || 0) + expense.amount;
    });

    return Object.entries(dayTotals).map(([day, amount]) => ({
      day,
      amount,
    }));
  }, [expenses]);

  // Additional memoized calculations for enhanced cards
  const currentMonth = useMemo(() => {
    const now = new Date();
    return expenses
      .filter(
        (expense) =>
          expense.date.getMonth() === now.getMonth() &&
          expense.date.getFullYear() === now.getFullYear(),
      )
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);

  const previousMonth = useMemo(() => {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return expenses
      .filter(
        (expense) =>
          expense.date.getMonth() === prevMonth.getMonth() &&
          expense.date.getFullYear() === prevMonth.getFullYear(),
      )
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);

  const monthlyGrowth = useMemo(() => {
    if (previousMonth === 0) return 0;
    return ((currentMonth - previousMonth) / previousMonth) * 100;
  }, [currentMonth, previousMonth]);

  const currentWeek = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return expenses
      .filter((expense) => expense.date >= oneWeekAgo)
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);

  const averageTransaction = useMemo(
    () => (expenses.length > 0 ? totalExpenses / expenses.length : 0),
    [totalExpenses, expenses.length],
  );

  const topCategory = useMemo(() => {
    if (Object.keys(expensesByCategory).length === 0) return null;
    const [categoryValue, amount] = Object.entries(expensesByCategory).sort(
      ([, a], [, b]) => b - a,
    )[0];
    const category = EXPENSE_CATEGORIES.find((c) => c.value === categoryValue);
    return { name: category?.label || categoryValue, amount };
  }, [expensesByCategory]);

  const transactionCount = useMemo(() => expenses.length, [expenses]);

  // Memoized spending insights
  const getInsights = useMemo(() => {
    if (expenses.length === 0) return [];

    const insights = [];

    // Highest spending category
    if (pieChartData.length > 0) {
      const highest = pieChartData.sort((a, b) => b.value - a.value)[0];
      insights.push(
        `Your highest spending category is ${highest.name} at ${formatCurrency(highest.value)}.`,
      );
    }

    // Day of week with highest spending
    const daySpending = dayOfWeekSpending;
    if (daySpending.length > 0) {
      const highestDay = [...daySpending].sort((a, b) => b.amount - a.amount)[0];
      insights.push(`You tend to spend the most on ${highestDay.day}s.`);
    }

    // Average transaction size
    const avgTransaction = totalExpenses / expenses.length;
    insights.push(`Your average transaction is ${formatCurrency(avgTransaction)}.`);

    // Monthly trend
    const monthlyTrend = calculateMonthlyTrends;
    if (monthlyTrend.length >= 2) {
      const lastMonth = monthlyTrend[monthlyTrend.length - 1];
      const previousMonth = monthlyTrend[monthlyTrend.length - 2];

      if (lastMonth.amount > previousMonth.amount) {
        const increase = ((lastMonth.amount - previousMonth.amount) / previousMonth.amount) * 100;
        insights.push(
          `Your spending increased by ${increase.toFixed(1)}% compared to the previous month.`,
        );
      } else {
        const decrease = ((previousMonth.amount - lastMonth.amount) / previousMonth.amount) * 100;
        insights.push(
          `Your spending decreased by ${decrease.toFixed(1)}% compared to the previous month.`,
        );
      }
    }

    return insights;
  }, [expenses, pieChartData, dayOfWeekSpending, totalExpenses, calculateMonthlyTrends]);

  // Update the type for the formatter function
  const formatValue = (value: number) => formatCurrency(value, { notation: "compact" });

  // Add proper typing for the tooltip formatter
  const tooltipFormatter = (value: number) => `${Number(value).toFixed(1)}%`;

  return (
    <PageTransition>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <StaggerContainer className="flex flex-col space-y-6">
          <StaggerItem>
            <motion.div
              className="glassmorphism flex flex-col items-start justify-between gap-4 rounded-xl p-6 backdrop-blur-md sm:flex-row sm:items-center"
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h1
                  className="from-primary bg-gradient-to-r to-blue-600 bg-clip-text text-4xl font-bold tracking-tight text-transparent"
                  id="dashboard-title"
                >
                  Dashboard
                </h1>
                <p className="text-muted-foreground mt-1" aria-describedby="dashboard-title">
                  Overview of your expenses
                </p>
              </motion.div>
              <motion.div
                className="flex gap-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  asChild
                  variant="outline"
                  className="transition-all duration-200 hover:shadow-lg"
                >
                  <Link href="/expenses" aria-label="View all expenses page">
                    <ArrowRight className="mr-2 h-4 w-4" aria-hidden="true" />
                    View All Expenses
                  </Link>
                </Button>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    asChild
                    variant="default"
                    className="shadow-lg transition-all hover:shadow-xl"
                  >
                    <Link href="/expenses?add=true" aria-label="Add new expense">
                      <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                      Add Expense
                    </Link>
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          </StaggerItem>

          <StaggerItem>
            <div
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              role="region"
              aria-label="Expense summary cards"
            >
              {/* Total Expenses Card */}
              <ScaleIn delay={0.1}>
                <motion.div
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card className="group dark:via-background relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 via-white to-blue-50 transition-all duration-500 hover:shadow-2xl dark:from-blue-950/50 dark:to-blue-950/50">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-muted-foreground group-hover:text-foreground text-sm font-semibold transition-colors">
                        Total Expenses
                      </CardTitle>
                      <motion.div
                        className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30"
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
                      >
                        <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </motion.div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <motion.div
                        className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 bg-clip-text text-3xl font-bold text-transparent"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                      >
                        {formatCurrency(totalExpenses)}
                      </motion.div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">All time</span>
                        <span className="font-medium text-blue-600">
                          {transactionCount} transactions
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </ScaleIn>

              {/* Current Month Card */}
              <ScaleIn delay={0.2}>
                <motion.div
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card className="group dark:via-background relative overflow-hidden border-0 bg-gradient-to-br from-green-50 via-white to-emerald-50 transition-all duration-500 hover:shadow-2xl dark:from-green-950/50 dark:to-emerald-950/50">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-emerald-500/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-muted-foreground group-hover:text-foreground text-sm font-semibold transition-colors">
                        This Month
                      </CardTitle>
                      <motion.div
                        className="rounded-full bg-green-100 p-2 dark:bg-green-900/30"
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
                      >
                        <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </motion.div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <motion.div
                        className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 bg-clip-text text-3xl font-bold text-transparent"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                      >
                        {formatCurrency(currentMonth)}
                      </motion.div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">vs last month</span>
                        <span
                          className={`flex items-center gap-1 font-medium ${
                            monthlyGrowth > 0
                              ? "text-red-600"
                              : monthlyGrowth < 0
                                ? "text-green-600"
                                : "text-muted-foreground"
                          }`}
                        >
                          {monthlyGrowth !== 0 && (
                            <TrendingUp
                              className={`h-3 w-3 ${monthlyGrowth < 0 ? "rotate-180" : ""}`}
                            />
                          )}
                          {Math.abs(monthlyGrowth).toFixed(1)}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </ScaleIn>

              {/* This Week Card */}
              <ScaleIn delay={0.3}>
                <motion.div
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card className="group dark:via-background relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 via-white to-violet-50 transition-all duration-500 hover:shadow-2xl dark:from-purple-950/50 dark:to-violet-950/50">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-violet-500/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-muted-foreground group-hover:text-foreground text-sm font-semibold transition-colors">
                        This Week
                      </CardTitle>
                      <motion.div
                        className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                      >
                        <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </motion.div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <motion.div
                        className="bg-gradient-to-r from-purple-600 via-violet-600 to-purple-700 bg-clip-text text-3xl font-bold text-transparent"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                      >
                        {formatCurrency(currentWeek)}
                      </motion.div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Last 7 days</span>
                        <span className="font-medium text-purple-600">Recent activity</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </ScaleIn>

              {/* Average Transaction Card */}
              <ScaleIn delay={0.4}>
                <motion.div
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card className="group dark:via-background relative overflow-hidden border-0 bg-gradient-to-br from-orange-50 via-white to-amber-50 transition-all duration-500 hover:shadow-2xl dark:from-orange-950/50 dark:to-amber-950/50">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-amber-500/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-muted-foreground group-hover:text-foreground text-sm font-semibold transition-colors">
                        Avg Transaction
                      </CardTitle>
                      <motion.div
                        className="rounded-full bg-orange-100 p-2 dark:bg-orange-900/30"
                        animate={{ rotate: [0, 180, 360] }}
                        transition={{ duration: 4, repeat: Infinity, repeatDelay: 6 }}
                      >
                        <CreditCard className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </motion.div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <motion.div
                        className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 bg-clip-text text-3xl font-bold text-transparent"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
                      >
                        {formatCurrency(averageTransaction)}
                      </motion.div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Per expense</span>
                        <span className="font-medium text-orange-600">Average spend</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </ScaleIn>

              {/* Top Category Card */}
              {topCategory && (
                <ScaleIn delay={0.5}>
                  <motion.div
                    whileHover={{
                      scale: 1.02,
                      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card className="group dark:via-background relative overflow-hidden border-0 bg-gradient-to-br from-rose-50 via-white to-pink-50 transition-all duration-500 hover:shadow-2xl dark:from-rose-950/50 dark:to-pink-950/50">
                      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-transparent to-pink-500/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-muted-foreground group-hover:text-foreground text-sm font-semibold transition-colors">
                          Top Category
                        </CardTitle>
                        <motion.div
                          className="rounded-full bg-rose-100 p-2 dark:bg-rose-900/30"
                          animate={{ rotate: [0, -10, 10, 0] }}
                          transition={{ duration: 3, repeat: Infinity, repeatDelay: 7 }}
                        >
                          <PieChart className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        </motion.div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <motion.div
                          className="bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 bg-clip-text text-2xl font-bold text-transparent"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
                        >
                          {formatCurrency(topCategory.amount)}
                        </motion.div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate">{topCategory.name}</span>
                          <span className="font-medium text-rose-600">
                            {((topCategory.amount / totalExpenses) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </ScaleIn>
              )}

              {/* Activity Card */}
              <ScaleIn delay={0.6}>
                <motion.div
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card className="group dark:via-background relative overflow-hidden border-0 bg-gradient-to-br from-teal-50 via-white to-cyan-50 transition-all duration-500 hover:shadow-2xl dark:from-teal-950/50 dark:to-cyan-950/50">
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-cyan-500/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-muted-foreground group-hover:text-foreground text-sm font-semibold transition-colors">
                        Activity Score
                      </CardTitle>
                      <motion.div
                        className="rounded-full bg-teal-100 p-2 dark:bg-teal-900/30"
                        animate={{
                          scale: [1, 1.2, 1],
                          rotate: [0, 5, -5, 0],
                        }}
                        transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
                      >
                        <Activity className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      </motion.div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <motion.div
                        className="bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-700 bg-clip-text text-3xl font-bold text-transparent"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
                      >
                        {Math.min(100, Math.round((transactionCount / 100) * 100))}%
                      </motion.div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Engagement</span>
                        <span className="font-medium text-teal-600">
                          {transactionCount > 50
                            ? "High"
                            : transactionCount > 20
                              ? "Medium"
                              : "Low"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </ScaleIn>
            </div>
          </StaggerItem>

          <StaggerItem>
            <Tabs defaultValue="overview" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <TabsList
                  role="tablist"
                  aria-label="Dashboard content tabs"
                  className="glassmorphism grid w-full grid-cols-3"
                >
                  <TabsTrigger
                    value="overview"
                    role="tab"
                    aria-controls="overview-content"
                    className="transition-all duration-200"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="analytics"
                    role="tab"
                    aria-controls="analytics-content"
                    className="transition-all duration-200"
                  >
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger
                    value="recent"
                    role="tab"
                    aria-controls="recent-content"
                    className="transition-all duration-200"
                  >
                    Recent Expenses
                  </TabsTrigger>
                </TabsList>
              </motion.div>

              <TabsContent
                value="overview"
                className="space-y-6"
                role="tabpanel"
                id="overview-content"
                aria-labelledby="overview-tab"
              >
                {/* Enhanced Overview Header */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-2 text-center"
                >
                  <h2 className="from-primary bg-gradient-to-r via-blue-600 to-purple-600 bg-clip-text text-2xl font-semibold text-transparent">
                    Financial Overview
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Your complete spending analysis and insights
                  </p>
                </motion.div>

                {/* Primary Charts Grid */}
                <motion.div
                  className="grid gap-6 lg:grid-cols-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  {/* Enhanced Monthly Expenses Chart */}
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ y: -5 }}
                    className="group"
                  >
                    <Card className="dark:via-background relative overflow-hidden border-0 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/80 shadow-lg transition-all duration-500 hover:shadow-2xl dark:from-blue-950/30 dark:to-indigo-950/30">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <CardHeader className="relative z-10">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <CardTitle className="flex items-center gap-3 text-lg font-bold">
                              <motion.div
                                className="rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 p-2 dark:from-blue-900/30 dark:to-indigo-900/30"
                                animate={{ rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }}
                              >
                                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </motion.div>
                              <span className="bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent dark:from-blue-300 dark:to-indigo-300">
                                Monthly Trends
                              </span>
                            </CardTitle>
                            <CardDescription className="text-sm">
                              6-month spending progression with{" "}
                              <span className="text-primary font-medium">
                                {formatCurrency(
                                  getMonthlyData.reduce((sum, month) => sum + month.amount, 0) /
                                    getMonthlyData.length,
                                )}{" "}
                                avg
                              </span>
                            </CardDescription>
                          </div>
                          <div className="space-y-1 text-right">
                            <div className="text-muted-foreground text-xs">Current Month</div>
                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              {formatCurrency(currentMonth)}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="relative z-10 h-[350px]">
                        {getMonthlyData.length > 0 ? (
                          <MonthlyBarChart data={getMonthlyData} />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center space-y-3">
                            <div className="bg-muted rounded-full p-4">
                              <TrendingUp className="text-muted-foreground h-8 w-8" />
                            </div>
                            <div className="space-y-1 text-center">
                              <p className="text-muted-foreground font-medium">No monthly data</p>
                              <p className="text-muted-foreground/70 text-sm">
                                Add expenses to see monthly trends
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Enhanced Category Distribution Chart */}
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{ y: -5 }}
                    className="group"
                  >
                    <Card className="dark:via-background relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50/80 via-white to-green-50/80 shadow-lg transition-all duration-500 hover:shadow-2xl dark:from-emerald-950/30 dark:to-green-950/30">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-green-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <CardHeader className="relative z-10">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <CardTitle className="flex items-center gap-3 text-lg font-bold">
                              <motion.div
                                className="rounded-full bg-gradient-to-br from-emerald-100 to-green-100 p-2 dark:from-emerald-900/30 dark:to-green-900/30"
                                animate={{ scale: [1, 1.1, 1], rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
                              >
                                <PieChart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                              </motion.div>
                              <span className="bg-gradient-to-r from-emerald-700 to-green-700 bg-clip-text text-transparent dark:from-emerald-300 dark:to-green-300">
                                Category Breakdown
                              </span>
                            </CardTitle>
                            <CardDescription className="text-sm">
                              Spending distribution across{" "}
                              <span className="text-primary font-medium">
                                {Object.keys(expensesByCategory).length} categories
                              </span>
                            </CardDescription>
                          </div>
                          <div className="space-y-1 text-right">
                            <div className="text-muted-foreground text-xs">Top Category</div>
                            <div className="max-w-[100px] truncate text-sm font-bold text-emerald-600 dark:text-emerald-400">
                              {topCategory?.name || "None"}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="relative z-10 h-[350px]">
                        {pieChartData.length > 0 ? (
                          <CategoryPieChart data={pieChartData} />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center space-y-3">
                            <div className="bg-muted rounded-full p-4">
                              <PieChart className="text-muted-foreground h-8 w-8" />
                            </div>
                            <div className="space-y-1 text-center">
                              <p className="text-muted-foreground font-medium">No spending data</p>
                              <p className="text-muted-foreground/70 text-sm">
                                Add expenses to see category breakdown
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>

                {/* AI Insights and Quick Stats */}
                <motion.div
                  className="grid gap-6 lg:grid-cols-3"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.5 }}
                >
                  {/* Enhanced AI Insights */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="lg:col-span-2"
                  >
                    <AIInsights
                      expenses={expenses}
                      className="h-full border-0 shadow-lg transition-all duration-500 hover:shadow-2xl"
                    />
                  </motion.div>

                  {/* Quick Spending Summary */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 }}
                    whileHover={{ y: -3 }}
                    className="group"
                  >
                    <Card className="dark:via-background relative h-full overflow-hidden border-0 bg-gradient-to-br from-purple-50/80 via-white to-violet-50/80 shadow-lg transition-all duration-500 hover:shadow-2xl dark:from-purple-950/30 dark:to-violet-950/30">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-violet-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <CardHeader className="relative z-10">
                        <CardTitle className="flex items-center gap-3 text-lg font-bold">
                          <motion.div
                            className="rounded-full bg-gradient-to-br from-purple-100 to-violet-100 p-2 dark:from-purple-900/30 dark:to-violet-900/30"
                            animate={{
                              scale: [1, 1.05, 1],
                              rotate: [0, 2, -2, 0],
                            }}
                            transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
                          >
                            <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </motion.div>
                          <span className="bg-gradient-to-r from-purple-700 to-violet-700 bg-clip-text text-transparent dark:from-purple-300 dark:to-violet-300">
                            Quick Stats
                          </span>
                        </CardTitle>
                        <CardDescription>At-a-glance spending metrics</CardDescription>
                      </CardHeader>
                      <CardContent className="relative z-10 space-y-6">
                        {/* Daily Average */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Daily Average</span>
                            <span className="font-medium">
                              {formatCurrency(totalExpenses / 30)}
                            </span>
                          </div>
                          <div className="bg-muted h-1 overflow-hidden rounded-full">
                            <motion.div
                              className="h-full bg-gradient-to-r from-purple-500 to-violet-500"
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.min(100, (totalExpenses / 30 / 100) * 100)}%`,
                              }}
                              transition={{ delay: 1, duration: 1 }}
                            />
                          </div>
                        </div>

                        {/* Weekly Trend */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">This Week</span>
                            <span className="font-medium">{formatCurrency(currentWeek)}</span>
                          </div>
                          <div className="bg-muted h-1 overflow-hidden rounded-full">
                            <motion.div
                              className="h-full bg-gradient-to-r from-emerald-500 to-green-500"
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.min(100, (currentWeek / (totalExpenses / 4)) * 100)}%`,
                              }}
                              transition={{ delay: 1.2, duration: 1 }}
                            />
                          </div>
                        </div>

                        {/* Transaction Frequency */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Transactions</span>
                            <span className="font-medium">{transactionCount}</span>
                          </div>
                          <div className="bg-muted h-1 overflow-hidden rounded-full">
                            <motion.div
                              className="h-full bg-gradient-to-r from-orange-500 to-amber-500"
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.min(100, (transactionCount / 100) * 100)}%`,
                              }}
                              transition={{ delay: 1.4, duration: 1 }}
                            />
                          </div>
                        </div>

                        {/* Spending Velocity */}
                        <div className="space-y-3 border-t pt-4">
                          <div className="text-center">
                            <div className="bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-2xl font-bold text-transparent">
                              {expenses.length > 0
                                ? Math.round((currentMonth / previousMonth || 1) * 100)
                                : 0}
                              %
                            </div>
                            <div className="text-muted-foreground text-xs">vs last month</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              </TabsContent>

              <TabsContent
                value="analytics"
                className="space-y-6"
                role="tabpanel"
                id="analytics-content"
                aria-labelledby="analytics-tab"
              >
                {/* Enhanced Analytics Header */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-2 text-center"
                >
                  <h2 className="from-primary bg-gradient-to-r via-purple-600 to-pink-600 bg-clip-text text-2xl font-semibold text-transparent">
                    Advanced Analytics
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Deep dive into your spending patterns and behaviors
                  </p>
                </motion.div>

                {/* Key Insights Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <Card className="dark:via-background group relative overflow-hidden border-0 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 shadow-lg transition-all duration-500 hover:shadow-2xl dark:from-indigo-950/30 dark:to-purple-950/30">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <CardHeader className="relative z-10">
                      <CardTitle className="flex items-center gap-3 text-lg font-bold">
                        <motion.div
                          className="rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 p-3 dark:from-indigo-900/30 dark:to-purple-900/30"
                          animate={{
                            scale: [1, 1.05, 1],
                            rotate: [0, 3, -3, 0],
                          }}
                          transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
                        >
                          <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </motion.div>
                        <span className="bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent dark:from-indigo-300 dark:to-purple-300">
                          Smart Insights
                        </span>
                      </CardTitle>
                      <CardDescription>
                        AI-powered observations about your spending habits
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      {loading ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="animate-pulse">
                              <div className="bg-muted mb-2 h-4 w-3/4 rounded"></div>
                              <div className="bg-muted/70 h-3 w-1/2 rounded"></div>
                            </div>
                          ))}
                        </div>
                      ) : expenses.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          {getInsights.map((insight, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="group/insight from-background/50 to-muted/30 border-border/50 rounded-lg border bg-gradient-to-r p-4 transition-all duration-300 hover:shadow-md"
                            >
                              <div className="flex items-start gap-3">
                                <motion.div
                                  className="bg-primary/10 mt-1 rounded-full p-2"
                                  whileHover={{ scale: 1.1 }}
                                >
                                  <Eye className="text-primary h-4 w-4" />
                                </motion.div>
                                <div className="flex-1">
                                  <p className="text-foreground group-hover/insight:text-primary text-sm font-medium transition-colors">
                                    {insight}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-12 text-center">
                          <div className="bg-muted mb-4 inline-block rounded-full p-4">
                            <Sparkles className="text-muted-foreground h-8 w-8" />
                          </div>
                          <p className="text-muted-foreground font-medium">
                            No insights available yet
                          </p>
                          <p className="text-muted-foreground/70 mt-1 text-sm">
                            Add more expenses to unlock AI-powered insights
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Enhanced Charts Grid */}
                <motion.div
                  className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                >
                  {/* Spending Trends Chart */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{ y: -5 }}
                    className="group"
                  >
                    <Card className="dark:via-background relative overflow-hidden border-0 bg-gradient-to-br from-blue-50/80 via-white to-cyan-50/80 shadow-lg transition-all duration-500 hover:shadow-2xl dark:from-blue-950/30 dark:to-cyan-950/30">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <CardHeader className="relative z-10">
                        <CardTitle className="flex items-center gap-3 text-lg font-bold">
                          <motion.div
                            className="rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 p-2 dark:from-blue-900/30 dark:to-cyan-900/30"
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                          >
                            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </motion.div>
                          <span className="bg-gradient-to-r from-blue-700 to-cyan-700 bg-clip-text text-transparent dark:from-blue-300 dark:to-cyan-300">
                            Spending Trends
                          </span>
                        </CardTitle>
                        <CardDescription>Monthly progression and patterns</CardDescription>
                      </CardHeader>
                      <CardContent className="relative z-10 h-[350px]">
                        {loading ? (
                          <div className="flex h-full items-center justify-center">
                            <ChartLoadingSpinner />
                          </div>
                        ) : calculateMonthlyTrends.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={calculateMonthlyTrends}
                              margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="month" />
                              <YAxis tickFormatter={formatValue} />
                              <Tooltip content={<CustomTooltip />} />
                              <Area
                                type="monotone"
                                dataKey="amount"
                                stroke="#3B82F6"
                                fill="url(#blueGradient)"
                                strokeWidth={2}
                              />
                              <defs>
                                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                                </linearGradient>
                              </defs>
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center space-y-3">
                            <div className="bg-muted rounded-full p-4">
                              <TrendingUp className="text-muted-foreground h-8 w-8" />
                            </div>
                            <div className="space-y-1 text-center">
                              <p className="text-muted-foreground font-medium">No trend data</p>
                              <p className="text-muted-foreground/70 text-sm">
                                Add expenses to see spending trends
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Day of Week Spending */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    whileHover={{ y: -5 }}
                    className="group"
                  >
                    <Card className="dark:via-background relative overflow-hidden border-0 bg-gradient-to-br from-green-50/80 via-white to-emerald-50/80 shadow-lg transition-all duration-500 hover:shadow-2xl dark:from-green-950/30 dark:to-emerald-950/30">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <CardHeader className="relative z-10">
                        <CardTitle className="flex items-center gap-3 text-lg font-bold">
                          <motion.div
                            className="rounded-full bg-gradient-to-br from-green-100 to-emerald-100 p-2 dark:from-green-900/30 dark:to-emerald-900/30"
                            animate={{
                              scale: [1, 1.1, 1],
                              rotate: [0, 5, -5, 0],
                            }}
                            transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
                          >
                            <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </motion.div>
                          <span className="bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent dark:from-green-300 dark:to-emerald-300">
                            Weekly Patterns
                          </span>
                        </CardTitle>
                        <CardDescription>Your spending by day of the week</CardDescription>
                      </CardHeader>
                      <CardContent className="relative z-10 h-[350px]">
                        {loading ? (
                          <div className="flex h-full items-center justify-center">
                            <ChartLoadingSpinner />
                          </div>
                        ) : dayOfWeekSpending.some((day) => day.amount > 0) ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={dayOfWeekSpending}
                              margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                              layout="vertical"
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                horizontal={true}
                                vertical={false}
                              />
                              <XAxis type="number" tickFormatter={formatValue} />
                              <YAxis type="category" dataKey="day" width={80} />
                              <Tooltip content={<CustomTooltip />} />
                              <Bar dataKey="amount" fill="#10B981" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center space-y-3">
                            <div className="bg-muted rounded-full p-4">
                              <BarChart3 className="text-muted-foreground h-8 w-8" />
                            </div>
                            <div className="space-y-1 text-center">
                              <p className="text-muted-foreground font-medium">No weekly data</p>
                              <p className="text-muted-foreground/70 text-sm">
                                Add expenses to see weekly patterns
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Category Radar Chart */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    whileHover={{ y: -5 }}
                    className="group"
                  >
                    <Card className="dark:via-background relative overflow-hidden border-0 bg-gradient-to-br from-orange-50/80 via-white to-red-50/80 shadow-lg transition-all duration-500 hover:shadow-2xl dark:from-orange-950/30 dark:to-red-950/30">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <CardHeader className="relative z-10">
                        <CardTitle className="flex items-center gap-3 text-lg font-bold">
                          <motion.div
                            className="rounded-full bg-gradient-to-br from-orange-100 to-red-100 p-2 dark:from-orange-900/30 dark:to-red-900/30"
                            animate={{ rotate: [0, -10, 10, 0] }}
                            transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }}
                          >
                            <Target className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          </motion.div>
                          <span className="bg-gradient-to-r from-orange-700 to-red-700 bg-clip-text text-transparent dark:from-orange-300 dark:to-red-300">
                            Category Radar
                          </span>
                        </CardTitle>
                        <CardDescription>Spending distribution visualization</CardDescription>
                      </CardHeader>
                      <CardContent className="relative z-10 h-[350px]">
                        {loading ? (
                          <div className="flex h-full items-center justify-center">
                            <ChartLoadingSpinner />
                          </div>
                        ) : categoryPercentages.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart
                              cx="50%"
                              cy="50%"
                              outerRadius="80%"
                              data={categoryPercentages}
                            >
                              <PolarGrid />
                              <PolarAngleAxis dataKey="category" />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} />
                              <Radar
                                name="Spending %"
                                dataKey="percentage"
                                stroke="#F59E0B"
                                fill="#F59E0B"
                                fillOpacity={0.3}
                                strokeWidth={2}
                              />
                              <Tooltip formatter={tooltipFormatter} />
                            </RadarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center space-y-3">
                            <div className="bg-muted rounded-full p-4">
                              <Target className="text-muted-foreground h-8 w-8" />
                            </div>
                            <div className="space-y-1 text-center">
                              <p className="text-muted-foreground font-medium">No category data</p>
                              <p className="text-muted-foreground/70 text-sm">
                                Add expenses to see category distribution
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              </TabsContent>

              <TabsContent
                value="recent"
                className="space-y-6"
                role="tabpanel"
                id="recent-content"
                aria-labelledby="recent-tab"
              >
                {/* Enhanced Recent Expenses Header */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-2 text-center"
                >
                  <h2 className="from-primary bg-gradient-to-r via-emerald-600 to-blue-600 bg-clip-text text-2xl font-semibold text-transparent">
                    Recent Activity
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Your latest expenses and spending activity
                  </p>
                </motion.div>

                {/* Quick Stats Row */}
                <motion.div
                  className="grid gap-4 md:grid-cols-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <motion.div whileHover={{ scale: 1.02 }} className="group">
                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 transition-all duration-300 hover:shadow-lg dark:from-blue-950/20 dark:to-indigo-950/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <motion.div
                            className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30"
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                          >
                            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </motion.div>
                          <div>
                            <p className="text-muted-foreground text-sm font-medium">
                              Recent Count
                            </p>
                            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                              {recentExpenses.length}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.02 }} className="group">
                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-50/50 to-emerald-50/50 transition-all duration-300 hover:shadow-lg dark:from-green-950/20 dark:to-emerald-950/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <motion.div
                            className="rounded-full bg-green-100 p-2 dark:bg-green-900/30"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                          >
                            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </motion.div>
                          <div>
                            <p className="text-muted-foreground text-sm font-medium">Total Value</p>
                            <p className="text-xl font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(
                                recentExpenses.reduce((sum, exp) => sum + exp.amount, 0),
                              )}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.02 }} className="group">
                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-50/50 to-violet-50/50 transition-all duration-300 hover:shadow-lg dark:from-purple-950/20 dark:to-violet-950/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <motion.div
                            className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30"
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                          >
                            <CreditCard className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </motion.div>
                          <div>
                            <p className="text-muted-foreground text-sm font-medium">Average</p>
                            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                              {formatCurrency(
                                recentExpenses.length > 0
                                  ? recentExpenses.reduce((sum, exp) => sum + exp.amount, 0) /
                                      recentExpenses.length
                                  : 0,
                              )}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.02 }} className="group">
                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-50/50 to-amber-50/50 transition-all duration-300 hover:shadow-lg dark:from-orange-950/20 dark:to-amber-950/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <motion.div
                            className="rounded-full bg-orange-100 p-2 dark:bg-orange-900/30"
                            animate={{
                              scale: [1, 1.1, 1],
                              rotate: [0, 10, -10, 0],
                            }}
                            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                          >
                            <Activity className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          </motion.div>
                          <div>
                            <p className="text-muted-foreground text-sm font-medium">Most Recent</p>
                            <p className="truncate text-sm font-bold text-orange-600 dark:text-orange-400">
                              {recentExpenses.length > 0
                                ? recentExpenses[0].date.toLocaleDateString()
                                : "None"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>

                {/* Enhanced Recent Expenses List */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                >
                  <Card className="dark:via-background group relative overflow-hidden border-0 bg-gradient-to-br from-slate-50/80 via-white to-gray-50/80 shadow-lg transition-all duration-500 hover:shadow-2xl dark:from-slate-950/30 dark:to-gray-950/30">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 via-transparent to-gray-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <CardHeader className="relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <CardTitle className="flex items-center gap-3 text-lg font-bold">
                            <motion.div
                              className="rounded-full bg-gradient-to-br from-slate-100 to-gray-100 p-3 dark:from-slate-900/30 dark:to-gray-900/30"
                              animate={{
                                scale: [1, 1.05, 1],
                                rotate: [0, 2, -2, 0],
                              }}
                              transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }}
                            >
                              <Clock className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                            </motion.div>
                            <span className="bg-gradient-to-r from-slate-700 to-gray-700 bg-clip-text text-transparent dark:from-slate-300 dark:to-gray-300">
                              Recent Expenses
                            </span>
                          </CardTitle>
                          <CardDescription>
                            Your latest {recentExpenses.length} transactions
                          </CardDescription>
                        </div>
                        <div className="space-y-1 text-right">
                          <div className="text-muted-foreground text-xs">Quick Actions</div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link href="/expenses" className="text-xs">
                                <Filter className="mr-1 h-3 w-3" />
                                View All
                              </Link>
                            </Button>
                            <Button size="sm" asChild>
                              <Link href="/expenses?add=true" className="text-xs">
                                <Plus className="mr-1 h-3 w-3" />
                                Add New
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      {loading ? (
                        <div className="space-y-4">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex animate-pulse items-center space-x-4">
                              <div className="bg-muted h-10 w-10 rounded-full"></div>
                              <div className="flex-1 space-y-2">
                                <div className="bg-muted h-4 w-3/4 rounded"></div>
                                <div className="bg-muted h-3 w-1/2 rounded"></div>
                              </div>
                              <div className="bg-muted h-4 w-20 rounded"></div>
                            </div>
                          ))}
                        </div>
                      ) : recentExpenses.length > 0 ? (
                        <div className="space-y-1">
                          <ExpenseList expenses={recentExpenses} />
                          {expenses.length > 10 && (
                            <motion.div
                              className="border-t pt-4"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.5 }}
                            >
                              <div className="text-center">
                                <Button variant="outline" asChild className="group">
                                  <Link href="/expenses" className="flex items-center gap-2">
                                    <Eye className="h-4 w-4 transition-transform group-hover:scale-110" />
                                    View All {expenses.length} Expenses
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                  </Link>
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      ) : (
                        <div className="py-12 text-center">
                          <div className="bg-muted mb-4 inline-block rounded-full p-4">
                            <Clock className="text-muted-foreground h-8 w-8" />
                          </div>
                          <p className="text-muted-foreground font-medium">No recent expenses</p>
                          <p className="text-muted-foreground/70 mt-1 text-sm">
                            Start adding expenses to see your recent activity
                          </p>
                          <div className="mt-4">
                            <Button asChild>
                              <Link href="/expenses?add=true" className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Add Your First Expense
                              </Link>
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            </Tabs>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </PageTransition>
  );
}
