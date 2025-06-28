"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllExpenses } from "@/lib/expenses";
import { formatCurrency } from "@/lib/utils";
import { ExpenseType } from "@/types/expense";
import ExpenseList from "@/components/expenses/ExpenseList";
import { ChartLoadingSpinner, PageLoadingSpinner } from "@/components/ui/loading-spinner";
import { ChartSuspense } from "@/components/SuspenseWrapper";
import { MonthlyBarChart, CategoryPieChart } from "@/components/analytics/LazyCharts";
import { handleError } from "@/lib/utils/errorHandler";
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart } from 'recharts';
import { EXPENSE_CATEGORIES } from "@/types/expense";
import Link from "next/link";
import { Plus, ArrowRight, TrendingUp, DollarSign, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { PageTransition, StaggerContainer, StaggerItem, ScaleIn } from "@/components/ui/page-transition";

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
      <div className="bg-background border rounded-lg p-2 shadow-lg">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-primary">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseType[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchExpenses = async () => {
      try {
        setLoading(true);
        // Get all expenses for analytics
        const allData = await getAllExpenses(user.uid);
        setExpenses(allData);
        
        // Get only recent expenses for the list view
        setRecentExpenses(allData.slice(0, 10));
      } catch (error) {
        handleError(error, 'Dashboard - fetching expenses');
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [user]);

  // Memoized calculations for performance
  const totalExpenses = useMemo(() => 
    expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses]
  );
  
  const expensesByCategory = useMemo(() => 
    expenses.reduce((acc, expense) => {
      const { category, amount } = expense;
      acc[category] = (acc[category] || 0) + amount;
      return acc;
    }, {} as Record<string, number>),
    [expenses]
  );
  
  // Memoized pie chart data preparation
  const pieChartData = useMemo(() => 
    Object.entries(expensesByCategory)
      .map(([name, value]) => {
        const category = EXPENSE_CATEGORIES.find(c => c.value === name);
        return {
          name: category ? category.label : name,
          value,
          originalValue: value
        };
      })
      .sort((a, b) => b.value - a.value)
      .reduce((acc: ChartData[], curr) => {
        const total = Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0);
        const percentage = (curr.value / total) * 100;
        
        if (acc.length < 5 || percentage > 3) {
          acc.push(curr);
        } else {
          const othersIndex = acc.findIndex(item => item.name === 'Others');
          if (othersIndex === -1) {
            acc.push({ name: 'Others', value: curr.value, originalValue: curr.value });
          } else {
            acc[othersIndex].value += curr.value;
            acc[othersIndex].originalValue! += curr.originalValue!;
          }
        }
        return acc;
      }, []),
    [expensesByCategory]
  );
  
  
  // Memoized monthly data calculation
  const getMonthlyData = useMemo(() => {
    const monthlyTotals: Record<string, number> = {};
    const now = new Date();
    
    // Initialize last 6 months with 0
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = month.toLocaleString('default', { month: 'short' });
      monthlyTotals[monthKey] = 0;
    }
    
    // Sum up expenses for each month
    expenses.forEach(expense => {
      const monthKey = expense.date.toLocaleString('default', { month: 'short' });
      if (monthlyTotals[monthKey] !== undefined) {
        monthlyTotals[monthKey] += expense.amount;
      }
    });
    
    // Convert to array format for chart
    return Object.entries(monthlyTotals).map(([name, amount]) => ({
      name,
      amount
    }));
  }, [expenses]);
  
  // Memoized monthly trends calculation
  const calculateMonthlyTrends = useMemo(() => {
    const monthlyTotals: Record<string, number> = {};
    
    // Group expenses by month
    expenses.forEach(expense => {
      const monthYear = expense.date.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyTotals[monthYear] = (monthlyTotals[monthYear] || 0) + expense.amount;
    });
    
    // Convert to array for chart
    return Object.entries(monthlyTotals).map(([month, amount]) => ({
      month,
      amount
    })).sort((a, b) => {
      // Sort by date (assuming format is "MMM YY")
      const [aMonth, aYear] = a.month.split(' ');
      const [bMonth, bYear] = b.month.split(' ');
      
      if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.indexOf(aMonth) - months.indexOf(bMonth);
    });
  }, [expenses]);
  
  // Memoized category percentages for radar chart
  const categoryPercentages = useMemo(() => {
    const total = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0);
    if (total === 0) return [];
    
    return Object.entries(expensesByCategory).map(([category, amount]) => {
      const cat = EXPENSE_CATEGORIES.find(c => c.value === category);
      return {
        category: cat ? cat.label : category,
        percentage: (amount / total) * 100
      };
    });
  }, [expensesByCategory]);
  
  // Memoized day of week spending patterns
  const dayOfWeekSpending = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayTotals = days.reduce((acc, day) => ({ ...acc, [day]: 0 }), {} as Record<string, number>);
    
    expenses.forEach(expense => {
      const day = days[expense.date.getDay()];
      dayTotals[day] = (dayTotals[day] || 0) + expense.amount;
    });
    
    return Object.entries(dayTotals).map(([day, amount]) => ({
      day,
      amount
    }));
  }, [expenses]);
  
  // Memoized spending insights
  const getInsights = useMemo(() => {
    if (expenses.length === 0) return [];
    
    const insights = [];
    
    // Highest spending category
    if (pieChartData.length > 0) {
      const highest = pieChartData.sort((a, b) => b.value - a.value)[0];
      insights.push(`Your highest spending category is ${highest.name} at ${formatCurrency(highest.value)}.`);
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
        insights.push(`Your spending increased by ${increase.toFixed(1)}% compared to the previous month.`);
      } else {
        const decrease = ((previousMonth.amount - lastMonth.amount) / previousMonth.amount) * 100;
        insights.push(`Your spending decreased by ${decrease.toFixed(1)}% compared to the previous month.`);
      }
    }
    
    return insights;
  }, [expenses, pieChartData, dayOfWeekSpending, totalExpenses, calculateMonthlyTrends]);

  // Update the type for the formatter function
  const formatValue = (value: number) => formatCurrency(value, { notation: 'compact' });

  // Add proper typing for the tooltip formatter
  const tooltipFormatter = (value: number) => `${Number(value).toFixed(1)}%`;


  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <StaggerContainer className="flex flex-col space-y-6">
          <StaggerItem>
            <motion.div 
              className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glassmorphism p-6 rounded-xl backdrop-blur-md"
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent" id="dashboard-title">
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
                <Button asChild variant="outline" className="hover:shadow-lg transition-all duration-200">
                  <Link href="/expenses" aria-label="View all expenses page">
                    <ArrowRight className="mr-2 h-4 w-4" aria-hidden="true" />
                    View All Expenses
                  </Link>
                </Button>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button asChild variant="default" className="shadow-lg hover:shadow-xl transition-all">
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" role="region" aria-label="Expense summary cards">
              <ScaleIn delay={0.1}>
                <Card variant="interactive" className="hover:shadow-xl transition-all duration-300 border-0 glassmorphism">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium" id="total-expenses-title">Total Expenses</CardTitle>
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    >
                      <DollarSign className="h-4 w-4 text-primary" />
                    </motion.div>
                  </CardHeader>
                  <CardContent>
                    <motion.div 
                      className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent" 
                      aria-labelledby="total-expenses-title"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                    >
                      {formatCurrency(totalExpenses)}
                    </motion.div>
                    <p className="text-xs text-muted-foreground mt-1">
                      For all time
                    </p>
                  </CardContent>
                </Card>
              </ScaleIn>
              
              <ScaleIn delay={0.2}>
                <Card variant="interactive" className="hover:shadow-xl transition-all duration-300 border-0 glassmorphism">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium" id="avg-monthly-title">Average Monthly</CardTitle>
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                    >
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </motion.div>
                  </CardHeader>
                  <CardContent>
                    <motion.div 
                      className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent" 
                      aria-labelledby="avg-monthly-title"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
                    >
                      {formatCurrency(totalExpenses / 6)}
                    </motion.div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Estimated
                    </p>
                  </CardContent>
                </Card>
              </ScaleIn>
              
              <ScaleIn delay={0.3}>
                <Card variant="interactive" className="hover:shadow-xl transition-all duration-300 border-0 glassmorphism">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium" id="total-categories-title">Total Categories</CardTitle>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                    >
                      <Target className="h-4 w-4 text-primary" />
                    </motion.div>
                  </CardHeader>
                  <CardContent>
                    <motion.div 
                      className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent" 
                      aria-labelledby="total-categories-title"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
                    >
                      {Object.keys(expensesByCategory).length}
                    </motion.div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Used so far
                    </p>
                  </CardContent>
                </Card>
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
                <TabsList role="tablist" aria-label="Dashboard content tabs" className="grid w-full grid-cols-3 glassmorphism">
                  <TabsTrigger value="overview" role="tab" aria-controls="overview-content" className="transition-all duration-200">Overview</TabsTrigger>
                  <TabsTrigger value="analytics" role="tab" aria-controls="analytics-content" className="transition-all duration-200">Analytics</TabsTrigger>
                  <TabsTrigger value="recent" role="tab" aria-controls="recent-content" className="transition-all duration-200">Recent Expenses</TabsTrigger>
                </TabsList>
              </motion.div>
        
              <TabsContent value="overview" className="space-y-4" role="tabpanel" id="overview-content" aria-labelledby="overview-tab">
                <motion.div 
                  className="grid gap-4 md:grid-cols-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card className="col-span-1 glassmorphism border-0 hover:shadow-xl transition-all duration-300">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          Monthly Expenses
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                          >
                            <TrendingUp className="h-4 w-4 text-primary" />
                          </motion.div>
                        </CardTitle>
                        <CardDescription>Your spending over the last 6 months</CardDescription>
                      </CardHeader>
                      <CardContent className="h-[300px]">
                        <ChartSuspense>
                          <MonthlyBarChart data={getMonthlyData} />
                        </ChartSuspense>
                      </CardContent>
                    </Card>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Card className="col-span-1 glassmorphism border-0 hover:shadow-xl transition-all duration-300">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          Expenses by Category
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 3, repeat: Infinity }}
                          >
                            <Target className="h-4 w-4 text-primary" />
                          </motion.div>
                        </CardTitle>
                        <CardDescription>Distribution of your spending</CardDescription>
                      </CardHeader>
                      <CardContent className="h-[300px]">
                        {pieChartData.length > 0 ? (
                          <ChartSuspense>
                            <CategoryPieChart data={pieChartData} />
                          </ChartSuspense>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-muted-foreground">No data available</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              </TabsContent>
          
          <TabsContent value="analytics" className="space-y-4" role="tabpanel" id="analytics-content" aria-labelledby="analytics-tab">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="col-span-2">
            <CardHeader>
                  <CardTitle>Spending Insights</CardTitle>
                  <CardDescription>
                    Key observations about your spending habits
                  </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                    <ChartLoadingSpinner />
                  ) : expenses.length > 0 ? (
                    <ul className="space-y-2">
                      {getInsights.map((insight, index) => (
                        <li key={index} className="flex items-start">
                          <div className="mr-2 mt-0.5 h-2 w-2 rounded-full bg-primary" />
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">Add more expenses to see insights about your spending habits.</p>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Spending Trends</CardTitle>
                  <CardDescription>How your spending has changed over time</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {loading ? (
                    <ChartLoadingSpinner />
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
                        <Area type="monotone" dataKey="amount" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">Not enough data to show trends</p>
                  </div>
              )}
            </CardContent>
          </Card>
        
            <Card>
              <CardHeader>
                  <CardTitle>Spending by Day of Week</CardTitle>
                  <CardDescription>Which days you spend the most</CardDescription>
              </CardHeader>
                <CardContent className="h-[300px]">
                  {loading ? (
                    <ChartLoadingSpinner />
                  ) : dayOfWeekSpending.some(day => day.amount > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dayOfWeekSpending}
                        margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" tickFormatter={formatValue} />
                        <YAxis type="category" dataKey="day" width={80} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="amount" fill="#82ca9d" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                  <CardTitle>Category Distribution</CardTitle>
                  <CardDescription>Spending breakdown by category</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {loading ? (
                    <ChartLoadingSpinner />
                  ) : categoryPercentages.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={categoryPercentages}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="category" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar name="Spending %" dataKey="percentage" stroke="#FF8042" fill="#FF8042" fillOpacity={0.6} />
                        <Tooltip formatter={tooltipFormatter} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="recent" role="tabpanel" id="recent-content" aria-labelledby="recent-tab">
            <Card>
              <CardHeader>
                <CardTitle>Recent Expenses</CardTitle>
                <CardDescription>
                  Your most recent expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <PageLoadingSpinner message="Loading recent expenses..." />
                ) : (
                  <ExpenseList expenses={recentExpenses} />
                )}
              </CardContent>
            </Card>
            </TabsContent>
            </Tabs>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </PageTransition>
  );
} 