"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save } from "lucide-react";
import { EXPENSE_CATEGORIES } from "@/types/expense";
import { Badge } from "@/components/ui/badge";

export default function CategoriesPage() {
  const [categories, setCategories] = useState(EXPENSE_CATEGORIES);
  const [newCategory, setNewCategory] = useState({ label: "", value: "" });
  const [editMode, setEditMode] = useState(false);

  const handleAddCategory = () => {
    if (newCategory.label && newCategory.value) {
      setCategories([...categories, newCategory]);
      setNewCategory({ label: "", value: "" });
    }
  };

  const handleRemoveCategory = (value: string) => {
    setCategories(categories.filter(cat => cat.value !== value));
  };

  const handleSaveChanges = () => {
    // Here you would typically save to your database
    // For now, we'll just update the EXPENSE_CATEGORIES array
    // You'll need to implement the actual saving mechanism
    console.log("Categories to save:", categories);
    setEditMode(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Expense Categories</CardTitle>
              <CardDescription>Manage your expense categories</CardDescription>
            </div>
            <Button 
              variant={editMode ? "outline" : "default"}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? "Cancel" : "Edit Categories"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {editMode && (
            <div className="mb-6 space-y-4">
              <div className="flex gap-4">
                <Input
                  placeholder="Category Name"
                  value={newCategory.label}
                  onChange={(e) => setNewCategory({
                    ...newCategory,
                    label: e.target.value,
                    value: e.target.value.toLowerCase().replace(/\s+/g, '-')
                  })}
                />
                <Button onClick={handleAddCategory}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveChanges} variant="default">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-2">
            {categories.map((category) => (
              <div
                key={category.value}
                className="flex items-center justify-between p-2 rounded-lg border"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {category.label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    ({category.value})
                  </span>
                </div>
                {editMode && !['food', 'housing', 'utilities'].includes(category.value) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCategory(category.value)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 