"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { ExpenseType, ExpenseCategoryType, EXPENSE_CATEGORIES } from "@/types/expense";
import { addExpense } from "@/lib/expenses";
import {
  useExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
} from "@/lib/queries/expenses";
import { handleError, showSuccessMessage } from "@/lib/utils/errorHandler";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Search,
  Download,
  Upload,
  Loader2,
  Filter,
  SortAsc,
  Calendar,
  BarChart3,
  Grid3X3,
  List,
  RefreshCw,
  Trash2,
  X,
  Wallet,
  Target,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import ExpenseList from "@/components/expenses/ExpenseList";
import ExpenseDialog from "@/components/expenses/ExpenseDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { exportExpensesToCSV } from "@/lib/utils/exportData";
import DeleteConfirmDialog from "@/components/expenses/DeleteConfirmDialog";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import ReceiptReviewDialog from "@/components/expenses/ReceiptReviewDialog";
import ScanReceiptDialog, { type ScanReceiptResult } from "@/components/expenses/ScanReceiptDialog";
import { analyzeReceipt } from "@/lib/utils/receiptAnalysis";
import { getUserCategories } from "@/lib/categories";
import { useLogger } from "@/lib/hooks/useLogger";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function ExpensesPage() {
  const { user } = useAuth();
  const { logAction } = useLogger();

  const expensesQuery = useExpensesQuery(user?.uid);
  const allExpenses = useMemo(() => expensesQuery.data ?? [], [expensesQuery.data]);
  const loading = expensesQuery.isLoading;
  const createMutation = useCreateExpenseMutation(user?.uid);
  const updateMutation = useUpdateExpenseMutation(user?.uid);
  const deleteMutation = useDeleteExpenseMutation(user?.uid);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);
  const ITEMS_PER_PAGE = 20;

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseType | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseType[]>([]);
  const [categories, setCategories] = useState(EXPENSE_CATEGORIES);

  const searchParams = useSearchParams();
  const router = useRouter();

  const [scannedReceipt, setScannedReceipt] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedExpenses, setDetectedExpenses] = useState<Partial<ExpenseType>[]>([]);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false);

  const analytics = useMemo(() => {
    if (!allExpenses.length) return null;

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));

    const currentMonthExpenses = allExpenses.filter(
      (e) => e.date >= currentMonthStart && e.date <= endOfMonth(currentMonthStart),
    );
    const previousMonthExpenses = allExpenses.filter(
      (e) => e.date >= previousMonthStart && e.date <= endOfMonth(previousMonthStart),
    );

    const currentTotal = currentMonthExpenses.reduce((s, e) => s + e.amount, 0);
    const previousTotal = previousMonthExpenses.reduce((s, e) => s + e.amount, 0);
    const totalAmount = allExpenses.reduce((s, e) => s + e.amount, 0);

    const growth = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

    const categoryTotals: Record<string, number> = {};
    allExpenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });
    const topCategory = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)[0];

    return {
      totalExpenses: allExpenses.length,
      totalAmount,
      currentMonth: { total: currentTotal, count: currentMonthExpenses.length },
      previousMonth: { total: previousTotal, count: previousMonthExpenses.length },
      growth: { percentage: growth, isIncrease: growth > 0 },
      averageExpense: allExpenses.length > 0 ? totalAmount / allExpenses.length : 0,
      topCategory: topCategory
        ? {
            name:
              EXPENSE_CATEGORIES.find((c) => c.value === topCategory[0])?.label || topCategory[0],
            amount: topCategory[1],
          }
        : null,
    };
  }, [allExpenses]);

  const sortExpenses = useCallback((list: ExpenseType[], key: string): ExpenseType[] => {
    const sorted = [...list];
    switch (key) {
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

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((e) => {
        const descMatch = e.description.toLowerCase().includes(q);
        const locMatch = e.location?.toLowerCase().includes(q) || false;
        const tagMatch = e.tags?.some((t) => t.toLowerCase().includes(q)) || false;
        return descMatch || locMatch || tagMatch;
      });
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((e) => e.category === categoryFilter);
    }

    const now = new Date();
    if (dateFilter === "today") {
      filtered = filtered.filter((e) => format(e.date, "yyyy-MM-dd") === format(now, "yyyy-MM-dd"));
    } else if (dateFilter === "thisWeek") {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      filtered = filtered.filter((e) => e.date >= weekStart);
    } else if (dateFilter === "thisMonth") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter((e) => e.date >= monthStart);
    }

    const sorted = sortExpenses(filtered, sortBy);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    setFilteredExpenses(sorted.slice(startIndex, startIndex + ITEMS_PER_PAGE));
    setTotalFilteredCount(sorted.length);
  }, [allExpenses, searchTerm, categoryFilter, dateFilter, sortBy, currentPage, sortExpenses]);

  const refetch = expensesQuery.refetch;

  useEffect(() => {
    if (allExpenses.length > 0 || !expensesQuery.isFetched) return;
    logAction("expenses_page_loaded", {
      count: allExpenses.length,
      timestamp: new Date().toISOString(),
    });
  }, [allExpenses.length, expensesQuery.isFetched, logAction]);

  const handleBulkDelete = useCallback(async () => {
    if (!user || selectedExpenses.length === 0) return;
    try {
      await Promise.all(selectedExpenses.map((id) => deleteMutation.mutateAsync({ id })));
      const count = selectedExpenses.length;
      setSelectedExpenses([]);
      showSuccessMessage(`${count} expenses deleted successfully`);
      logAction("bulk_delete_expenses", { count, timestamp: new Date().toISOString() });
    } catch (error) {
      handleError(error, "Bulk delete expenses");
    }
  }, [user, selectedExpenses, deleteMutation, logAction]);

  const handleSelectAll = useCallback(() => {
    if (selectedExpenses.length === filteredExpenses.length) {
      setSelectedExpenses([]);
    } else {
      setSelectedExpenses(filteredExpenses.map((e) => e.id));
    }
  }, [selectedExpenses.length, filteredExpenses]);

  const toggleExpenseSelection = useCallback((id: string) => {
    setSelectedExpenses((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setIsAddDialogOpen(true);
    }
    const searchParam = searchParams.get("search");
    if (searchParam) {
      setSearchTerm(searchParam);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("search");
      router.replace(`/expenses${newParams.toString() ? "?" + newParams.toString() : ""}`);
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
        const stored = localStorage.getItem("expense-categories");
        if (stored) {
          try {
            setCategories(JSON.parse(stored));
          } catch (err) {
            console.error("Error parsing stored categories:", err);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchCategories();
  }, [user, fetchCategories]);

  useEffect(() => {
    filterAndPaginateExpenses();
  }, [filterAndPaginateExpenses]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, dateFilter, sortBy]);

  const handleAddExpense = async (data: Omit<ExpenseType, "id" | "createdAt" | "updatedAt">) => {
    if (!user) return;
    try {
      await createMutation.mutateAsync({ ...data, userId: user.uid });
      setIsAddDialogOpen(false);
      router.replace("/expenses");
      showSuccessMessage("Expense added successfully");
    } catch (err) {
      handleError(err, "Expenses page - adding expense");
    }
  };

  const handleEditExpense = async (updated: ExpenseType) => {
    if (!user) return;
    try {
      const { id, userId: _u, createdAt: _c, updatedAt: _up, ...patch } = updated;
      await updateMutation.mutateAsync({ id, userId: user.uid, patch });
      showSuccessMessage("Expense updated successfully");
    } catch (err) {
      handleError(err, "Expenses page - updating expense");
    }
  };

  const handleDeleteClick = (id: string) => setDeleteExpenseId(id);

  const handleDeleteConfirm = async () => {
    if (!user || !deleteExpenseId) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteExpenseId });
      setDeleteExpenseId(null);
      showSuccessMessage("Expense deleted successfully");
    } catch (err) {
      handleError(err, "Expenses page - deleting expense");
      throw err;
    }
  };

  const handleExportCSV = () => {
    if (filteredExpenses.length > 0) exportExpensesToCSV(filteredExpenses);
  };

  const handleScanAnalyze = async ({ dataUrl, mimeType }: ScanReceiptResult) => {
    try {
      setIsAnalyzing(true);
      setScannedReceipt(dataUrl);
      toast.loading("Analyzing receipt...");

      const extracted = await analyzeReceipt(dataUrl, mimeType);
      if (extracted.length === 0) {
        toast.dismiss();
        toast.error("No expenses detected from the receipt");
        return;
      }

      const expensesWithUser = extracted.map((e) => ({ ...e, userId: user?.uid || "" }));
      setDetectedExpenses(expensesWithUser);
      setIsScanDialogOpen(false);
      setTimeout(() => setIsReviewDialogOpen(true), 0);

      toast.dismiss();
      toast.success(`${extracted.length} items detected from receipt`);
    } catch (err) {
      toast.dismiss();
      console.error("Error analyzing receipt:", err);
      toast.error(err instanceof Error ? err.message : "Failed to analyze receipt");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveMultipleExpenses = async (expensesIn: Partial<ExpenseType>[]) => {
    if (!user || expensesIn.length === 0) return;

    try {
      toast.loading(`Adding ${expensesIn.length} expenses...`);
      for (const data of expensesIn) {
        await addExpense(
          {
            ...data,
            userId: user.uid,
            date: data.date || new Date(),
            amount: data.amount || 0,
            category: data.category || "other",
            description: data.description || "Unknown expense",
          },
          user.uid,
        );
      }
      await refetch();
      setIsReviewDialogOpen(false);
      setScannedReceipt(null);
      setDetectedExpenses([]);
      toast.dismiss();
      showSuccessMessage(`${expensesIn.length} expenses added successfully`);
    } catch (err) {
      toast.dismiss();
      handleError(err, "Expenses page - adding bulk expenses");
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / ITEMS_PER_PAGE));

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track, filter, and analyze every transaction.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredExpenses.length === 0}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isAnalyzing}
            onClick={() => setIsScanDialogOpen(true)}
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isAnalyzing ? "Analyzing…" : "Scan receipt"}
          </Button>
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add expense
          </Button>
        </div>
      </div>

      {analytics && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="This month"
            icon={Calendar}
            value={
              <span className="tabular-nums">{formatCurrency(analytics.currentMonth.total)}</span>
            }
            trend={
              analytics.growth.percentage !== 0
                ? {
                    value: Math.abs(analytics.growth.percentage),
                    isPositive: !analytics.growth.isIncrease,
                  }
                : undefined
            }
            hint={<span>{analytics.currentMonth.count} expenses</span>}
          />
          <StatCard
            label="Total tracked"
            icon={Wallet}
            value={<span className="tabular-nums">{formatCurrency(analytics.totalAmount)}</span>}
            hint={<span>{analytics.totalExpenses} transactions</span>}
          />
          <StatCard
            label="Avg expense"
            icon={BarChart3}
            value={<span className="tabular-nums">{formatCurrency(analytics.averageExpense)}</span>}
            hint={<span>Across all entries</span>}
          />
          <StatCard
            label="Top category"
            icon={Target}
            value={
              analytics.topCategory ? (
                <span className="tabular-nums">{formatCurrency(analytics.topCategory.amount)}</span>
              ) : (
                <span className="text-muted-foreground text-base font-normal">—</span>
              )
            }
            hint={<span className="truncate">{analytics.topCategory?.name || "No data"}</span>}
          />
        </div>
      )}

      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by description, location, or tag…"
            className="h-10 pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-1 right-1 h-8 w-8 p-0"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-[170px]">
                <Filter className="h-3.5 w-3.5" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c: ExpenseCategoryType) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="h-9 w-[170px]">
                <Calendar className="h-3.5 w-3.5" />
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="thisWeek">This week</SelectItem>
                <SelectItem value="thisMonth">This month</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 w-[170px]">
                <SortAsc className="h-3.5 w-3.5" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest first</SelectItem>
                <SelectItem value="date-asc">Oldest first</SelectItem>
                <SelectItem value="amount-desc">Highest amount</SelectItem>
                <SelectItem value="amount-asc">Lowest amount</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="description">Description</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            {selectedExpenses.length > 0 && (
              <>
                <Badge variant="secondary">{selectedExpenses.length} selected</Badge>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </>
            )}
            <div className="bg-muted flex items-center rounded-md p-0.5">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-7 px-2"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-7 px-2"
              >
                <Grid3X3 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle>Transactions</CardTitle>
            <CardDescription className="mt-1">
              {totalFilteredCount > 0
                ? `${Math.min(filteredExpenses.length, ITEMS_PER_PAGE)} of ${totalFilteredCount}`
                : "No expenses found"}
            </CardDescription>
          </div>
          {filteredExpenses.length > 0 && (
            <label className="text-muted-foreground flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedExpenses.length === filteredExpenses.length}
                onChange={handleSelectAll}
              />
              Select all
            </label>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          ) : filteredExpenses.length > 0 ? (
            <div className="px-6 pb-6">
              <ExpenseList
                expenses={filteredExpenses}
                onEdit={handleEditExpense}
                onDelete={handleDeleteClick}
                selectedExpenses={selectedExpenses}
                onToggleSelection={toggleExpenseSelection}
                viewMode={viewMode}
              />
              {totalFilteredCount > ITEMS_PER_PAGE && (
                <div className="border-border mt-6 flex items-center justify-between border-t pt-4">
                  <p className="text-muted-foreground text-sm">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <div className="bg-muted mb-4 rounded-full p-4">
                <Wallet className="text-muted-foreground h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold">No expenses found</h3>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                {searchTerm || categoryFilter !== "all" || dateFilter !== "all"
                  ? "Try adjusting your filters."
                  : "Add your first expense to start tracking."}
              </p>
              <div className="mt-5 flex gap-2">
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add expense
                </Button>
                {(searchTerm || categoryFilter !== "all" || dateFilter !== "all") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setCategoryFilter("all");
                      setDateFilter("all");
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
        title="Delete expense"
        description="Are you sure? This action cannot be undone."
      />

      <ReceiptReviewDialog
        open={isReviewDialogOpen}
        onOpenChange={setIsReviewDialogOpen}
        expenses={detectedExpenses}
        receiptImage={scannedReceipt}
        onSave={handleSaveMultipleExpenses}
        onCancel={() => {
          setIsReviewDialogOpen(false);
          setScannedReceipt(null);
          setDetectedExpenses([]);
        }}
      />

      <ScanReceiptDialog
        open={isScanDialogOpen}
        onOpenChange={setIsScanDialogOpen}
        onAnalyze={handleScanAnalyze}
        isAnalyzing={isAnalyzing}
      />
    </div>
  );
}
