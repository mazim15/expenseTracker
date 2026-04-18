"use client";

import { useState, useEffect } from "react";
import { ExpenseType, ExpenseCategory, EXPENSE_CATEGORIES } from "@/types/expense";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/utils";
import { Trash2, Plus } from "lucide-react";

type ReceiptReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: Partial<ExpenseType>[];
  onSave: (expenses: Partial<ExpenseType>[]) => void;
  onCancel: () => void;
  receiptImage?: string | null;
};

export default function ReceiptReviewDialog({
  open,
  onOpenChange,
  expenses: initialExpenses,
  onSave,
  onCancel,
  receiptImage,
}: ReceiptReviewDialogProps) {
  const [expenses, setExpenses] = useState<Partial<ExpenseType>[]>(initialExpenses);
  const [selectedItems, setSelectedItems] = useState<Record<number, boolean>>(
    initialExpenses.reduce((acc, _, index) => ({ ...acc, [index]: true }), {}),
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
    const selectedExpenses = expenses.filter((_, index) => selectedItems[index]);
    onSave(selectedExpenses);
  };

  // Add this useEffect to sync expenses state with initialExpenses prop
  useEffect(() => {
    if (initialExpenses.length > 0) {
      setExpenses(initialExpenses);
      // Also reset the selected items when expenses change
      setSelectedItems(initialExpenses.reduce((acc, _, index) => ({ ...acc, [index]: true }), {}));
    }
  }, [initialExpenses]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-5xl overflow-hidden p-0">
        <div className="grid max-h-[85vh] grid-cols-1 md:grid-cols-[minmax(0,320px)_1fr]">
          {receiptImage ? (
            <div className="bg-muted hidden max-h-[85vh] overflow-auto border-r md:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={receiptImage} alt="Scanned receipt" className="w-full object-contain" />
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
                      <div key={index} className="grid grid-cols-12 items-center gap-2">
                        <div className="col-span-1">
                          <Checkbox
                            id={`item-${index}`}
                            checked={selectedItems[index]}
                            onChange={() => handleToggleItem(index)}
                          />
                        </div>
                        <div className="col-span-5">
                          <Input
                            value={expense.description || ""}
                            onChange={(e) =>
                              handleUpdateExpense(index, "description", e.target.value)
                            }
                            className={!selectedItems[index] ? "opacity-50" : ""}
                          />
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
