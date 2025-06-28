"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { ExpenseType, ExpenseCategoryType, EXPENSE_CATEGORIES } from "@/types/expense";
import { getAllExpenses, addExpense, updateExpense, deleteExpense } from "@/lib/expenses";
import { handleError, showSuccessMessage } from "@/lib/utils/errorHandler";
import { Button } from "@/components/ui/button";
import { Plus, Search, Tags, Download, Upload, Loader2, Filter, SortAsc } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ExpenseList from "@/components/expenses/ExpenseList";
import ExpenseDialog from "@/components/expenses/ExpenseDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { exportExpensesToCSV } from "@/lib/utils/exportData";
import DeleteConfirmDialog from "@/components/expenses/DeleteConfirmDialog";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import ReceiptReviewDialog from "@/components/expenses/ReceiptReviewDialog";
import { fileToBase64, analyzeReceipt } from "@/lib/utils/receiptAnalysis";
import { getUserCategories } from "@/lib/categories";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/page-transition";
import { EnhancedLoading } from "@/components/ui/enhanced-loading";

export default function ExpensesPage() {
  const { user } = useAuth();
  const [allExpenses, setAllExpenses] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);
  const ITEMS_PER_PAGE = 30;
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseType | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseType[]>([]);
  const [sortBy, setSortBy] = useState("date-desc");
  const [categories, setCategories] = useState(EXPENSE_CATEGORIES);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const _receiptImage = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedExpenses, setDetectedExpenses] = useState<Partial<ExpenseType>[]>([]);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  
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
    } catch (error) {
      handleError(error, 'Expenses page - fetching expenses');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setIsAddDialogOpen(true);
    }
  }, [searchParams]);
  
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
        <StaggerContainer className="flex flex-col space-y-6">
          <StaggerItem>
            <motion.div 
              className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glassmorphism p-6 rounded-xl"
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  Expenses
                </h1>
                <p className="text-muted-foreground mt-1">Track and manage your spending</p>
              </motion.div>
              <motion.div 
                className="flex gap-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline"
                    onClick={handleExportCSV}
                    disabled={filteredExpenses.length === 0}
                    className="shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <motion.div
                      animate={{ rotate: filteredExpenses.length > 0 ? [0, 10, -10, 0] : 0 }}
                      transition={{ duration: 2, repeat: filteredExpenses.length > 0 ? Infinity : 0, repeatDelay: 3 }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                    </motion.div>
                    Export
                  </Button>
                </motion.div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      onClick={() => setIsAddDialogOpen(true)} 
                      className="shadow-lg hover:shadow-xl transition-all bg-primary text-primary-foreground"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Expense
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      onClick={() => {
                        const fileInput = document.createElement('input');
                        fileInput.type = 'file';
                        fileInput.accept = 'image/*';
                        fileInput.addEventListener('change', handleReceiptUpload);
                        fileInput.click();
                      }} 
                      variant="outline"
                      className="shadow-lg hover:shadow-xl transition-all duration-200"
                      disabled={isAnalyzing}
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
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <Loader2 className="mr-2 h-4 w-4" />
                            </motion.div>
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
                            <Upload className="mr-2 h-4 w-4" />
                            Scan Receipt
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          </StaggerItem>
          
          <StaggerItem>
            <motion.div 
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <motion.div 
                className="relative flex-1"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </motion.div>
                <Input
                  placeholder="Search by description, location, or tags..."
                  className="pl-10 glassmorphism border-0 shadow-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </motion.div>
              <motion.div 
                className="flex flex-wrap gap-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <motion.div whileHover={{ scale: 1.05 }}>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px] glassmorphism border-0 shadow-lg">
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
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.05 }}>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-[180px] glassmorphism border-0 shadow-lg">
                      <SelectValue placeholder="Time Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="thisWeek">This Week</SelectItem>
                      <SelectItem value="thisMonth">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.05 }}>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px] glassmorphism border-0 shadow-lg">
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
                </motion.div>
              </motion.div>
            </motion.div>
          </StaggerItem>
          
          <StaggerItem>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="glassmorphism border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Your Expenses
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                    >
                      <Tags className="h-5 w-5 text-primary" />
                    </motion.div>
                  </CardTitle>
                  <CardDescription>
                    {totalFilteredCount > 0 
                      ? `Showing ${Math.min(filteredExpenses.length, ITEMS_PER_PAGE)} of ${totalFilteredCount} expense${totalFilteredCount !== 1 ? 's' : ''} (Page ${currentPage} of ${Math.ceil(totalFilteredCount / ITEMS_PER_PAGE)})`
                      : 'No expenses found'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <EnhancedLoading message="Loading expenses..." variant="dots" />
                      </motion.div>
                    ) : filteredExpenses.length > 0 ? (
                      <motion.div 
                        key="expenses"
                        className="space-y-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ExpenseList 
                          expenses={filteredExpenses} 
                          onEdit={handleEditExpense} 
                          onDelete={handleDeleteClick} 
                        />
                        {totalFilteredCount > ITEMS_PER_PAGE && (
                          <motion.div 
                            className="flex justify-center items-center gap-2 mt-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button
                                variant="outline"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                size="sm"
                                className="shadow-lg"
                              >
                                Previous
                              </Button>
                            </motion.div>
                            <span className="text-sm text-muted-foreground px-4">
                              Page {currentPage} of {Math.ceil(totalFilteredCount / ITEMS_PER_PAGE)}
                            </span>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button
                                variant="outline"
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalFilteredCount / ITEMS_PER_PAGE), prev + 1))}
                                disabled={currentPage >= Math.ceil(totalFilteredCount / ITEMS_PER_PAGE)}
                                size="sm"
                                className="shadow-lg"
                              >
                                Next
                              </Button>
                            </motion.div>
                          </motion.div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="empty"
                        className="flex flex-col items-center justify-center py-12 text-center"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                      >
                        <motion.div 
                          className="rounded-full bg-muted p-6 mb-4"
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <Tags className="h-10 w-10 text-muted-foreground" />
                        </motion.div>
                        <motion.h3 
                          className="text-xl font-semibold mb-2"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          No expenses found
                        </motion.h3>
                        <motion.p 
                          className="text-muted-foreground mb-6 max-w-md"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          {searchTerm || categoryFilter !== "all" || dateFilter !== "all"
                            ? "Try adjusting your search or filter criteria"
                            : "Add your first expense to start tracking your spending"}
                        </motion.p>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button 
                            onClick={() => setIsAddDialogOpen(true)}
                            className="bg-primary text-primary-foreground shadow-lg"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Expense
                          </Button>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          </StaggerItem>
        </StaggerContainer>
      </div>
      
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