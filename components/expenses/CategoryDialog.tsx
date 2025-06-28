"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Save } from "lucide-react";
import { EXPENSE_CATEGORIES, ExpenseCategoryType, updateExpenseCategories } from "@/types/expense";
import { useAuth } from "@/lib/auth/AuthContext";
import { saveUserCategories } from "@/lib/categories";
import { toast } from "sonner";

type CategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoriesUpdate?: (categories: typeof EXPENSE_CATEGORIES) => void;
};

export default function CategoryDialog({ open, onOpenChange, onCategoriesUpdate }: CategoryDialogProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("expense-categories");
      return stored ? JSON.parse(stored) : EXPENSE_CATEGORIES;
    }
    return EXPENSE_CATEGORIES;
  });
  const [newCategory, setNewCategory] = useState({ value: "", label: "" });

  const handleAddCategory = () => {
    if (newCategory.label.trim()) {
      const value = newCategory.label.toLowerCase().replace(/\s+/g, '-');
      setCategories([...categories, { value, label: newCategory.label.trim() }]);
      setNewCategory({ value: "", label: "" });
    }
  };

  const handleRemoveCategory = (valueToRemove: string) => {
    setCategories(categories.filter((cat: ExpenseCategoryType) => cat.value !== valueToRemove));
  };

  const handleSave = async () => {
    try {
      updateExpenseCategories(categories);
      
      // Save to localStorage for immediate use
      if (typeof window !== "undefined") {
        localStorage.setItem("expense-categories", JSON.stringify(categories));
      }
      
      // Also save to database if user is authenticated
      if (user && user.uid) {
        console.log("Saving categories to database for user:", user.uid);
        await saveUserCategories(user.uid, categories);
      } else {
        console.warn("Cannot save categories to database: No authenticated user");
      }
      
      onCategoriesUpdate?.(categories);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save categories:", error);
      toast.error("Failed to save categories");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-md">
        <DialogHeader className="bg-blue-600 text-white p-4">
          <DialogTitle className="text-xl font-bold text-white">
            Manage Categories
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newCategory" className="text-sm font-medium">Add New Category</Label>
            <div className="flex gap-2">
              <Input
                id="newCategory"
                value={newCategory.label}
                onChange={(e) => setNewCategory({
                  label: e.target.value,
                  value: e.target.value.toLowerCase().replace(/\s+/g, '-')
                })}
                placeholder="Category name"
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddCategory}
                className="shrink-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Current Categories</Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {categories.map((category: ExpenseCategoryType) => (
                <div 
                  key={category.value}
                  className="flex items-center justify-between p-2 bg-muted rounded-md"
                >
                  <span>{category.label}</span>
                  {/* Don't allow removing the "other" category */}
                  {category.value !== 'other' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCategory(category.value)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove {category.label}</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 