"use client";

import { useState, useEffect } from "react";
import { ExpenseType, ExpenseCategory } from "@/types/expense";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Upload, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { EXPENSE_CATEGORIES, ExpenseCategoryType } from "@/types/expense";
import CategoryDialog from "./CategoryDialog";
import { analyzeReceipt, fileToBase64 } from "@/lib/utils/receiptAnalysis";
import { toast } from "sonner";
import Image from 'next/image';
import { useAuth } from "@/lib/auth/AuthContext";
import { getUserCategories } from "@/lib/categories";
import { useLogger } from "@/lib/hooks/useLogger";

type ExpenseDialogProps = {
  expense?: ExpenseType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (expense: ExpenseType) => void;
};

export default function ExpenseDialog({ expense, open, onOpenChange, onSave }: ExpenseDialogProps) {
  const { user } = useAuth();
  const { logAction, logError, withActionLogging } = useLogger();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [location, setLocation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [localCategories, setLocalCategories] = useState(EXPENSE_CATEGORIES);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
  
  useEffect(() => {
    const fetchCategories = async () => {
      if (user && user.uid) {
        try {
          // Try to get from database first
          const userCategories = await getUserCategories(user.uid);
          if (userCategories && userCategories.length > 0) {
            setLocalCategories(userCategories);
            // Update localStorage for faster access
            localStorage.setItem("expense-categories", JSON.stringify(userCategories));
          } else {
            // If no database categories, check localStorage
            const storedCategories = localStorage.getItem("expense-categories");
            if (storedCategories) {
              try {
                setLocalCategories(JSON.parse(storedCategories));
              } catch (error) {
                console.error("Error parsing stored categories:", error);
                setLocalCategories(EXPENSE_CATEGORIES);
              }
            } else {
              // Use defaults
              setLocalCategories(EXPENSE_CATEGORIES);
            }
          }
        } catch (error) {
          console.error("Error fetching categories:", error);
          // Fallback to localStorage or defaults
          const storedCategories = localStorage.getItem("expense-categories");
          if (storedCategories) {
            try {
              setLocalCategories(JSON.parse(storedCategories));
            } catch {
              setLocalCategories(EXPENSE_CATEGORIES);
            }
          } else {
            setLocalCategories(EXPENSE_CATEGORIES);
          }
        }
      } else {
        // No user, use localStorage or defaults
        const storedCategories = localStorage.getItem("expense-categories");
        if (storedCategories) {
          try {
            setLocalCategories(JSON.parse(storedCategories));
          } catch {
            setLocalCategories(EXPENSE_CATEGORIES);
          }
        } else {
          setLocalCategories(EXPENSE_CATEGORIES);
        }
      }
    };
    
    fetchCategories();
  }, [user]);
  
  const handleAddTag = () => {
    const newTag = tagInput.trim();
    if (newTag && !tags.includes(newTag) && newTag.length <= 20) {
      setTags([...tags, newTag]);
      setTagInput("");
    } else if (newTag.length > 20) {
      toast.error("Tag must be 20 characters or less");
    } else if (tags.includes(newTag)) {
      toast.error("Tag already exists");
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
    
    if (!description.trim()) {
      newErrors.description = "Please enter a description";
    }
    
    if (location && location.length > 100) {
      newErrors.location = "Location must be 100 characters or less";
    }
    
    if (tags.length > 10) {
      newErrors.tags = "Maximum 10 tags allowed";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = withActionLogging(
    expense ? 'expense_edit' : 'expense_create',
    async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!validateForm()) {
        await logAction('expense_validation_failed', {
          hasAmount: !!amount,
          hasDate: !!date,
          hasCategory: !!category,
          hasDescription: !!description.trim(),
          errorCount: Object.keys(errors).length
        });
        return;
      }
      
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
        setIsSubmitting(true);
        await onSave(expenseData);
        
        await logAction(expense ? 'expense_updated' : 'expense_created', {
          expenseId: expenseData.id,
          amount: expenseData.amount,
          category: expenseData.category,
          hasLocation: !!expenseData.location,
          tagCount: expenseData.tags?.length || 0
        });
        
        onOpenChange(false);
      } catch (error) {
        await logError(error as Error, 'expense_save_failed', {
          expenseId: expenseData.id,
          isEdit: !!expense
        });
        toast.error('Failed to save expense');
      } finally {
        setIsSubmitting(false);
      }
    },
    {
      isEdit: !!expense,
      amount: parseFloat(amount) || 0,
      category,
      hasLocation: !!location,
      tagCount: tags.length
    }
  );
  
  const submitButtonText = expense ? "Save Changes" : "Add Expense";

  const handleCategoriesUpdate = (newCategories: typeof EXPENSE_CATEGORIES) => {
    setLocalCategories(newCategories);
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const startTime = Date.now();
    
    try {
      await logAction('receipt_upload_started', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      
      const base64Image = await fileToBase64(file);
      setReceiptImage(base64Image);
      
      setIsAnalyzing(true);
      toast.loading("Analyzing receipt...");
      
      const extractedData = await analyzeReceipt(base64Image);
      const duration = Date.now() - startTime;
      
      if (extractedData && extractedData.length > 0) {
        const firstItem = extractedData[0];
        const fieldsExtracted = [];
        
        if (firstItem.amount) {
          setAmount(firstItem.amount.toString());
          fieldsExtracted.push('amount');
        }
        if (firstItem.date) {
          setDate(format(firstItem.date, "yyyy-MM-dd"));
          fieldsExtracted.push('date');
        }
        if (firstItem.category) {
          setCategory(firstItem.category);
          fieldsExtracted.push('category');
        }
        if (firstItem.description) {
          setDescription(firstItem.description);
          fieldsExtracted.push('description');
        }
        
        await logAction('receipt_analysis_successful', {
          fileName: file.name,
          fieldsExtracted,
          extractedFieldCount: fieldsExtracted.length,
          processingTime: duration
        });
      } else {
        await logAction('receipt_analysis_no_data', {
          fileName: file.name,
          processingTime: duration
        });
      }
      
      toast.dismiss();
      toast.success("Receipt analyzed successfully");
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await logError(error as Error, 'receipt_analysis_failed', {
        fileName: file.name,
        fileSize: file.size,
        processingTime: duration
      });
      
      toast.dismiss();
      toast.error("Failed to analyze receipt");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="bg-primary text-primary-foreground p-3 flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">
            {expense ? "Edit Expense" : "Add New Expense"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            {/* Essential Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="amount" className="text-xs font-medium">Amount (PKR)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-1 h-9"
                />
                {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
              </div>
              
              <div>
                <Label htmlFor="date" className="text-xs font-medium">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 h-9"
                />
                {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
              </div>
            </div>
            
            <div>
              <Label htmlFor="description" className="text-xs font-medium">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you spend on?"
                className="mt-1 h-9"
              />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
            </div>
            
            <div>
              <Label htmlFor="category" className="text-xs font-medium">Category</Label>
              <div className="flex gap-2 mt-1">
                <Select 
                  value={category} 
                  onValueChange={(value: string) => setCategory(value as ExpenseCategory)}
                >
                  <SelectTrigger className="flex-1 h-9">
                    <SelectValue placeholder="Select category" />
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
                  size="sm" 
                  className="shrink-0 h-9 w-9"
                  onClick={() => setCategoryDialogOpen(true)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
            </div>
            
            {/* Optional Fields - Compact Layout */}
            <div className="space-y-2">
              <div>
                <Label htmlFor="location" className="text-xs font-medium">Location (optional)</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter location"
                  className="mt-1 h-9"
                  maxLength={100}
                />
                {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
              </div>
              
              <div>
                <Label htmlFor="tags" className="text-xs font-medium">Tags</Label>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 mb-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs h-6 flex items-center gap-1">
                        {tag}
                        <button 
                          type="button" 
                          onClick={() => handleRemoveTag(tag)}
                          className="rounded-full hover:bg-muted"
                        >
                          <X className="h-2 w-2" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Add tags (press Enter)"
                    className="flex-1 h-9"
                    maxLength={20}
                    disabled={tags.length >= 10}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-9 w-9"
                    onClick={handleAddTag}
                    disabled={tags.length >= 10}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                {errors.tags && <p className="text-xs text-red-500 mt-1">{errors.tags}</p>}
              </div>
              
              <div className="border border-dashed rounded-md p-3">
                <Label htmlFor="receipt" className="text-xs font-medium mb-2 block">Receipt (optional)</Label>
                {receiptImage ? (
                  <div className="relative">
                    <Image 
                      src={receiptImage} 
                      alt="Receipt" 
                      className="max-h-24 object-contain mx-auto rounded" 
                      width={200}
                      height={100}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1 w-full h-7 text-xs"
                      onClick={() => setReceiptImage(null)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div>
                    <label 
                      htmlFor="receipt-upload" 
                      className="flex items-center justify-center py-2 border border-dashed rounded cursor-pointer hover:bg-muted/50"
                    >
                      <Upload className="h-4 w-4 text-muted-foreground mr-2" />
                      <span className="text-xs text-muted-foreground">Upload receipt</span>
                      <input
                        id="receipt-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleReceiptUpload}
                        disabled={isAnalyzing}
                      />
                    </label>
                  </div>
                )}
                
                {isAnalyzing && (
                  <div className="flex items-center gap-2 text-xs mt-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Analyzing...</span>
                  </div>
                )}
              </div>
            </div>
            
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : submitButtonText}
            </Button>
          </form>
        </div>
        
        <CategoryDialog 
          open={categoryDialogOpen}
          onOpenChange={setCategoryDialogOpen}
          onCategoriesUpdate={handleCategoriesUpdate}
        />
      </DialogContent>
    </Dialog>
  );
} 