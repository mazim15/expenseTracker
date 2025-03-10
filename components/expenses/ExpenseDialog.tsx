"use client";

import { useState, useEffect } from "react";
import { ExpenseType, ExpenseCategory } from "@/types/expense";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { format } from "date-fns";
import { EXPENSE_CATEGORIES, ExpenseCategoryType } from "@/types/expense";
import CategoryDialog from "./CategoryDialog";

type ExpenseDialogProps = {
  expense?: ExpenseType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (expense: ExpenseType) => void;
};

export default function ExpenseDialog({ expense, open, onOpenChange, onSave }: ExpenseDialogProps) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [location, setLocation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [localCategories, setLocalCategories] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("expense-categories");
      return stored ? JSON.parse(stored) : EXPENSE_CATEGORIES;
    }
    return EXPENSE_CATEGORIES;
  });
  
  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setDate(format(expense.date, "yyyy-MM-dd"));
      setCategory(expense.category);
      setDescription(expense.description);
      setTags(expense.tags || []);
      setLocation(expense.location || "");
    } else {
      setAmount("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setCategory("food");
      setDescription("");
      setTags([]);
      setLocation("");
    }
    setErrors({});
  }, [expense, open]);
  
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = "Please enter a valid amount";
    }
    
    if (!date) {
      newErrors.date = "Please select a date";
    }
    
    if (!category) {
      newErrors.category = "Please select a category";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const expenseData: ExpenseType = {
      id: expense?.id || crypto.randomUUID(),
      userId: expense?.userId || '',
      tags: tags,
      amount: parseFloat(amount),
      date: new Date(date),
      category: category,
      description: description,
      location: location || '',
      createdAt: expense?.createdAt || new Date(),
      updatedAt: new Date()
    };

    try {
      await onSave(expenseData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving expense:', error);
    }
  };
  
  const submitButtonText = expense ? "Save Changes" : "Add Expense";

  const handleCategoriesUpdate = (newCategories: typeof EXPENSE_CATEGORIES) => {
    setLocalCategories(newCategories);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-md">
        <DialogHeader className="bg-blue-600 text-white p-4">
          <DialogTitle className="text-xl font-bold text-white">
            {expense ? "Edit Expense" : "Add New Expense"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <Label htmlFor="amount" className="text-sm font-medium">Amount (PKR)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1"
            />
            {errors.amount && <p className="text-sm text-red-500 mt-1">{errors.amount}</p>}
          </div>
          
          <div>
            <Label htmlFor="description" className="text-sm font-medium">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you spend on?"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="category" className="text-sm font-medium">Category</Label>
            <div className="flex gap-2 mt-1">
              <Select 
                value={category} 
                onValueChange={(value: string) => setCategory(value as ExpenseCategory)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {localCategories.map((cat: ExpenseCategoryType) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                className="shrink-0"
                onClick={() => setCategoryDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {errors.category && <p className="text-sm text-red-500 mt-1">{errors.category}</p>}
          </div>
          
          <div>
            <Label htmlFor="date" className="text-sm font-medium">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
            {errors.date && <p className="text-sm text-red-500 mt-1">{errors.date}</p>}
          </div>
          
          <div>
            <Label htmlFor="location" className="text-sm font-medium">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter location (optional)"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="tags" className="text-sm font-medium">Tags</Label>
            <div className="flex flex-wrap gap-2 mt-1 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button 
                    type="button" 
                    onClick={() => handleRemoveTag(tag)}
                    className="rounded-full hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove {tag} tag</span>
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add tags (press Enter)"
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                onClick={handleAddTag}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2"
          >
            {submitButtonText}
          </Button>
        </form>
        
        <CategoryDialog 
          open={categoryDialogOpen}
          onOpenChange={setCategoryDialogOpen}
          onCategoriesUpdate={handleCategoriesUpdate}
        />
      </DialogContent>
    </Dialog>
  );
} 