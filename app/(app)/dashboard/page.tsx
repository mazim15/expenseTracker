"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getExpenses } from "@/lib/expenses";
import { formatCurrency } from "@/lib/utils";
import { ExpenseType } from "@/types/expense";
import ExpenseList from "@/components/expenses/ExpenseList";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { EXPENSE_CATEGORIES } from "@/types/expense";
import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        const allData = await getExpenses(user.uid);
        setExpenses(allData);
        
        // Get only recent expenses for the list view
        setRecentExpenses(allData.slice(0, 10));
      } catch (error) {
        console.error("Error fetching expenses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [user]);

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  // Calculate expenses by category
  const expensesByCategory = expenses.reduce((acc, expense) => {
    const { category, amount } = expense;
    acc[category] = (acc[category] || 0) + amount;
    return acc;
  }, {} as Record<string, number>);
  
  // Prepare data for pie chart
  const pieChartData = Object.entries(expensesByCategory)
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
    }, []);
  
  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B', '#6B8E23', '#483D8B', '#CD853F', '#708090'];
  
  // Add this function to calculate real monthly data
  const getMonthlyData = () => {
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
  };
  
  // Add this function to calculate monthly spending trends
  const calculateMonthlyTrends = () => {
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
  };
  
  // Calculate category spending percentages for radar chart
  const categoryPercentages = () => {
    const total = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0);
    if (total === 0) return [];
    
    return Object.entries(expensesByCategory).map(([category, amount]) => {
      const cat = EXPENSE_CATEGORIES.find(c => c.value === category);
      return {
        category: cat ? cat.label : category,
        percentage: (amount / total) * 100
      };
    });
  };
  
  // Calculate day of week spending patterns
  const dayOfWeekSpending = () => {
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
  };
  
  // Get spending insights
  const getInsights = () => {
    if (expenses.length === 0) return [];
    
    const insights = [];
    
    // Highest spending category
    if (pieChartData.length > 0) {
      const highest = pieChartData.sort((a, b) => b.value - a.value)[0];
      insights.push(`Your highest spending category is ${highest.name} at ${formatCurrency(highest.value)}.`);
    }
    
    // Day of week with highest spending
    const daySpending = dayOfWeekSpending();
    if (daySpending.length > 0) {
      const highestDay = [...daySpending].sort((a, b) => b.amount - a.amount)[0];
      insights.push(`You tend to spend the most on ${highestDay.day}s.`);
    }
    
    // Average transaction size
    const avgTransaction = totalExpenses / expenses.length;
    insights.push(`Your average transaction is ${formatCurrency(avgTransaction)}.`);
    
    // Monthly trend
    const monthlyTrend = calculateMonthlyTrends();
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
  };

  // Update the type for the formatter function
  const formatValue = (value: number) => formatCurrency(value, { notation: 'compact' });

  // Add proper typing for the tooltip formatter
  const tooltipFormatter = (value: number) => `${Number(value).toFixed(1)}%`;

  // Update the Legend formatter to use proper types
  const legendFormatter = (value: string) => {
    const item = pieChartData.find(d => d.name === value);
    if (!item) return value;
    const total = pieChartData.reduce((sum, item) => sum + item.value, 0);
    const percent = ((item.value / total) * 100).toFixed(1);
    return `${value} (${percent}%)`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-lg">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your expenses</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/expenses">
                <ArrowRight className="mr-2 h-4 w-4" />
                View All Expenses
              </Link>
            </Button>
            <Button asChild variant="default" className="shadow-md hover:shadow-lg transition-all">
              <Link href="/expenses?add=true">
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
              <p className="text-xs text-muted-foreground">
                For all time
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Monthly</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalExpenses / 6)}</div>
              <p className="text-xs text-muted-foreground">
                Estimated
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(expensesByCategory).length}</div>
              <p className="text-xs text-muted-foreground">
                Used so far
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="recent">Recent Expenses</TabsTrigger>
        </TabsList>
        
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Monthly Expenses</CardTitle>
                  <CardDescription>Your spending over the last 6 months</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getMonthlyData()}
                      margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis 
                        tickFormatter={formatValue}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="amount" fill="#8884d8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Expenses by Category</CardTitle>
                  <CardDescription>Distribution of your spending</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {pieChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => {
                            if (percent < 0.05) return null; // Don't show labels for small slices
                            return `${name} (${(percent * 100).toFixed(0)}%)`;
                          }}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={tooltipFormatter}
                        />
                        <Legend 
                          layout="vertical" 
                          align="right"
                          verticalAlign="middle"
                          formatter={legendFormatter}
                        />
                      </PieChart>
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
          
          <TabsContent value="analytics" className="space-y-4">
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
                    <div className="flex justify-center items-center h-24">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : expenses.length > 0 ? (
                    <ul className="space-y-2">
                      {getInsights().map((insight, index) => (
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
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : calculateMonthlyTrends().length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={calculateMonthlyTrends()}
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
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : dayOfWeekSpending().some(day => day.amount > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dayOfWeekSpending()}
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
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : categoryPercentages().length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={categoryPercentages()}>
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
          
          <TabsContent value="recent">
            <Card>
              <CardHeader>
                <CardTitle>Recent Expenses</CardTitle>
                <CardDescription>
                  Your most recent expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ExpenseList expenses={recentExpenses} />
                )}
              </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
} 