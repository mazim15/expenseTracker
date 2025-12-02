"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { ExpenseType, ExpenseCategoryType, EXPENSE_CATEGORIES } from "@/types/expense";
import { getAllExpenses, addExpense, updateExpense, deleteExpense } from "@/lib/expenses";
import { handleError, showSuccessMessage } from "@/lib/utils/errorHandler";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Search,
  Tags,
  Download,
  Upload,
  Loader2,
  Filter,
  SortAsc,
  Calendar,
  DollarSign,
  TrendingUp,
  BarChart3,
  Grid3X3,
  List,
  RefreshCw,
  Trash2,
  X,
  Clock,
  Target,
  Zap
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExpenseList from "@/components/expenses/ExpenseList";
import ExpenseDialog from "@/components/expenses/ExpenseDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { exportExpensesToCSV } from "@/lib/utils/exportData";
import DeleteConfirmDialog from "@/components/expenses/DeleteConfirmDialog";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import ReceiptReviewDialog from "@/components/expenses/ReceiptReviewDialog";
import { fileToBase64, analyzeReceipt } from "@/lib/utils/receiptAnalysis";
import { getUserCategories } from "@/lib/categories";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition, StaggerContainer, StaggerItem, ScaleIn } from "@/components/ui/page-transition";
import { EnhancedLoading } from "@/components/ui/enhanced-loading";
import { useLogger } from "@/lib/hooks/useLogger";
import { formatCurrency } from "@/lib/utils";

export default function ExpensesPage() {
  const { user } = useAuth();
  const { logAction } = useLogger();
  
  // Core state
  const [allExpenses, setAllExpenses] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);
  const ITEMS_PER_PAGE = 20; // Reduced for better performance
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseType | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  
  // Advanced features
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseType[]>([]);
  const [categories, setCategories] = useState(EXPENSE_CATEGORIES);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Receipt analysis
  const _receiptImage = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedExpenses, setDetectedExpenses] = useState<Partial<ExpenseType>[]>([]);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  // Enhanced analytics calculations
  const analytics = useMemo(() => {
    if (!allExpenses.length) return null;

    const now = new Date();
    const currentMonth = startOfMonth(now);
    const previousMonth = startOfMonth(subMonths(now, 1));

    // Filter by periods
    const currentMonthExpenses = allExpenses.filter(expense => 
      expense.date >= currentMonth && expense.date <= endOfMonth(currentMonth)
    );
    const previousMonthExpenses = allExpenses.filter(expense => 
      expense.date >= previousMonth && expense.date <= endOfMonth(previousMonth)
    );

    // Calculate totals
    const currentTotal = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const previousTotal = previousMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalAmount = allExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Growth calculation
    const growth = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

    // Category breakdown
    const categoryTotals: Record<string, number> = {};
    allExpenses.forEach(expense => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });

    const topCategory = Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b - a)[0];

    return {
      totalExpenses: allExpenses.length,
      totalAmount,
      currentMonth: {
        total: currentTotal,
        count: currentMonthExpenses.length
      },
      previousMonth: {
        total: previousTotal,
        count: previousMonthExpenses.length
      },
      growth: {
        percentage: growth,
        isIncrease: growth > 0
      },
      averageExpense: allExpenses.length > 0 ? totalAmount / allExpenses.length : 0,
      topCategory: topCategory ? {
        name: EXPENSE_CATEGORIES.find(c => c.value === topCategory[0])?.label || topCategory[0],
        amount: topCategory[1]
      } : null
    };
  }, [allExpenses]);
  
  const sortExpenses = useCallback((expenses: ExpenseType[], sortBy: string): ExpenseType[] => {
    const sorted = [...expenses];
    
    switch (sortBy) {
      case "date-desc":
        return sorted.sort((a, b) => b.date.getTime() - a.date.getTime());
      case "date-asc":
        return sorted.sort((a, b) => a.date.getTime() - b.date.getTime());
      case "amount-desc":
        return sorted.sort((a, b) => b.amount - a.amount);
      case "amount-asc":
        return sorted.sort((a, b) => a.amount - b.amount);
      case "category":
        return sorted.sort((a, b) => a.category.localeCompare(b.category));
      case "description":
        return sorted.sort((a, b) => a.description.localeCompare(b.description));
      default:
        return sorted;
    }
  }, []);

  const filterAndPaginateExpenses = useCallback(() => {
    if (!Array.isArray(allExpenses)) return;
    let filtered = [...allExpenses];
    
    // Filter by search term (search description, location, and tags)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(expense => {
        const descriptionMatch = expense.description.toLowerCase().includes(searchLower);
        const locationMatch = expense.location?.toLowerCase().includes(searchLower) || false;
        const tagsMatch = expense.tags?.some(tag => tag.toLowerCase().includes(searchLower)) || false;
        
        return descriptionMatch || locationMatch || tagsMatch;
      });
    }
    
    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter(expense => expense.category === categoryFilter);
    }
    
    // Filter by date
    const now = new Date();
    if (dateFilter === "today") {
      filtered = filtered.filter(expense => 
        format(expense.date, "yyyy-MM-dd") === format(now, "yyyy-MM-dd")
      );
    } else if (dateFilter === "thisWeek") {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      filtered = filtered.filter(expense => expense.date >= weekStart);
    } else if (dateFilter === "thisMonth") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(expense => expense.date >= monthStart);
    }
    
    // Sort expenses
    const sortedExpenses = sortExpenses(filtered, sortBy);
    
    // Paginate the filtered and sorted results
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedExpenses = sortedExpenses.slice(startIndex, endIndex);
    
    setFilteredExpenses(paginatedExpenses);
    setTotalFilteredCount(sortedExpenses.length);
  }, [allExpenses, searchTerm, categoryFilter, dateFilter, sortBy, currentPage, ITEMS_PER_PAGE, sortExpenses]);

  const fetchExpenses = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await getAllExpenses(user.uid);
      setAllExpenses(data);
      
      // Log page visit
      logAction('expenses_page_loaded', { 
        count: data.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      handleError(error, 'Expenses page - fetching expenses');
    } finally {
      setLoading(false);
    }
  }, [user, logAction]);


  // Bulk operations
  const handleBulkDelete = useCallback(async () => {
    if (!user || selectedExpenses.length === 0) return;
    
    try {
      for (const expenseId of selectedExpenses) {
        await deleteExpense(expenseId, user.uid);
      }
      await fetchExpenses();
      setSelectedExpenses([]);
      showSuccessMessage(`${selectedExpenses.length} expenses deleted successfully`);
      
      logAction('bulk_delete_expenses', { 
        count: selectedExpenses.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      handleError(error, 'Bulk delete expenses');
    }
  }, [user, selectedExpenses, fetchExpenses, logAction]);

  const handleSelectAll = useCallback(() => {
    if (selectedExpenses.length === filteredExpenses.length) {
      setSelectedExpenses([]);
    } else {
      setSelectedExpenses(filteredExpenses.map(expense => expense.id));
    }
  }, [selectedExpenses.length, filteredExpenses]);

  const toggleExpenseSelection = useCallback((expenseId: string) => {
    setSelectedExpenses(prev => 
      prev.includes(expenseId) 
        ? prev.filter(id => id !== expenseId)
        : [...prev, expenseId]
    );
  }, []);

  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setIsAddDialogOpen(true);
    }
    
    // Handle search parameter from header quick search
    const searchParam = searchParams.get("search");
    if (searchParam) {
      setSearchTerm(searchParam);
      // Clear the URL parameter to avoid cluttering
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("search");
      router.replace(`/expenses${newParams.toString() ? '?' + newParams.toString() : ''}`);
    }
  }, [searchParams, router]);
  
  const fetchCategories = useCallback(async () => {
    if (!user) return;
    
    try {
      const userCategories = await getUserCategories(user.uid);
      if (userCategories && userCategories.length > 0) {
        setCategories(userCategories);
        localStorage.setItem("expense-categories", JSON.stringify(userCategories));
      } else {
        // Check localStorage for cached categories
        const storedCategories = localStorage.getItem("expense-categories");
        if (storedCategories) {
          try {
            setCategories(JSON.parse(storedCategories));
          } catch (error) {
            console.error("Error parsing stored categories:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchExpenses();
      fetchCategories();
    }
  }, [user, fetchExpenses, fetchCategories]);
  
  useEffect(() => {
    filterAndPaginateExpenses();
  }, [filterAndPaginateExpenses]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, dateFilter, sortBy]);

  const handleAddExpense = async (expenseData: Omit<ExpenseType, "id" | "createdAt" | "updatedAt">) => {
    if (!user) return;

    try {
      const expenseWithUser = {
        ...expenseData,
        userId: user.uid
      };
      await addExpense(expenseWithUser, user.uid);
      await fetchExpenses();
      setIsAddDialogOpen(false);
      router.replace("/expenses");
      showSuccessMessage("Expense added successfully");
    } catch (error) {
      handleError(error, 'Expenses page - adding expense');
    }
  };
  
  const handleEditExpense = async (updatedExpense: ExpenseType) => {
    try {
      await updateExpense(user!.uid, updatedExpense.id, updatedExpense);
      await fetchExpenses();
      showSuccessMessage("Expense updated successfully");
    } catch (error) {
      handleError(error, 'Expenses page - updating expense');
    }
  };
  
  const handleDeleteClick = (id: string) => {
    setDeleteExpenseId(id);
  };
  
  const handleDeleteConfirm = async () => {
    if (!user || !deleteExpenseId) return;
    
    try {
      await deleteExpense(deleteExpenseId, user.uid);
      await fetchExpenses();
      setDeleteExpenseId(null);
      showSuccessMessage("Expense deleted successfully");
    } catch (error) {
      handleError(error, 'Expenses page - deleting expense');
      // Keep the dialog open on error
      throw error;
    }
  };
  
  const handleExportCSV = () => {
    if (filteredExpenses.length > 0) {
      exportExpensesToCSV(filteredExpenses);
    }
  };
  
  const handleReceiptUpload = async (event: Event) => {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;
    
    try {
      setIsAnalyzing(true);
      const base64Image = await fileToBase64(file);
      _receiptImage[1](base64Image);
      
      toast.loading("Analyzing receipt...");
      
      // Call the Gemini API to analyze the receipt
      const extractedExpenses = await analyzeReceipt(base64Image);
      
      if (extractedExpenses.length === 0) {
        toast.dismiss();
        toast.error("No expenses detected from the receipt");
        return;
      }
      
      // Add userId to all detected expenses
      const expensesWithUser = extractedExpenses.map(expense => ({
        ...expense,
        userId: user?.uid || ''
      }));
      
      console.log("Extracted expenses:", extractedExpenses);
      setDetectedExpenses(expensesWithUser);
      setTimeout(() => {
        setIsReviewDialogOpen(true);
      }, 0);
      
      toast.dismiss();
      toast.success(`${extractedExpenses.length} items detected from receipt`);
    } catch (error) {
      console.error("Error analyzing receipt:", error);
      toast.error("Failed to analyze receipt");
    }
  };

  const handleSaveMultipleExpenses = async (expenses: Partial<ExpenseType>[]) => {
    if (!user || expenses.length === 0) return;

    try {
      toast.loading(`Adding ${expenses.length} expenses...`);
      // Add all expenses with userId
      for (const expenseData of expenses) {
        // Ensure required fields are present
        const expenseWithUser = {
          ...expenseData,
          userId: user.uid,
          // Ensure date is defined
          date: expenseData.date || new Date(),
          // Ensure other required fields
          amount: expenseData.amount || 0,
          category: expenseData.category || "other",
          description: expenseData.description || "Unknown expense"
        };
        await addExpense(expenseWithUser, user.uid);
      }
      
      await fetchExpenses();
      setIsReviewDialogOpen(false);
      _receiptImage[1](null);
      setDetectedExpenses([]);
      
      toast.dismiss();
      showSuccessMessage(`${expenses.length} expenses added successfully`);
    } catch (error) {
      toast.dismiss();
      handleError(error, 'Expenses page - adding bulk expenses');
    }
  };

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <StaggerContainer className="flex flex-col space-y-8">
          {/* Enhanced Header Section */}
          <StaggerItem>
            <motion.div 
              className="relative overflow-hidden"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-emerald-500/10 opacity-50" />
              <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-gradient-to-r from-background/80 via-background/90 to-background/80 backdrop-blur-sm p-8 rounded-2xl border shadow-lg">
                <div>
                  <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent">
                    Expenses Manager
                  </h1>
                  <p className="text-muted-foreground mt-3 text-lg max-w-2xl">
                    Track, analyze, and manage your spending with advanced tools and insights
                  </p>
                  {analytics && (
                    <div className="flex gap-4 mt-4">
                      <Badge variant="secondary" className="text-blue-600 bg-blue-100 dark:bg-blue-900/30">
                        {analytics.totalExpenses} Total Expenses
                      </Badge>
                      <Badge variant="secondary" className="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30">
                        {formatCurrency(analytics.totalAmount)} Total Amount
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button onClick={fetchExpenses} variant="outline" disabled={loading} className="group">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    Refresh
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleExportCSV}
                    disabled={filteredExpenses.length === 0}
                    className="group"
                  >
                    <Download className="h-4 w-4 mr-2 group-hover:translate-y-0.5 transition-transform" />
                    Export
                  </Button>
                  <Button 
                    onClick={() => {
                      const fileInput = document.createElement('input');
                      fileInput.type = 'file';
                      fileInput.accept = 'image/*';
                      fileInput.addEventListener('change', handleReceiptUpload);
                      fileInput.click();
                    }} 
                    variant="outline"
                    disabled={isAnalyzing}
                    className="group"
                  >
                    <AnimatePresence mode="wait">
                      {isAnalyzing ? (
                        <motion.div
                          key="analyzing"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center"
                        >
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </motion.div>
                      ) : (
                        <motion.div
                          key="upload"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center"
                        >
                          <Upload className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                          Scan Receipt
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                  <Button onClick={() => setIsAddDialogOpen(true)} className="group">
                    <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform" />
                    Add Expense
                  </Button>
                </div>
              </div>
            </motion.div>
          </StaggerItem>

          {/* Analytics Summary Cards */}
          {analytics && (
            <StaggerItem>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <ScaleIn delay={0.1}>
                  <motion.div whileHover={{ y: -5 }} className="group">
                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/80 dark:from-blue-950/30 dark:via-background dark:to-indigo-950/30 shadow-lg hover:shadow-2xl transition-all duration-500">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <CardHeader className="relative z-10 pb-3">
                        <CardTitle className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
                          This Month
                          <motion.div
                            className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30"
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
                          >
                            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </motion.div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="relative z-10 space-y-2">
                        <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          {formatCurrency(analytics.currentMonth.total)}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{analytics.currentMonth.count} expenses</span>
                          {analytics.growth.percentage !== 0 && (
                            <Badge 
                              variant="secondary" 
                              className={analytics.growth.isIncrease ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100'}
                            >
                              {analytics.growth.isIncrease ? '+' : ''}{analytics.growth.percentage.toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </ScaleIn>

                <ScaleIn delay={0.2}>
                  <motion.div whileHover={{ y: -5 }} className="group">
                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50/80 via-white to-green-50/80 dark:from-emerald-950/30 dark:via-background dark:to-green-950/30 shadow-lg hover:shadow-2xl transition-all duration-500">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <CardHeader className="relative z-10 pb-3">
                        <CardTitle className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
                          Average Expense
                          <motion.div
                            className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                          >
                            <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          </motion.div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="relative z-10 space-y-2">
                        <div className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                          {formatCurrency(analytics.averageExpense)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Across {analytics.totalExpenses} transactions
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </ScaleIn>

                <ScaleIn delay={0.3}>
                  <motion.div whileHover={{ y: -5 }} className="group">
                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-50/80 via-white to-violet-50/80 dark:from-purple-950/30 dark:via-background dark:to-violet-950/30 shadow-lg hover:shadow-2xl transition-all duration-500">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <CardHeader className="relative z-10 pb-3">
                        <CardTitle className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
                          Top Category
                          <motion.div
                            className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30"
                            animate={{ rotate: [0, -10, 10, 0] }}
                            transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
                          >
                            <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </motion.div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="relative z-10 space-y-2">
                        {analytics.topCategory ? (
                          <>
                            <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                              {formatCurrency(analytics.topCategory.amount)}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {analytics.topCategory.name}
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-muted-foreground">No categories yet</div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </ScaleIn>

                <ScaleIn delay={0.4}>
                  <motion.div whileHover={{ y: -5 }} className="group">
                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/80 dark:from-orange-950/30 dark:via-background dark:to-amber-950/30 shadow-lg hover:shadow-2xl transition-all duration-500">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <CardHeader className="relative z-10 pb-3">
                        <CardTitle className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
                          Activity Score
                          <motion.div
                            className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30"
                            animate={{ 
                              scale: [1, 1.2, 1],
                              rotate: [0, 5, -5, 0]
                            }}
                            transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
                          >
                            <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          </motion.div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="relative z-10 space-y-2">
                        <div className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                          {Math.min(100, Math.round((analytics.totalExpenses / 100) * 100))}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {analytics.totalExpenses > 50 ? 'Very Active' : analytics.totalExpenses > 20 ? 'Active' : 'Getting Started'}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </ScaleIn>
              </div>
            </StaggerItem>
          )}

          {/* Enhanced Search and Filter Section */}
          <StaggerItem>
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {/* Main Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search expenses by description, location, tags, or amount..."
                  className="pl-12 h-14 text-lg bg-gradient-to-r from-background/80 to-background/90 backdrop-blur-sm border-0 shadow-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Filters and Options */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-3">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px] bg-background/80 backdrop-blur-sm border-0 shadow-lg">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category: ExpenseCategoryType) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-[180px] bg-background/80 backdrop-blur-sm border-0 shadow-lg">
                      <Calendar className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Time Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="thisWeek">This Week</SelectItem>
                      <SelectItem value="thisMonth">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px] bg-background/80 backdrop-blur-sm border-0 shadow-lg">
                      <SortAsc className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Newest First</SelectItem>
                      <SelectItem value="date-asc">Oldest First</SelectItem>
                      <SelectItem value="amount-desc">Highest Amount</SelectItem>
                      <SelectItem value="amount-asc">Lowest Amount</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                      <SelectItem value="description">Description</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  {/* View Toggle */}
                  <div className="flex items-center bg-background/80 backdrop-blur-sm rounded-lg p-1 shadow-lg">
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className="h-8 px-3"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                      className="h-8 px-3"
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Bulk Actions */}
                  {selectedExpenses.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2"
                    >
                      <Badge variant="secondary" className="text-primary">
                        {selectedExpenses.length} selected
                      </Badge>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                        className="h-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </StaggerItem>
          
          {/* Enhanced Expenses Display */}
          <StaggerItem>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <TabsList className="grid w-full grid-cols-4 h-auto bg-background/80 backdrop-blur-sm shadow-lg">
                  <TabsTrigger value="all" className="py-3 px-4 text-sm font-medium">
                    <Tags className="h-4 w-4 mr-2" />
                    All Expenses
                  </TabsTrigger>
                  <TabsTrigger value="recent" className="py-3 px-4 text-sm font-medium">
                    <Clock className="h-4 w-4 mr-2" />
                    Recent
                  </TabsTrigger>
                  <TabsTrigger value="month" className="py-3 px-4 text-sm font-medium">
                    <Calendar className="h-4 w-4 mr-2" />
                    This Month
                  </TabsTrigger>
                  <TabsTrigger value="high" className="py-3 px-4 text-sm font-medium">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    High Value
                  </TabsTrigger>
                </TabsList>
              </motion.div>

              <TabsContent value={activeTab} className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-background/95 to-background/90 backdrop-blur-sm">
                    <CardHeader className="border-b bg-gradient-to-r from-muted/50 to-muted/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-3">
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                            >
                              <DollarSign className="h-6 w-6 text-primary" />
                            </motion.div>
                            Your Expenses
                          </CardTitle>
                          <CardDescription>
                            {totalFilteredCount > 0 
                              ? `Showing ${Math.min(filteredExpenses.length, ITEMS_PER_PAGE)} of ${totalFilteredCount} expense${totalFilteredCount !== 1 ? 's' : ''} (Page ${currentPage} of ${Math.ceil(totalFilteredCount / ITEMS_PER_PAGE)})`
                              : 'No expenses found'}
                          </CardDescription>
                        </div>
                        {filteredExpenses.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedExpenses.length === filteredExpenses.length}
                              onChange={handleSelectAll}
                            />
                            <span className="text-sm text-muted-foreground">Select All</span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <AnimatePresence mode="wait">
                        {loading ? (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="py-12"
                          >
                            <EnhancedLoading message="Loading your expenses..." variant="pulse" />
                          </motion.div>
                        ) : filteredExpenses.length > 0 ? (
                          <motion.div 
                            key="expenses"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                          >
                            <ExpenseList 
                              expenses={filteredExpenses} 
                              onEdit={handleEditExpense} 
                              onDelete={handleDeleteClick}
                              selectedExpenses={selectedExpenses}
                              onToggleSelection={toggleExpenseSelection}
                              viewMode={viewMode}
                            />
                            
                            {totalFilteredCount > ITEMS_PER_PAGE && (
                              <motion.div 
                                className="flex justify-center items-center gap-4 pt-6 border-t"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                              >
                                <Button
                                  variant="outline"
                                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                  disabled={currentPage === 1}
                                  className="shadow-lg"
                                >
                                  Previous
                                </Button>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">
                                    Page {currentPage} of {Math.ceil(totalFilteredCount / ITEMS_PER_PAGE)}
                                  </span>
                                  <Badge variant="outline">
                                    {totalFilteredCount} total
                                  </Badge>
                                </div>
                                <Button
                                  variant="outline"
                                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalFilteredCount / ITEMS_PER_PAGE), prev + 1))}
                                  disabled={currentPage >= Math.ceil(totalFilteredCount / ITEMS_PER_PAGE)}
                                  className="shadow-lg"
                                >
                                  Next
                                </Button>
                              </motion.div>
                            )}
                          </motion.div>
                        ) : (
                          <motion.div 
                            key="empty"
                            className="flex flex-col items-center justify-center py-16 text-center"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3 }}
                          >
                            <motion.div 
                              className="rounded-full bg-gradient-to-br from-muted/50 to-muted p-8 mb-6"
                              animate={{ rotate: [0, 10, -10, 0] }}
                              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            >
                              <DollarSign className="h-12 w-12 text-muted-foreground" />
                            </motion.div>
                            <motion.h3 
                              className="text-2xl font-bold mb-3"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                            >
                              No expenses found
                            </motion.h3>
                            <motion.p 
                              className="text-muted-foreground mb-8 max-w-md text-lg"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                            >
                              {searchTerm || categoryFilter !== "all" || dateFilter !== "all"
                                ? "Try adjusting your search or filter criteria to find what you're looking for"
                                : "Start your financial tracking journey by adding your first expense"}
                            </motion.p>
                            <motion.div
                              className="flex gap-3"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.4 }}
                            >
                              <Button 
                                onClick={() => setIsAddDialogOpen(true)}
                                size="lg"
                                className="shadow-lg"
                              >
                                <Plus className="mr-2 h-5 w-5" />
                                Add Your First Expense
                              </Button>
                              {(searchTerm || categoryFilter !== "all" || dateFilter !== "all") && (
                                <Button 
                                  onClick={() => {
                                    setSearchTerm("");
                                    setCategoryFilter("all");
                                    setDateFilter("all");
                                  }}
                                  variant="outline"
                                  size="lg"
                                  className="shadow-lg"
                                >
                                  Clear Filters
                                </Button>
                              )}
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            </Tabs>
          </StaggerItem>
        </StaggerContainer>
      </div>
      
      {/* Dialogs */}
      <ExpenseDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleAddExpense}
      />
      
      {editingExpense && (
        <ExpenseDialog
          open={!!editingExpense}
          onOpenChange={() => setEditingExpense(null)}
          onSave={handleEditExpense}
          expense={editingExpense}
        />
      )}
      
      <DeleteConfirmDialog
        open={!!deleteExpenseId}
        onOpenChange={() => setDeleteExpenseId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Expense"
        description="Are you sure you want to delete this expense? This action cannot be undone."
      />
      
      <ReceiptReviewDialog
        open={isReviewDialogOpen}
        onOpenChange={setIsReviewDialogOpen}
        expenses={detectedExpenses}
        onSave={handleSaveMultipleExpenses}
        onCancel={() => {
          setIsReviewDialogOpen(false);
          _receiptImage[1](null);
          setDetectedExpenses([]);
        }}
      />
    </PageTransition>
  );
}