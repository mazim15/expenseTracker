"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  ExpenseType,
  ExpenseCategoryType,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} from "@/types/expense";
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
  ScanLine,
  Loader2,
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
  CheckSquare,
  Repeat,
  Upload,
  CreditCard,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { EmptyState } from "@/components/ui/empty-state";
import { motion } from "framer-motion";
import { fadeUp, spring, stagger } from "@/lib/motion";
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
import { analyzeReceipt, formatScanCost, type ScanUsage } from "@/lib/utils/receiptAnalysis";
import { knownMerchantNames } from "@/lib/utils/enrichment";
import { getUserCategories } from "@/lib/categories";
import { uploadReceipt } from "@/lib/receipts";
import RecurringDialog from "@/components/expenses/RecurringDialog";
import ImportCsvDialog from "@/components/expenses/ImportCsvDialog";
import { useLogger } from "@/lib/hooks/useLogger";
import { cn } from "@/lib/utils";

export default function ExpensesPage() {
  const { user } = useAuth();
  const { logAction } = useLogger();

  const expensesQuery = useExpensesQuery(user?.uid);
  const allExpenses = useMemo(() => expensesQuery.data ?? [], [expensesQuery.data]);

  const knownTags = useMemo(() => {
    const counts = new Map<string, { display: string; count: number }>();
    for (const exp of allExpenses) {
      for (const tag of exp.tags ?? []) {
        const key = tag.trim().toLowerCase();
        if (!key) continue;
        const existing = counts.get(key);
        if (existing) existing.count += 1;
        else counts.set(key, { display: tag.trim(), count: 1 });
      }
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .map((t) => t.display);
  }, [allExpenses]);
  const loading = expensesQuery.isLoading;
  const createMutation = useCreateExpenseMutation(user?.uid);
  const updateMutation = useUpdateExpenseMutation(user?.uid);
  const deleteMutation = useDeleteExpenseMutation(user?.uid);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseType | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [categories, setCategories] = useState(EXPENSE_CATEGORIES);

  const searchParams = useSearchParams();
  const router = useRouter();

  const [scannedReceipts, setScannedReceipts] = useState<string[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedExpenses, setDetectedExpenses] = useState<Partial<ExpenseType>[]>([]);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false);
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<Partial<ExpenseType> | null>(null);

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

  const filteredSorted = useMemo(() => {
    if (!Array.isArray(allExpenses)) return [];
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

    if (paymentFilter === "unspecified") {
      filtered = filtered.filter((e) => !e.paymentMethod);
    } else if (paymentFilter !== "all") {
      filtered = filtered.filter((e) => e.paymentMethod === paymentFilter);
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

    return sortExpenses(filtered, sortBy);
  }, [allExpenses, searchTerm, categoryFilter, paymentFilter, dateFilter, sortBy, sortExpenses]);

  const totalFilteredCount = filteredSorted.length;

  const filteredExpenses = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSorted.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSorted, currentPage]);

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
      throw error;
    }
  }, [user, selectedExpenses, deleteMutation, logAction]);

  const handleBulkCategoryChange = useCallback(
    async (newCategory: string) => {
      if (!user || selectedExpenses.length === 0) return;
      try {
        await Promise.all(
          selectedExpenses.map((id) =>
            updateMutation.mutateAsync({
              id,
              userId: user.uid,
              patch: { category: newCategory },
            }),
          ),
        );
        const count = selectedExpenses.length;
        setSelectedExpenses([]);
        showSuccessMessage(`${count} expenses moved to ${newCategory}`);
        logAction("bulk_update_category", {
          count,
          category: newCategory,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        handleError(error, "Bulk update category");
      }
    },
    [user, selectedExpenses, updateMutation, logAction],
  );

  const handleSelectAll = useCallback(() => {
    if (selectedExpenses.length === filteredSorted.length) {
      setSelectedExpenses([]);
    } else {
      setSelectedExpenses(filteredSorted.map((e) => e.id));
    }
  }, [selectedExpenses.length, filteredSorted]);

  const toggleExpenseSelection = useCallback((id: string) => {
    setSelectedExpenses((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setIsAddDialogOpen(true);
    }
    if (searchParams.get("recurring") === "open") {
      setIsRecurringOpen(true);
    }
    // Links from search and insights: ?search=… / ?category=… set the filters once
    const searchParam = searchParams.get("search");
    const categoryParam = searchParams.get("category");
    if (searchParam || categoryParam) {
      if (searchParam) setSearchTerm(searchParam);
      if (categoryParam) setCategoryFilter(categoryParam);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("search");
      newParams.delete("category");
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
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, paymentFilter, dateFilter, sortBy]);

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
    if (filteredSorted.length > 0) exportExpensesToCSV(filteredSorted);
  };

  const handleScanAnalyze = async ({ images }: ScanReceiptResult) => {
    try {
      setIsAnalyzing(true);
      setScannedReceipts(images.map((img) => img.dataUrl));
      toast.loading("Analyzing receipt...");

      let scanCost: ScanUsage | null = null;
      const extracted = await analyzeReceipt(images, {
        knownTags,
        knownMerchants: knownMerchantNames(allExpenses),
        onUsage: (u) => (scanCost = u),
      });

      const expenseWithUser = { ...extracted, userId: user?.uid || "" };
      setDetectedExpenses([expenseWithUser]);
      setIsScanDialogOpen(false);
      setTimeout(() => setIsReviewDialogOpen(true), 0);

      toast.dismiss();
      toast.success("Receipt scanned", {
        description: scanCost
          ? `Scan cost ${formatScanCost((scanCost as ScanUsage).costUsd)}`
          : undefined,
      });
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
      // Keep the receipt photo: one copy per expense, so deleting one never removes another's
      let receiptFailed = false;
      // Links every expense saved from this scan to the same receipt
      const receiptId = crypto.randomUUID();
      for (const data of expensesIn) {
        let receiptPath: string | undefined;
        if (scannedReceipts?.[0]) {
          try {
            receiptPath = await uploadReceipt(scannedReceipts[0]);
          } catch (err) {
            console.error("Receipt upload failed:", err);
            receiptFailed = true;
          }
        }
        await addExpense(
          {
            ...data,
            ...(receiptPath && { receiptPath }),
            receiptId,
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
      setScannedReceipts(null);
      setDetectedExpenses([]);
      toast.dismiss();
      showSuccessMessage(`${expensesIn.length} expenses added successfully`);
      if (receiptFailed) toast.warning("Expenses saved, but the receipt photo couldn't be kept.");
    } catch (err) {
      toast.dismiss();
      handleError(err, "Expenses page - adding bulk expenses");
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / ITEMS_PER_PAGE));

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 lg:px-8 lg:py-2">
      <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-muted-foreground text-sm">
          Track, filter, and analyze every transaction.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => refetch()}
            variant="ghost"
            size="icon"
            disabled={loading}
            aria-label="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsRecurringOpen(true)}>
            <Repeat className="h-4 w-4" />
            Recurring
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={totalFilteredCount === 0}
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
              <ScanLine className="h-4 w-4" />
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
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger(0.06)}
          className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
        >
          <motion.div variants={fadeUp}>
            <StatCard
              label="This month"
              icon={Calendar}
              value={<AnimatedNumber value={analytics.currentMonth.total} />}
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
          </motion.div>
          <motion.div variants={fadeUp}>
            <StatCard
              label="Total tracked"
              icon={Wallet}
              tone="bg-highlight/40 text-highlight-foreground"
              value={<AnimatedNumber value={analytics.totalAmount} />}
              hint={<span>{analytics.totalExpenses} transactions</span>}
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <StatCard
              label="Avg expense"
              icon={BarChart3}
              tone="bg-violet-500/12 text-violet-600 dark:text-violet-300"
              value={<AnimatedNumber value={analytics.averageExpense} />}
              hint={<span>Across all entries</span>}
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <StatCard
              label="Top category"
              icon={Target}
              tone="bg-orange-500/12 text-orange-600 dark:text-orange-300"
              value={
                analytics.topCategory ? (
                  <AnimatedNumber value={analytics.topCategory.amount} />
                ) : (
                  <span className="text-muted-foreground text-base font-normal">—</span>
                )
              }
              hint={<span className="truncate">{analytics.topCategory?.name || "No data"}</span>}
            />
          </motion.div>
        </motion.div>
      )}

      <div className="bg-background/80 sticky top-16 z-20 -mx-4 mb-4 space-y-3 px-4 py-3 backdrop-blur-xl lg:top-20 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search by description, location, or tag…"
              className="bg-card shadow-soft pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1.5 right-1.5 h-8 w-8"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="bg-card shadow-soft w-full gap-2 sm:w-[150px]">
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

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger
                className="bg-card shadow-soft w-full gap-2 sm:w-[150px]"
                aria-label="Payment method"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any payment</SelectItem>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
                <SelectItem value="unspecified">Not set</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-card shadow-soft w-full gap-2 sm:w-[170px]">
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
        </div>

        <div className="scrollbar-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {[{ value: "all", label: "All" }, ...categories].map((c: ExpenseCategoryType) => {
            const active = categoryFilter === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategoryFilter(c.value)}
                className={cn(
                  "relative shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                  active
                    ? "text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground shadow-soft",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="category-chip"
                    transition={spring}
                    className="bg-primary absolute inset-0 rounded-full"
                  />
                )}
                <span className="relative">{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-3">
          <div>
            <CardTitle>Transactions</CardTitle>
            <CardDescription className="mt-1.5">
              {totalFilteredCount > 0
                ? `${Math.min(filteredExpenses.length, ITEMS_PER_PAGE)} of ${totalFilteredCount}`
                : "No expenses found"}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectionMode && totalFilteredCount > 0 && (
              <label className="text-muted-foreground flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedExpenses.length === totalFilteredCount}
                  onChange={handleSelectAll}
                />
                All
              </label>
            )}
            {selectionMode && selectedExpenses.length > 0 && (
              <>
                <Badge variant="secondary">{selectedExpenses.length} selected</Badge>
                <Select onValueChange={handleBulkCategoryChange}>
                  <SelectTrigger className="h-9 w-[170px]">
                    <SelectValue placeholder="Change category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c: ExpenseCategoryType) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </>
            )}
            <Button
              variant={selectionMode ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setSelectionMode((prev) => !prev);
                setSelectedExpenses([]);
              }}
            >
              <CheckSquare className="h-4 w-4" />
              {selectionMode ? "Done" : "Select"}
            </Button>
            <div className="bg-muted flex items-center rounded-full p-1">
              {(
                [
                  { mode: "list", icon: List, label: "List view" },
                  { mode: "grid", icon: Grid3X3, label: "Grid view" },
                ] as const
              ).map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  type="button"
                  aria-label={label}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "relative rounded-full px-2.5 py-1.5 transition-colors",
                    viewMode === mode ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {viewMode === mode && (
                    <motion.span
                      layoutId="view-mode"
                      transition={spring}
                      className="bg-card shadow-soft absolute inset-0 rounded-full"
                    />
                  )}
                  <Icon className="relative h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 pt-0 sm:px-4">
          {loading ? (
            <div className="space-y-3 px-2 pb-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-1/3" />
                    <Skeleton className="h-3 w-1/5" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : filteredExpenses.length > 0 ? (
            <div className="pb-3">
              <ExpenseList
                expenses={filteredExpenses}
                onEdit={handleEditExpense}
                onDelete={handleDeleteClick}
                onDuplicate={(e) =>
                  setDuplicateSource({
                    amount: e.amount,
                    category: e.category,
                    description: e.description,
                    location: e.location,
                    tags: e.tags,
                    paymentMethod: e.paymentMethod,
                  })
                }
                selectedExpenses={selectedExpenses}
                onToggleSelection={selectionMode ? toggleExpenseSelection : undefined}
                viewMode={viewMode}
                sortable={false}
                groupByDay={sortBy.startsWith("date")}
              />
              {totalFilteredCount > ITEMS_PER_PAGE && (
                <div className="border-border mx-2 mt-6 flex items-center justify-between border-t pt-4">
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
          ) : searchTerm ||
            categoryFilter !== "all" ||
            paymentFilter !== "all" ||
            dateFilter !== "all" ? (
            <EmptyState
              icon={<Search />}
              image="/illustrations/empty-search.png"
              title="Nothing matches"
              description="Try a different search or clear your filters."
              actionLabel="Clear filters"
              onAction={() => {
                setSearchTerm("");
                setCategoryFilter("all");
                setPaymentFilter("all");
                setDateFilter("all");
              }}
            />
          ) : (
            <EmptyState
              icon={<Wallet />}
              image="/illustrations/empty-expenses.png"
              title="No expenses yet"
              description="Add your first expense or scan a receipt to start tracking."
              actionLabel="Add expense"
              onAction={() => setIsAddDialogOpen(true)}
            />
          )}
        </CardContent>
      </Card>

      <ExpenseDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleAddExpense}
      />

      <ExpenseDialog
        open={!!duplicateSource}
        onOpenChange={(open) => !open && setDuplicateSource(null)}
        onSave={async (data) => {
          await handleAddExpense(data);
          setDuplicateSource(null);
        }}
        initialValues={duplicateSource ?? undefined}
      />

      <RecurringDialog open={isRecurringOpen} onOpenChange={setIsRecurringOpen} />

      <ImportCsvDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        userId={user?.uid}
        categories={categories.map((c) => c.value)}
        existing={allExpenses}
        onImported={() => refetch()}
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

      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onConfirm={handleBulkDelete}
        title="Delete expenses"
        description={`Delete ${selectedExpenses.length} selected ${
          selectedExpenses.length === 1 ? "expense" : "expenses"
        }? This action cannot be undone.`}
      />

      <ReceiptReviewDialog
        open={isReviewDialogOpen}
        onOpenChange={setIsReviewDialogOpen}
        expenses={detectedExpenses}
        receiptImages={scannedReceipts}
        existing={allExpenses}
        onSave={handleSaveMultipleExpenses}
        onCancel={() => {
          setIsReviewDialogOpen(false);
          setScannedReceipts(null);
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
