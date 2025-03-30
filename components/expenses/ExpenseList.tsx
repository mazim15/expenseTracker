"use client";

import { useState } from "react";
import { ExpenseType } from "@/types/expense";
import { EXPENSE_CATEGORIES } from "@/types/expense";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import ExpenseDialog from "./ExpenseDialog";
import { Badge } from "@/components/ui/badge";

type ExpenseListProps = {
  expenses: ExpenseType[];
  onDelete?: (id: string) => void;
  onEdit?: (expense: ExpenseType) => void;
};

export default function ExpenseList({ expenses, onDelete, onEdit }: ExpenseListProps) {
  const [editingExpense, setEditingExpense] = useState<ExpenseType | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'date' | 'amount' | 'category'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const getCategoryLabel = (categoryValue: string) => {
    const category = EXPENSE_CATEGORIES.find(cat => cat.value === categoryValue);
    return category ? category.label : categoryValue;
  };
  
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      food: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      housing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      transportation: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      utilities: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      entertainment: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
      healthcare: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      shopping: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      education: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
      personal: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
      other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    };
    
    return colors[category] || colors.other;
  };
  
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
      <div className="overflow-x-auto rounded-md">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-3 px-4 font-medium">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hover:bg-transparent p-0 h-auto font-medium"
                  onClick={() => handleSort('date')}
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
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(expense)}>
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(expense.id)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
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