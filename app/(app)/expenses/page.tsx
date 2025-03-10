"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { ExpenseType, ExpenseCategoryType, EXPENSE_CATEGORIES } from "@/types/expense";
import { getExpenses, addExpense, updateExpense, deleteExpense } from "@/lib/expenses";
import { Button } from "@/components/ui/button";
import { Plus, Search, Tags, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ExpenseList from "@/components/expenses/ExpenseList";
import ExpenseDialog from "@/components/expenses/ExpenseDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { exportExpensesToCSV } from "@/lib/utils/exportData";
import { ExpenseListSkeleton } from "@/components/ui/loading-skeleton";
import DeleteConfirmDialog from "@/components/expenses/DeleteConfirmDialog";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseType | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseType[]>([]);
  const [sortBy, setSortBy] = useState("date-desc");
  const [categories] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("expense-categories");
      return stored ? JSON.parse(stored) : EXPENSE_CATEGORIES;
    }
    return EXPENSE_CATEGORIES;
  });
  
  const searchParams = useSearchParams();
  const router = useRouter();
  
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

  const filterExpenses = useCallback(() => {
    let filtered = [...expenses];
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(expense => 
        expense.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
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
    setFilteredExpenses(sortedExpenses);
  }, [expenses, searchTerm, categoryFilter, dateFilter, sortBy, sortExpenses]);

  const fetchExpenses = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await getExpenses(user.uid);
      setExpenses(data);
      setFilteredExpenses(data);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setIsAddDialogOpen(true);
    }
  }, [searchParams]);
  
  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user, fetchExpenses]);
  
  useEffect(() => {
    filterExpenses();
  }, [expenses, searchTerm, categoryFilter, dateFilter, sortBy, filterExpenses]);

  const handleAddExpense = async (expenseData: Omit<ExpenseType, "id" | "createdAt" | "updatedAt">) => {
    if (!user) return;

    try {
      // Include userId in the expense data
      const expenseWithUser = {
        ...expenseData,
        userId: user.uid
      };
      await addExpense(expenseWithUser, user.uid);
      await fetchExpenses();
      setIsAddDialogOpen(false);
      router.replace("/expenses");
      toast.success("Expense added successfully");
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error("Failed to add expense");
    }
  };
  
  const handleEditExpense = async (updatedExpense: ExpenseType) => {
    try {
      await updateExpense(user!.uid, updatedExpense.id, updatedExpense);
      // Refresh the expenses list
      const updatedExpenses = expenses.map(exp => 
        exp.id === updatedExpense.id ? updatedExpense : exp
      );
      setExpenses(updatedExpenses);
      toast.success("Expense updated successfully");
    } catch (error) {
      console.error("Error updating expense:", error);
      toast.error("Failed to update expense");
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
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };
  
  const handleExportCSV = () => {
    if (filteredExpenses.length > 0) {
      exportExpensesToCSV(filteredExpenses);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-lg">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground">Track and manage your spending</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={handleExportCSV}
              disabled={filteredExpenses.length === 0}
              className="shadow-sm"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} className="shadow-md hover:shadow-lg transition-all">
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
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
              <SelectTrigger className="w-[180px]">
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
              <SelectTrigger className="w-[180px]">
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
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Your Expenses</CardTitle>
            <CardDescription>
              {filteredExpenses.length > 0 
                ? `Showing ${filteredExpenses.length} expense${filteredExpenses.length !== 1 ? 's' : ''}`
                : 'No expenses found'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ExpenseListSkeleton />
            ) : filteredExpenses.length > 0 ? (
              <ExpenseList 
                expenses={filteredExpenses} 
                onEdit={handleEditExpense} 
                onDelete={handleDeleteClick} 
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-6 mb-4">
                  <Tags className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No expenses found</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  {searchTerm || categoryFilter !== "all" || dateFilter !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "Add your first expense to start tracking your spending"}
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Expense
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
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
    </div>
  );
} 