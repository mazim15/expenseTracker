"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useForm, Controller } from "react-hook-form";
import { format } from "date-fns";
import { Loader2, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpenseType, EXPENSE_CATEGORIES, ExpenseCategoryType } from "@/types/expense";
import { expenseFormSchema } from "@/lib/validations/expense";
import CategoryDialog from "./CategoryDialog";
import { analyzeReceipt, fileToBase64 } from "@/lib/utils/receiptAnalysis";
import { useAuth } from "@/lib/auth/AuthContext";
import { getUserCategories } from "@/lib/categories";
import { useLogger } from "@/lib/hooks/useLogger";

type ExpenseDialogProps = {
  expense?: ExpenseType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (expense: ExpenseType) => void;
};

type FormValues = {
  amount: number | "";
  date: string;
  category: string;
  description: string;
  location: string;
  tags: string[];
};

function defaultValues(expense?: ExpenseType): FormValues {
  return {
    amount: expense ? expense.amount : "",
    date: expense ? format(expense.date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    category: expense?.category ?? "food",
    description: expense?.description ?? "",
    location: expense?.location ?? "",
    tags: expense?.tags ?? [],
  };
}

export default function ExpenseDialog({ expense, open, onOpenChange, onSave }: ExpenseDialogProps) {
  const { user } = useAuth();
  const { logAction, logError } = useLogger();

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [localCategories, setLocalCategories] = useState(EXPENSE_CATEGORIES);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const form = useForm<FormValues>({
    defaultValues: defaultValues(expense),
    mode: "onBlur",
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues(expense));
      setReceiptImage(null);
      setTagInput("");
    }
  }, [open, expense, form]);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    (async () => {
      try {
        const userCategories = await getUserCategories(user.uid);
        if (cancelled) return;
        if (userCategories && userCategories.length > 0) {
          setLocalCategories(userCategories);
          localStorage.setItem("expense-categories", JSON.stringify(userCategories));
          return;
        }
        const cached = localStorage.getItem("expense-categories");
        if (cached) setLocalCategories(JSON.parse(cached));
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const tags = form.watch("tags");

  const addTag = () => {
    const next = tagInput.trim();
    if (!next) return;
    if (next.length > 30) {
      toast.error("Tag must be 30 characters or less");
      return;
    }
    if (tags.includes(next)) {
      toast.error("Tag already exists");
      return;
    }
    if (tags.length >= 10) {
      toast.error("Maximum 10 tags");
      return;
    }
    form.setValue("tags", [...tags, next], { shouldDirty: true });
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    form.setValue(
      "tags",
      tags.filter((t) => t !== tag),
      { shouldDirty: true },
    );
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await logAction("receipt_upload_started", {
        fileName: file.name,
        fileSize: file.size,
      });
      const base64 = await fileToBase64(file);
      setReceiptImage(base64);
      setIsAnalyzing(true);
      toast.loading("Analyzing receipt...");
      const extracted = await analyzeReceipt(base64);
      if (extracted && extracted.length > 0) {
        const first = extracted[0];
        if (first.amount) form.setValue("amount", first.amount);
        if (first.date) form.setValue("date", format(first.date, "yyyy-MM-dd"));
        if (first.category) form.setValue("category", first.category);
        if (first.description) form.setValue("description", first.description);
      }
      toast.dismiss();
      toast.success("Receipt analyzed");
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to analyze receipt");
      await logError(err as Error, "receipt_analysis_failed", { fileName: file.name });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const parsed = expenseFormSchema.safeParse({
      amount: typeof values.amount === "string" ? Number(values.amount) : values.amount,
      date: new Date(values.date),
      category: values.category,
      description: values.description,
      location: values.location,
      tags: values.tags,
    });

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (typeof field === "string") {
          form.setError(field as keyof FormValues, { message: issue.message });
        }
      });
      return;
    }

    const payload: ExpenseType = {
      id: expense?.id || crypto.randomUUID(),
      userId: expense?.userId || user?.uid || "",
      amount: parsed.data.amount,
      date: parsed.data.date,
      category: parsed.data.category,
      description: parsed.data.description,
      location: parsed.data.location || "",
      tags: parsed.data.tags,
      createdAt: expense?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };

    try {
      await onSave(payload);
      await logAction(expense ? "expense_updated" : "expense_created", {
        expenseId: payload.id,
        amount: payload.amount,
        category: payload.category,
        tagCount: payload.tags?.length ?? 0,
      });
      onOpenChange(false);
    } catch (err) {
      await logError(err as Error, "expense_save_failed", {
        expenseId: payload.id,
        isEdit: Boolean(expense),
      });
      toast.error("Failed to save expense");
    }
  });

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col overflow-hidden p-0">
        <DialogHeader className="bg-primary text-primary-foreground flex-shrink-0 p-3">
          <DialogTitle className="text-lg font-semibold">
            {expense ? "Edit Expense" : "Add New Expense"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Amount (PKR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="h-9"
                          value={field.value === "" ? "" : field.value}
                          onChange={(e) => {
                            const v = e.target.value;
                            field.onChange(v === "" ? "" : Number(v));
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Date</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-9" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Description</FormLabel>
                    <FormControl>
                      <Input placeholder="What did you spend on?" className="h-9" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Category</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-9 flex-1">
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
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 shrink-0"
                        onClick={() => setCategoryDialogOpen(true)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Location (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter location"
                        className="h-9"
                        maxLength={200}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Controller
                control={form.control}
                name="tags"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-xs">Tags</FormLabel>
                    {tags.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="flex h-6 items-center gap-1 text-xs"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="hover:bg-muted rounded-full"
                              aria-label={`Remove tag ${tag}`}
                            >
                              <X className="h-2 w-2" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        placeholder="Add tags (press Enter)"
                        className="h-9 flex-1"
                        maxLength={30}
                        disabled={tags.length >= 10}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 w-9"
                        onClick={addTag}
                        disabled={tags.length >= 10}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-md border border-dashed p-3">
                <span className="mb-2 block text-xs font-medium">Receipt (optional)</span>
                {receiptImage ? (
                  <div className="relative">
                    <Image
                      src={receiptImage}
                      alt="Receipt"
                      className="mx-auto max-h-24 rounded object-contain"
                      width={200}
                      height={100}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1 h-7 w-full text-xs"
                      onClick={() => setReceiptImage(null)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="receipt-upload"
                    className="hover:bg-muted/50 flex cursor-pointer items-center justify-center rounded border border-dashed py-2"
                  >
                    <Upload className="text-muted-foreground mr-2 h-4 w-4" />
                    <span className="text-muted-foreground text-xs">Upload receipt</span>
                    <input
                      id="receipt-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleReceiptUpload}
                      disabled={isAnalyzing}
                    />
                  </label>
                )}
                {isAnalyzing && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Analyzing...</span>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 w-full disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : expense ? "Save Changes" : "Add Expense"}
              </Button>
            </form>
          </Form>
        </div>

        <CategoryDialog
          open={categoryDialogOpen}
          onOpenChange={setCategoryDialogOpen}
          onCategoriesUpdate={setLocalCategories}
        />
      </DialogContent>
    </Dialog>
  );
}
