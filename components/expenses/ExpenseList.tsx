"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExpenseType } from "@/types/expense";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ArrowDown, ArrowUp, MapPin, Copy, Repeat, Receipt } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import ExpenseDialog from "./ExpenseDialog";
import { ReceiptViewer } from "./ReceiptViewer";
import { PAYMENT_METHODS } from "@/types/expense";
import { CategoryIcon } from "./CategoryIcon";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { getCategoryLabel } from "@/lib/utils/categoryUtils";
import { getCategoryColor } from "@/lib/constants/categoryColors";
import { easeOut } from "@/lib/motion";

type ExpenseListProps = {
  expenses: ExpenseType[];
  onDelete?: (id: string) => void;
  onEdit?: (expense: ExpenseType) => void;
  /** Shows a "Duplicate" action that starts a new expense from this one. */
  onDuplicate?: (expense: ExpenseType) => void;
  selectedExpenses?: string[];
  onToggleSelection?: (expenseId: string) => void;
  viewMode?: "list" | "grid";
  /** When false, keep the incoming order and hide the sort controls (the parent sorts). */
  sortable?: boolean;
  /** Group rows under day headers. Only used when `sortable` is false. */
  groupByDay?: boolean;
};

type SortField = "date" | "amount" | "category";

function dayLabel(date: Date) {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, d MMM yyyy");
}

export default function ExpenseList({
  expenses,
  onDelete,
  onEdit,
  onDuplicate,
  selectedExpenses = [],
  onToggleSelection,
  viewMode = "list",
  sortable = true,
  groupByDay = false,
}: ExpenseListProps) {
  const [editingExpense, setEditingExpense] = useState<ExpenseType | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<ExpenseType | null>(null);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleEditClick = (expense: ExpenseType) => {
    setEditingExpense(expense);
  };

  const handleDeleteClick = (id: string) => {
    if (onDelete) {
      onDelete(id);
    }
  };

  const handleEditSave = (expense: ExpenseType) => {
    if (onEdit) {
      onEdit(expense);
    }
    setEditingExpense(null);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedExpenses = !sortable
    ? expenses
    : [...expenses].sort((a, b) => {
        if (sortField === "date") {
          return sortDirection === "asc"
            ? a.date.getTime() - b.date.getTime()
            : b.date.getTime() - a.date.getTime();
        } else if (sortField === "amount") {
          return sortDirection === "asc" ? a.amount - b.amount : b.amount - a.amount;
        } else {
          return sortDirection === "asc"
            ? a.category.localeCompare(b.category)
            : b.category.localeCompare(a.category);
        }
      });

  // Group by day only when sorted by date; other sorts read better as one flat list.
  const grouped = sortable ? sortField === "date" : groupByDay;
  const groups: { label: string | null; items: ExpenseType[] }[] = grouped
    ? sortedExpenses.reduce<{ label: string | null; items: ExpenseType[] }[]>((acc, e) => {
        const label = dayLabel(e.date);
        const last = acc[acc.length - 1];
        if (last && last.label === label) last.items.push(e);
        else acc.push({ label, items: [e] });
        return acc;
      }, [])
    : [{ label: null, items: sortedExpenses }];

  const actions = (expense: ExpenseType, className?: string) => (
    <div className={cn("flex gap-1", className)}>
      {onDuplicate && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onDuplicate(expense)}
          aria-label={`Duplicate expense: ${expense.description}`}
        >
          <Copy className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => handleEditClick(expense)}
        aria-label={`Edit expense: ${expense.description}`}
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hover:bg-destructive/10 hover:text-destructive h-8 w-8"
        onClick={() => handleDeleteClick(expense.id)}
        aria-label={`Delete expense: ${expense.description}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  const indicators = (expense: ExpenseType) => (
    <>
      {expense.recurringId && (
        <Repeat className="text-primary h-3 w-3 shrink-0" aria-label="Recurring expense" />
      )}
      {expense.paymentMethod && (
        <span className="bg-muted shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold">
          {PAYMENT_METHODS.find((m) => m.value === expense.paymentMethod)?.label}
        </span>
      )}
      {expense.receiptPath && (
        <button
          type="button"
          onClick={() => setViewingReceipt(expense)}
          className="hover:text-primary inline-flex shrink-0 items-center"
          aria-label={`View receipt: ${expense.description}`}
        >
          <Receipt className="h-3.5 w-3.5" />
        </button>
      )}
    </>
  );

  const renderCard = (expense: ExpenseType) => (
    <motion.div
      key={expense.id}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={easeOut}
    >
      <Card variant="interactive" className="h-full cursor-default p-4">
        <div className="flex items-start gap-3">
          {onToggleSelection && (
            <Checkbox
              checked={selectedExpenses.includes(expense.id)}
              onChange={() => onToggleSelection(expense.id)}
              className="mt-1"
              aria-label={`Select expense: ${expense.description}`}
            />
          )}
          <CategoryIcon category={expense.category} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{expense.description}</p>
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              {format(expense.date, "MMM d, yyyy")}
              {indicators(expense)}
            </p>
          </div>
          <span className="font-bold tabular-nums">{formatCurrency(expense.amount)}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap gap-1">
            <Badge className={cn("font-medium", getCategoryColor(expense.category))}>
              {getCategoryLabel(expense.category)}
            </Badge>
            {expense.tags?.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs font-medium">
                #{tag}
              </Badge>
            ))}
          </div>
          {actions(expense)}
        </div>
      </Card>
    </motion.div>
  );

  const renderRow = (expense: ExpenseType) => (
    <motion.li
      key={expense.id}
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
      transition={easeOut}
      className="group hover:bg-muted/60 flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors sm:px-3"
    >
      {onToggleSelection && (
        <Checkbox
          checked={selectedExpenses.includes(expense.id)}
          onChange={() => onToggleSelection(expense.id)}
          aria-label={`Select expense: ${expense.description}`}
        />
      )}
      <CategoryIcon category={expense.category} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{expense.description}</p>
        <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
          <span className="truncate">{getCategoryLabel(expense.category)}</span>
          {indicators(expense)}
          {!grouped && (
            <>
              <span>·</span>
              <span className="shrink-0">{format(expense.date, "MMM d")}</span>
            </>
          )}
          {expense.location && (
            <span className="hidden min-w-0 items-center gap-0.5 truncate sm:inline-flex">
              <span>·</span>
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{expense.location}</span>
            </span>
          )}
        </div>
      </div>
      {expense.tags && expense.tags.length > 0 && (
        <div className="hidden max-w-[30%] flex-wrap justify-end gap-1 lg:flex">
          {expense.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[11px] font-medium">
              #{tag}
            </Badge>
          ))}
        </div>
      )}
      <span className="shrink-0 text-right text-sm font-bold tabular-nums sm:text-base">
        −{formatCurrency(expense.amount)}
      </span>
      {actions(
        expense,
        cn(
          "shrink-0 sm:pointer-events-none sm:w-0 sm:overflow-hidden sm:opacity-0 sm:transition-all sm:duration-200 sm:group-focus-within:pointer-events-auto sm:group-focus-within:opacity-100 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100",
          onDuplicate
            ? "sm:group-focus-within:w-[104px] sm:group-hover:w-[104px]"
            : "sm:group-focus-within:w-[68px] sm:group-hover:w-[68px]",
        ),
      )}
    </motion.li>
  );

  if (!expenses || expenses.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <div className="mx-auto max-w-md">
          <h3 className="text-muted-foreground mb-2 text-lg font-semibold">No expenses found</h3>
          <p className="text-muted-foreground mb-6 text-sm">
            Add your first expense to start tracking your spending.
          </p>
        </div>
      </div>
    );
  }

  const sortBar = (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      <span className="text-muted-foreground mr-1 text-xs font-medium">Sort</span>
      {(["date", "amount", "category"] as const).map((field) => {
        const active = sortField === field;
        const Arrow = sortDirection === "asc" ? ArrowUp : ArrowDown;
        return (
          <button
            key={field}
            type="button"
            onClick={() => handleSort(field)}
            aria-label={`Sort by ${field}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors",
              active
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {field}
            {active && <Arrow className="h-3 w-3" />}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-3">
      {sortable && sortBar}

      {viewMode === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>{sortedExpenses.map(renderCard)}</AnimatePresence>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.label ?? "all"}>
              {group.label && (
                <div className="text-muted-foreground flex items-center justify-between px-3 pb-1 text-xs font-semibold">
                  <span>{group.label}</span>
                  <span className="tabular-nums">
                    {formatCurrency(group.items.reduce((s, e) => s + e.amount, 0))}
                  </span>
                </div>
              )}
              <ul className="space-y-0.5">
                <AnimatePresence initial={false}>{group.items.map(renderRow)}</AnimatePresence>
              </ul>
            </section>
          ))}
        </div>
      )}

      <ReceiptViewer
        path={viewingReceipt?.receiptPath ?? null}
        title={viewingReceipt?.description}
        onOpenChange={(open) => !open && setViewingReceipt(null)}
      />

      {editingExpense && (
        <ExpenseDialog
          expense={editingExpense}
          open={!!editingExpense}
          onOpenChange={(open) => !open && setEditingExpense(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}
