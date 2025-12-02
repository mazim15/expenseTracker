"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAllExpenses } from "@/lib/expenses";
import { ExpenseType, EXPENSE_CATEGORIES } from "@/types/expense";
import MonthlyBarChart from "@/components/analytics/MonthlyBarChart";
import CategoryPieChart from "@/components/analytics/CategoryPieChart";
import { formatCurrency } from "@/lib/utils";
import {
  CalendarIcon,
  TrendingUp,
  PieChart,
  BarChart3,
  Clock,
  Wallet,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Sparkles
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { motion } from "framer-motion";
import { PageTransition, StaggerContainer, StaggerItem, ScaleIn } from "@/components/ui/page-transition";
import { useLogger } from "@/lib/hooks/useLogger";
import AIInsights from "@/components/analytics/AIInsights";
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';

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
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-primary">
          {formatCurrency(payload[0].value)}
        </p>
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

    // Log page visit
    logAction('page_visited', {
      page: 'analytics',
      timestamp: new Date().toISOString()
    });

    fetchExpenses();
  }, [user, logAction, fetchExpenses]);

  // Enhanced calculations with memoization
  const analytics = useMemo(() => {
    if (expenses.length === 0) return null;

    const now = new Date();
    const currentMonth = startOfMonth(now);
    const previousMonth = startOfMonth(subMonths(now, 1));

    // Filter expenses by periods
    const currentMonthExpenses = expenses.filter(expense =>
      expense.date >= currentMonth && expense.date <= endOfMonth(currentMonth)
    );
    const previousMonthExpenses = expenses.filter(expense =>
      expense.date >= previousMonth && expense.date <= endOfMonth(previousMonth)
    );

    // Totals
    const currentTotal = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const previousTotal = previousMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalAllTime = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Growth calculations
    const monthOverMonthGrowth = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
    
    // Category analysis
    const categoryTotals: Record<string, number> = {};
    currentMonthExpenses.forEach(expense => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });
    
    const topCategories = Object.entries(categoryTotals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Time-based analysis
    const averageDaily = currentMonthExpenses.length > 0 ? currentTotal / now.getDate() : 0;
    const averageTransaction = expenses.length > 0 ? totalAllTime / expenses.length : 0;
    
    // Find extremes
    const highestExpense = expenses.reduce((max, expense) => 
      expense.amount > max.amount ? expense : max, expenses[0]
    );
    const lowestExpense = expenses.reduce((min, expense) => 
      expense.amount < min.amount ? expense : min, expenses[0]
    );

    // Monthly trend data for charts
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(now, i);
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthExpenses = expenses.filter(expense => 
        expense.date >= monthStart && expense.date <= monthEnd
      );
      const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      monthlyData.push({
        name: format(month, 'MMM'),
        amount: monthTotal,
        count: monthExpenses.length
      });
    }

    // Category distribution for pie chart
    const categoryData = Object.entries(categoryTotals)
      .map(([category, amount]) => {
        const categoryInfo = EXPENSE_CATEGORIES.find(c => c.value === category);
        return {
          name: categoryInfo?.label || category,
          value: amount,
          originalValue: amount
        };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    // Weekly spending pattern
    const weeklyPattern = Array.from({ length: 7 }, (_, index) => {
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index];
      const dayTotal = expenses
        .filter(expense => expense.date.getDay() === index)
        .reduce((sum, expense) => sum + expense.amount, 0);
      
      return { day: dayName, amount: dayTotal };
    });

    return {
      currentMonth: {
        total: currentTotal,
        expenses: currentMonthExpenses,
        count: currentMonthExpenses.length
      },
      previousMonth: {
        total: previousTotal,
        expenses: previousMonthExpenses
      },
      growth: {
        monthOverMonth: monthOverMonthGrowth,
        isIncrease: monthOverMonthGrowth > 0
      },
      categories: {
        top: topCategories,
        distribution: categoryData
      },
      metrics: {
        totalAllTime,
        averageDaily,
        averageTransaction,
        highestExpense,
        lowestExpense,
        totalTransactions: expenses.length
      },
      charts: {
        monthlyTrend: monthlyData,
        weeklyPattern
      }
    };
  }, [expenses]);

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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <StaggerContainer className="flex flex-col space-y-8">
          {/* Enhanced Header */}
          <StaggerItem>
            <motion.div 
              className="relative overflow-hidden"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-50" />
              <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-gradient-to-r from-background/80 via-background/90 to-background/80 backdrop-blur-sm p-8 rounded-2xl border shadow-lg">
                <div>
                  <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Analytics Hub
                  </h1>
                  <p className="text-muted-foreground mt-3 text-lg max-w-2xl">
                    Deep insights into your spending patterns, trends, and financial behavior
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={fetchExpenses} variant="outline" disabled={loading} className="group">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    Refresh Data
                  </Button>
                  <Button variant="outline" className="group">
                    <Download className="h-4 w-4 mr-2 group-hover:translate-y-0.5 transition-transform" />
                    Export Report
                  </Button>
                </div>
              </div>
            </motion.div>
          </StaggerItem>

          {loading ? (
            <StaggerItem>
              <div className="flex justify-center items-center h-64">
                <div className="space-y-4 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/30 border-t-primary mx-auto"></div>
                  <p className="text-muted-foreground">Loading your financial insights...</p>
                </div>
              </div>
            </StaggerItem>
          ) : !analytics ? (
            <StaggerItem>
              <Card className="text-center py-16">
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-full bg-muted inline-block">
                      <BarChart3 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">No Data Available</h3>
                      <p className="text-muted-foreground">Start adding expenses to see your analytics</p>
                    </div>
                    <Button asChild>
                      <a href="/expenses?add=true">Add Your First Expense</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ) : (
            <>
              {/* Enhanced Metrics Cards */}
              <StaggerItem>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  {/* Current Month */}
                  <ScaleIn delay={0.1}>
                    <motion.div whileHover={{ y: -5 }} className="group">
                      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/80 dark:from-blue-950/30 dark:via-background dark:to-indigo-950/30 shadow-lg hover:shadow-2xl transition-all duration-500">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                          <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                            This Month
                          </CardTitle>
                          <motion.div
                            className="p-3 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30"
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }}
                          >
                            <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </motion.div>
                        </CardHeader>
                        <CardContent className="relative z-10 space-y-2">
                          <motion.div 
                            className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                          >
                            {formatCurrency(analytics.currentMonth.total)}
                          </motion.div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{format(new Date(), "MMMM yyyy")}</span>
                            <Badge variant="secondary" className="text-blue-600 bg-blue-100 dark:bg-blue-900/30">
                              {analytics.currentMonth.count} expenses
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </ScaleIn>

                  {/* Growth Comparison */}
                  <ScaleIn delay={0.2}>
                    <motion.div whileHover={{ y: -5 }} className="group">
                      <Card className={`relative overflow-hidden border-0 ${analytics.growth.isIncrease 
                        ? 'bg-gradient-to-br from-red-50/80 via-white to-orange-50/80 dark:from-red-950/30 dark:via-background dark:to-orange-950/30' 
                        : 'bg-gradient-to-br from-green-50/80 via-white to-emerald-50/80 dark:from-green-950/30 dark:via-background dark:to-emerald-950/30'
                      } shadow-lg hover:shadow-2xl transition-all duration-500`}>
                        <div className={`absolute inset-0 ${analytics.growth.isIncrease 
                          ? 'bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5' 
                          : 'bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5'
                        } opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                          <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                            vs Last Month
                          </CardTitle>
                          <motion.div
                            className={`p-3 rounded-full ${analytics.growth.isIncrease 
                              ? 'bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30' 
                              : 'bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30'
                            }`}
                            animate={{ 
                              y: analytics.growth.isIncrease ? [-2, 2, -2] : [2, -2, 2],
                              scale: [1, 1.1, 1]
                            }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                          >
                            {analytics.growth.isIncrease ? (
                              <ArrowUp className="h-5 w-5 text-red-600 dark:text-red-400" />
                            ) : (
                              <ArrowDown className="h-5 w-5 text-green-600 dark:text-green-400" />
                            )}
                          </motion.div>
                        </CardHeader>
                        <CardContent className="relative z-10 space-y-2">
                          <motion.div 
                            className={`text-3xl font-bold ${analytics.growth.isIncrease 
                              ? 'text-red-600 dark:text-red-400' 
                              : 'text-green-600 dark:text-green-400'
                            }`}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                          >
                            {analytics.growth.isIncrease ? '+' : ''}{Math.abs(analytics.growth.monthOverMonth).toFixed(1)}%
                          </motion.div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {analytics.growth.isIncrease ? 'Increase' : 'Decrease'} from {formatCurrency(analytics.previousMonth.total)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </ScaleIn>

                  {/* Average Daily */}
                  <ScaleIn delay={0.3}>
                    <motion.div whileHover={{ y: -5 }} className="group">
                      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-50/80 via-white to-violet-50/80 dark:from-purple-950/30 dark:via-background dark:to-violet-950/30 shadow-lg hover:shadow-2xl transition-all duration-500">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                          <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                            Daily Average
                          </CardTitle>
                          <motion.div
                            className="p-3 rounded-full bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                          >
                            <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </motion.div>
                        </CardHeader>
                        <CardContent className="relative z-10 space-y-2">
                          <motion.div 
                            className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-purple-700 bg-clip-text text-transparent"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                          >
                            {formatCurrency(analytics.metrics.averageDaily)}
                          </motion.div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Based on {new Date().getDate()} days</span>
                            <span className="text-purple-600 font-medium">This month</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </ScaleIn>

                  {/* Total All Time */}
                  <ScaleIn delay={0.4}>
                    <motion.div whileHover={{ y: -5 }} className="group">
                      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/80 dark:from-orange-950/30 dark:via-background dark:to-amber-950/30 shadow-lg hover:shadow-2xl transition-all duration-500">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                          <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                            All Time Total
                          </CardTitle>
                          <motion.div
                            className="p-3 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30"
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                          >
                            <Wallet className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          </motion.div>
                        </CardHeader>
                        <CardContent className="relative z-10 space-y-2">
                          <motion.div 
                            className="text-3xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 bg-clip-text text-transparent"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
                          >
                            {formatCurrency(analytics.metrics.totalAllTime)}
                          </motion.div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Across {analytics.metrics.totalTransactions} expenses</span>
                            <Badge variant="secondary" className="text-orange-600 bg-orange-100 dark:bg-orange-900/30">
                              All time
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </ScaleIn>
                </div>
              </StaggerItem>

              {/* Enhanced Charts Section */}
              <StaggerItem>
                <Tabs defaultValue="trends" className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <TabsList className="grid w-full grid-cols-4 h-auto glassmorphism">
                      <TabsTrigger value="trends" className="py-3 px-4 text-sm font-medium">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Trends
                      </TabsTrigger>
                      <TabsTrigger value="categories" className="py-3 px-4 text-sm font-medium">
                        <PieChart className="h-4 w-4 mr-2" />
                        Categories
                      </TabsTrigger>
                      <TabsTrigger value="patterns" className="py-3 px-4 text-sm font-medium">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Patterns
                      </TabsTrigger>
                      <TabsTrigger value="insights" className="py-3 px-4 text-sm font-medium">
                        <Sparkles className="h-4 w-4 mr-2" />
                        AI Insights
                      </TabsTrigger>
                    </TabsList>
                  </motion.div>

                  {/* Trends Tab */}
                  <TabsContent value="trends" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <Card className="h-full">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                              <TrendingUp className="h-5 w-5 text-blue-600" />
                              6-Month Spending Trend
                            </CardTitle>
                            <CardDescription>Monthly spending progression over time</CardDescription>
                          </CardHeader>
                          <CardContent className="h-[400px]">
                            <MonthlyBarChart data={analytics.charts.monthlyTrend} />
                          </CardContent>
                        </Card>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                      >
                        <Card className="h-full">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                              <BarChart3 className="h-5 w-5 text-green-600" />
                              Weekly Pattern
                            </CardTitle>
                            <CardDescription>Your spending habits by day of the week</CardDescription>
                          </CardHeader>
                          <CardContent className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={analytics.charts.weeklyPattern} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" tickFormatter={(value) => formatCurrency(value, { notation: 'compact' })} />
                                <YAxis type="category" dataKey="day" width={80} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="amount" fill="#10B981" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </div>
                  </TabsContent>

                  {/* Categories Tab */}
                  <TabsContent value="categories" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="lg:col-span-2"
                      >
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                              <PieChart className="h-5 w-5 text-purple-600" />
                              Category Distribution
                            </CardTitle>
                            <CardDescription>This month&apos;s spending breakdown by category</CardDescription>
                          </CardHeader>
                          <CardContent className="h-[400px]">
                            <CategoryPieChart data={analytics.categories.distribution} />
                          </CardContent>
                        </Card>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 }}
                      >
                        <Card className="h-full">
                          <CardHeader>
                            <CardTitle>Top Categories</CardTitle>
                            <CardDescription>Your biggest spending areas</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {analytics.categories.top.map((cat, index) => {
                              const category = EXPENSE_CATEGORIES.find(c => c.value === cat.category);
                              return (
                                <motion.div
                                  key={cat.category}
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.7 + index * 0.1 }}
                                  className="flex justify-between items-center p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div 
                                      className="w-4 h-4 rounded-full"
                                      style={{ backgroundColor: getCategoryColor(cat.category) }}
                                    />
                                    <span className="font-medium">{category?.label || cat.category}</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold">{formatCurrency(cat.amount)}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {((cat.amount / analytics.currentMonth.total) * 100).toFixed(1)}%
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </CardContent>
                        </Card>
                      </motion.div>
                    </div>
                  </TabsContent>

                  {/* Patterns Tab */}
                  <TabsContent value="patterns" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <Card>
                          <CardHeader>
                            <CardTitle>Expense Range Analysis</CardTitle>
                            <CardDescription>Your spending range this month</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                                <div className="text-2xl font-bold text-red-600">{formatCurrency(analytics.metrics.highestExpense.amount)}</div>
                                <div className="text-xs text-muted-foreground">Highest Expense</div>
                                <div className="text-xs text-muted-foreground truncate mt-1">{analytics.metrics.highestExpense.description}</div>
                              </div>
                              <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">{formatCurrency(analytics.metrics.lowestExpense.amount)}</div>
                                <div className="text-xs text-muted-foreground">Lowest Expense</div>
                                <div className="text-xs text-muted-foreground truncate mt-1">{analytics.metrics.lowestExpense.description}</div>
                              </div>
                            </div>
                            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">{formatCurrency(analytics.metrics.averageTransaction)}</div>
                              <div className="text-xs text-muted-foreground">Average Transaction</div>
                              <div className="text-xs text-muted-foreground">Across all {analytics.metrics.totalTransactions} expenses</div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                      >
                        <Card>
                          <CardHeader>
                            <CardTitle>Spending Velocity</CardTitle>
                            <CardDescription>How your spending pace compares</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            <div className="space-y-4">
                              <div>
                                <div className="flex justify-between text-sm mb-2">
                                  <span>This Month Progress</span>
                                  <span className="font-medium">{new Date().getDate()} of {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()} days</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div 
                                    className="bg-primary h-2 rounded-full transition-all duration-1000"
                                    style={{ width: `${(new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100}%` }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-sm mb-2">
                                  <span>Budget Utilization</span>
                                  <span className="font-medium">Estimated</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div 
                                    className="bg-gradient-to-r from-green-500 to-yellow-500 h-2 rounded-full transition-all duration-1000"
                                    style={{ width: '68%' }}
                                  />
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">68% of estimated budget used</div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="text-center p-3 bg-muted/30 rounded-lg">
                                  <div className="text-lg font-bold text-purple-600">{analytics.currentMonth.count}</div>
                                  <div className="text-xs text-muted-foreground">Transactions</div>
                                </div>
                                <div className="text-center p-3 bg-muted/30 rounded-lg">
                                  <div className="text-lg font-bold text-orange-600">{(analytics.currentMonth.count / new Date().getDate()).toFixed(1)}</div>
                                  <div className="text-xs text-muted-foreground">Per Day</div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </div>
                  </TabsContent>

                  {/* AI Insights Tab */}
                  <TabsContent value="insights" className="space-y-6">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <AIInsights 
                        expenses={expenses}
                        className="shadow-lg hover:shadow-2xl transition-all duration-500"
                      />
                    </motion.div>
                  </TabsContent>
                </Tabs>
              </StaggerItem>
            </>
          )}
        </StaggerContainer>
      </div>
    </PageTransition>
  );
} 