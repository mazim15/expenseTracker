"use client";

import { useState } from "react";
import { ExpenseType } from "@/types/expense";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import ExpenseDialog from "./ExpenseDialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCategoryLabel } from "@/lib/utils/categoryUtils";
import { getCategoryColor } from "@/lib/constants/categoryColors";

type ExpenseListProps = {
  expenses: ExpenseType[];
  onDelete?: (id: string) => void;
  onEdit?: (expense: ExpenseType) => void;
  selectedExpenses?: string[];
  onToggleSelection?: (expenseId: string) => void;
  viewMode?: "list" | "grid";
};

export default function ExpenseList({ expenses, onDelete, onEdit }: ExpenseListProps) {
  const [editingExpense, setEditingExpense] = useState<ExpenseType | null>(null);
  const [sortField, setSortField] = useState<'date' | 'amount' | 'category'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  
  
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
  
  const handleSort = (field: 'date' | 'amount' | 'category') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  const sortedExpenses = [...expenses].sort((a, b) => {
    if (sortField === 'date') {
      return sortDirection === 'asc' 
        ? a.date.getTime() - b.date.getTime()
        : b.date.getTime() - a.date.getTime();
    } else if (sortField === 'amount') {
      return sortDirection === 'asc' 
        ? a.amount - b.amount
        : b.amount - a.amount;
    } else {
      return sortDirection === 'asc'
        ? a.category.localeCompare(b.category)
        : b.category.localeCompare(a.category);
    }
  });
  
  if (!expenses || expenses.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="mx-auto max-w-md">
          <h3 className="text-lg font-medium text-muted-foreground mb-2">No expenses found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Add your first expense to start tracking your spending.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Mobile view */}
      <div className="block md:hidden space-y-3">
        {sortedExpenses.map((expense) => (
          <Card key={expense.id} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`font-normal ${getCategoryColor(expense.category)}`}>
                    {getCategoryLabel(expense.category)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(expense.date, "MMM d, yyyy")}
                  </span>
                </div>
                <p className="font-medium">{expense.description}</p>
                {expense.location && (
                  <p className="text-sm text-muted-foreground">{expense.location}</p>
                )}
                {expense.tags && expense.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {expense.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="font-semibold text-lg">
                  {formatCurrency(expense.amount)}
                </span>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleEditClick(expense)}
                    aria-label={`Edit expense: ${expense.description}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeleteClick(expense.id)}
                    aria-label={`Delete expense: ${expense.description}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {/* Desktop view */}
      <div className="hidden md:block overflow-x-auto rounded-md">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b text-left">
              <th className="py-3 px-4 font-medium">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hover:bg-transparent p-0 h-auto font-medium"
                  onClick={() => handleSort('date')}
                  aria-label="Sort by date"
                >
                  Date
                  <ArrowUpDown className={`ml-2 h-4 w-4 ${sortField === 'date' ? 'opacity-100' : 'opacity-40'}`} />
                </Button>
              </th>
              <th className="py-3 px-4 font-medium">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hover:bg-transparent p-0 h-auto font-medium"
                  onClick={() => handleSort('category')}
                  aria-label="Sort by category"
                >
                  Category
                  <ArrowUpDown className={`ml-2 h-4 w-4 ${sortField === 'category' ? 'opacity-100' : 'opacity-40'}`} />
                </Button>
              </th>
              <th className="py-3 px-4 font-medium">Description</th>
              <th className="py-3 px-4 font-medium">Tags</th>
              <th className="py-3 px-4 font-medium">Location</th>
              <th className="py-3 px-4 font-medium text-right">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hover:bg-transparent p-0 h-auto font-medium ml-auto"
                  onClick={() => handleSort('amount')}
                  aria-label="Sort by amount"
                >
                  Amount
                  <ArrowUpDown className={`ml-2 h-4 w-4 ${sortField === 'amount' ? 'opacity-100' : 'opacity-40'}`} />
                </Button>
              </th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedExpenses.map((expense) => (
              <tr key={expense.id} className="border-b hover:bg-muted/50 transition-colors">
                <td className="py-3 px-4">{format(expense.date, "MMM d, yyyy")}</td>
                <td className="py-3 px-4">
                  <Badge className={`font-normal ${getCategoryColor(expense.category)}`}>
                    {getCategoryLabel(expense.category)}
                  </Badge>
                </td>
                <td className="py-3 px-4">{expense.description}</td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1">
                    {expense.tags?.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4">{expense.location || "-"}</td>
                <td className="py-3 px-4 text-right font-semibold">{formatCurrency(expense.amount)}</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEditClick(expense)}
                      aria-label={`Edit expense: ${expense.description}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteClick(expense.id)}
                      aria-label={`Delete expense: ${expense.description}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
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