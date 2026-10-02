"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ExpenseType,
  ExpenseCategory,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  PaymentMethod,
  isPaymentMethod,
} from "@/types/expense";
import { findLikelyDuplicate } from "@/lib/utils/duplicates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatCurrency } from "@/lib/utils";
import { Trash2, Plus, AlertTriangle } from "lucide-react";

type ReceiptReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: Partial<ExpenseType>[];
  onSave: (expenses: Partial<ExpenseType>[]) => void;
  onCancel: () => void;
  receiptImages?: string[] | null;
  /** Existing expenses, used to flag items that look already recorded. */
  existing?: ExpenseType[];
};

function duplicateOf(e: Partial<ExpenseType>, existing: ExpenseType[]) {
  if (!e.amount || !e.date) return null;
  return findLikelyDuplicate(
    {
      amount: e.amount,
      date: e.date,
      description: e.description ?? "",
      category: e.category ?? "other",
      location: e.location,
    },
    existing,
  );
}

function storedPaymentMethod(): PaymentMethod | "" {
  try {
    const v = localStorage.getItem("lastPaymentMethod");
    return isPaymentMethod(v) ? v : "";
  } catch {
    return "";
  }
}

export default function ReceiptReviewDialog({
  open,
  onOpenChange,
  expenses: initialExpenses,
  onSave,
  onCancel,
  receiptImages,
  existing = [],
}: ReceiptReviewDialogProps) {
  const [expenses, setExpenses] = useState<Partial<ExpenseType>[]>(initialExpenses);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");

  const duplicates = useMemo(
    () => expenses.map((e) => duplicateOf(e, existing)),
    [expenses, existing],
  );

  // Items that look already recorded start unchecked
  const initialSelection = (list: Partial<ExpenseType>[]) =>
    list.reduce<Record<number, boolean>>(
      (acc, e, index) => ({ ...acc, [index]: !duplicateOf(e, existing) }),
      {},
    );

  const [selectedItems, setSelectedItems] = useState<Record<number, boolean>>(() =>
    initialSelection(initialExpenses),
  );

  // Calculate total amount for selected expenses
  const totalAmount = expenses
    .filter((_, index) => selectedItems[index])
    .reduce((sum, expense) => sum + (expense.amount || 0), 0);

  const handleToggleItem = (index: number) => {
    setSelectedItems((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleUpdateExpense = (index: number, field: keyof ExpenseType, value: unknown) => {
    setExpenses((prev) =>
      prev.map((expense, i) => (i === index ? { ...expense, [field]: value } : expense)),
    );
  };

  const handleRemoveExpense = (index: number) => {
    setExpenses((prev) => prev.filter((_, i) => i !== index));
    setSelectedItems((prev) => {
      const newSelected = { ...prev };
      delete newSelected[index];

      // Re-index the remaining items
      return Object.keys(newSelected).reduce((acc, key) => {
        const oldIndex = parseInt(key);
        const newIndex = oldIndex > index ? oldIndex - 1 : oldIndex;
        return { ...acc, [newIndex]: newSelected[oldIndex] };
      }, {});
    });
  };

  const handleSave = () => {
    const selectedExpenses = expenses
      .filter((_, index) => selectedItems[index])
      .map((e) => (paymentMethod ? { ...e, paymentMethod } : e));
    if (paymentMethod) {
      try {
        localStorage.setItem("lastPaymentMethod", paymentMethod);
      } catch {
        // storage unavailable
      }
    }
    onSave(selectedExpenses);
  };

  // Add this useEffect to sync expenses state with initialExpenses prop
  useEffect(() => {
    if (initialExpenses.length > 0) {
      setExpenses(initialExpenses);
      // Also reset the selected items when expenses change
      setSelectedItems(initialSelection(initialExpenses));
      setPaymentMethod(storedPaymentMethod());
    }
    // initialSelection only depends on `existing`, which is stable while the dialog is open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialExpenses]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-5xl overflow-hidden p-0">
        <div className="grid max-h-[85vh] grid-cols-1 md:grid-cols-[minmax(0,320px)_1fr]">
          {receiptImages && receiptImages.length > 0 ? (
            <div className="bg-muted hidden max-h-[85vh] space-y-2 overflow-auto border-r p-2 md:block">
              {receiptImages.map((src, idx) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={idx}
                  src={src}
                  alt={`Scanned receipt ${idx + 1}`}
                  className="w-full rounded object-contain"
                />
              ))}
            </div>
          ) : null}

          <div className="flex max-h-[85vh] flex-col overflow-hidden">
            <DialogHeader className="border-b px-6 py-4">
              <DialogTitle className="text-xl font-bold">Review receipt items</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <p className="text-muted-foreground mb-4 text-sm">
                Review the items detected from your receipt. Select the items you want to add as
                expenses.
              </p>

              <div className="space-y-4">
                {expenses.length === 0 ? (
                  <div className="text-muted-foreground py-6 text-center">
                    No items detected from the receipt.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-12 gap-2 border-b pb-2 text-sm font-medium">
                      <div className="col-span-1"></div>
                      <div className="col-span-5">Description</div>
                      <div className="col-span-2">Amount</div>
                      <div className="col-span-3">Category</div>
                      <div className="col-span-1"></div>
                    </div>

                    {expenses.map((expense, index) => (
                      <div key={index} className="grid grid-cols-12 items-start gap-2">
                        <div className="col-span-1 pt-2">
                          <Checkbox
                            id={`item-${index}`}
                            checked={selectedItems[index]}
                            onChange={() => handleToggleItem(index)}
                          />
                        </div>
                        <div className="col-span-5">
                          <Textarea
                            value={expense.description || ""}
                            onChange={(e) =>
                              handleUpdateExpense(index, "description", e.target.value)
                            }
                            rows={Math.min(
                              10,
                              Math.max(2, (expense.description || "").split("\n").length),
                            )}
                            className={!selectedItems[index] ? "opacity-50" : ""}
                          />
                          <Input
                            value={expense.merchant || ""}
                            onChange={(e) => handleUpdateExpense(index, "merchant", e.target.value)}
                            placeholder="Merchant (store or app)"
                            aria-label="Merchant"
                            maxLength={100}
                            className={cn(
                              "mt-1 h-8 text-sm",
                              !selectedItems[index] && "opacity-50",
                            )}
                          />
                          {duplicates[index] && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              Looks like &ldquo;{duplicates[index]!.description}&rdquo; you already
                              added
                            </p>
                          )}
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={expense.amount || ""}
                            onChange={(e) =>
                              handleUpdateExpense(index, "amount", parseFloat(e.target.value))
                            }
                            className={!selectedItems[index] ? "opacity-50" : ""}
                          />
                        </div>
                        <div className="col-span-3">
                          <Select
                            value={(expense.category as string) || "other"}
                            onValueChange={(value) =>
                              handleUpdateExpense(index, "category", value as ExpenseCategory)
                            }
                          >
                            <SelectTrigger className={!selectedItems[index] ? "opacity-50" : ""}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {EXPENSE_CATEGORIES.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveExpense(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                      <span className="text-sm font-medium">Paid with</span>
                      {PAYMENT_METHODS.map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() =>
                            setPaymentMethod((cur) => (cur === m.value ? "" : m.value))
                          }
                          aria-pressed={paymentMethod === m.value}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                            paymentMethod === m.value
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t pt-4">
                      <p className="font-medium">Total Selected: {formatCurrency(totalAmount)}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setExpenses([
                            ...expenses,
                            {
                              description: "",
                              amount: 0,
                              category: "other",
                              date: new Date(),
                            },
                          ])
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Item
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <DialogFooter className="border-t px-6 py-3">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={expenses.length === 0 || Object.values(selectedItems).every((v) => !v)}
              >
                Add {Object.values(selectedItems).filter(Boolean).length} Expense
                {Object.values(selectedItems).filter(Boolean).length !== 1 ? "s" : ""}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
