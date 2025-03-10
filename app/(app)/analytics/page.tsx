"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getExpensesForPeriod } from "@/lib/expenses";
import { ExpenseType} from "@/types/expense";
import MonthlyChart from "@/components/analytics/MonthlyChart";
import CategoryChart from "@/components/analytics/CategoryChart";
import { formatCurrency } from "@/lib/utils";
import { CalendarIcon, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { format, subMonths } from "date-fns";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [currentMonthExpenses, setCurrentMonthExpenses] = useState<ExpenseType[]>([]);
  const [previousMonthExpenses, setPreviousMonthExpenses] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        // Get current month expenses
        const expenses = await getExpensesForPeriod(user.uid, currentMonth, currentYear);
        setCurrentMonthExpenses(expenses);
        
        // Get previous month expenses
        const prevDate = subMonths(currentDate, 1);
        const prevMonth = prevDate.getMonth();
        const prevYear = prevDate.getFullYear();
        const prevExpenses = await getExpensesForPeriod(user.uid, prevMonth, prevYear);
        setPreviousMonthExpenses(prevExpenses);
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);
  
  const currentTotal = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const previousTotal = previousMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  const percentChange = previousTotal > 0 
    ? ((currentTotal - previousTotal) / previousTotal) * 100 
    : 0;
  
  const isIncrease = percentChange > 0;
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-lg">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">Insights into your financial habits</p>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Current Month
                  </CardTitle>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(currentTotal)}</div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(), "MMMM yyyy")}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Previous Month
                  </CardTitle>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(previousTotal)}</div>
                  <p className="text-xs text-muted-foreground">
                    {format(subMonths(new Date(), 1), "MMMM yyyy")}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Month-over-Month
                  </CardTitle>
                  {isIncrease ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${isIncrease ? 'text-red-500' : 'text-green-500'}`}>
                    {isIncrease ? '+' : ''}{percentChange.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isIncrease ? 'Increase' : 'Decrease'} from last month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Average Expense
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {currentMonthExpenses.length > 0
                      ? formatCurrency(currentTotal / currentMonthExpenses.length)
                      : formatCurrency(0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {currentMonthExpenses.length} {currentMonthExpenses.length === 1 ? 'expense' : 'expenses'} this month
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <Tabs defaultValue="monthly" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 h-auto">
                <TabsTrigger value="monthly" className="py-2">Monthly Trend</TabsTrigger>
                <TabsTrigger value="category" className="py-2">By Category</TabsTrigger>
              </TabsList>
              
              <TabsContent value="monthly" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Expenses</CardTitle>
                    <CardDescription>Your spending over the last 6 months</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    {user ? (
                      <MonthlyChart userId={user.uid} />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        Please sign in to view your monthly expenses
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="category" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Expenses by Category</CardTitle>
                    <CardDescription>Breakdown of your spending this month</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <CategoryChart expenses={currentMonthExpenses} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
} 