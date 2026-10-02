"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useForm, Controller } from "react-hook-form";
import { format } from "date-fns";
import { AlertTriangle, Loader2, Plus, Repeat, ScanLine, X } from "lucide-react";
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
import {
  ExpenseType,
  EXPENSE_CATEGORIES,
  ExpenseCategoryType,
  PAYMENT_METHODS,
  PaymentMethod,
  isPaymentMethod,
} from "@/types/expense";
import { expenseFormSchema } from "@/lib/validations/expense";
import CategoryDialog from "./CategoryDialog";
import ScanReceiptDialog, { ScanReceiptResult } from "./ScanReceiptDialog";
import { analyzeReceipt, formatScanCost, type ScanUsage } from "@/lib/utils/receiptAnalysis";
import { useAuth } from "@/lib/auth/AuthContext";
import { getUserCategories } from "@/lib/categories";
import { useLogger } from "@/lib/hooks/useLogger";
import { useExpensesQuery } from "@/lib/queries/expenses";
import { getExpenseGroup, findRelatedExpenses, getLocationArea } from "@/lib/utils/expenseGrouping";
import { cn, formatCurrency } from "@/lib/utils";
import { findLikelyDuplicate } from "@/lib/utils/duplicates";
import { knownMerchantNames } from "@/lib/utils/enrichment";
import { RECURRING_FREQUENCIES, RecurringFrequency } from "@/lib/utils/recurringSchedule";
import { useCreateRecurringMutation } from "@/lib/queries/recurring";
import { runRecurring } from "@/lib/recurring";
import { deleteReceipt, uploadReceipt } from "@/lib/receipts";

type ExpenseDialogProps = {
  expense?: ExpenseType;
  /** Prefills a new expense (e.g. "Duplicate"). Ignored when `expense` is set. */
  initialValues?: Partial<ExpenseType>;
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
  merchant: string;
  tags: string[];
  paymentMethod: PaymentMethod | "";
};

/** What a receipt scanned inside this dialog adds beyond the visible form fields. */
type ScanDetails = Pick<ExpenseType, "items" | "receiptTotals" | "brands" | "enrichedAt">;

const LAST_PAYMENT_KEY = "lastPaymentMethod";

function lastPaymentMethod(): PaymentMethod | "" {
  if (typeof window === "undefined") return "";
  try {
    const v = localStorage.getItem(LAST_PAYMENT_KEY);
    return isPaymentMethod(v) ? v : "";
  } catch {
    return "";
  }
}

function defaultValues(expense?: ExpenseType, initial?: Partial<ExpenseType>): FormValues {
  const src = expense ?? initial;
  return {
    amount: src?.amount ?? "",
    date: expense ? format(expense.date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    category: src?.category ?? "food",
    description: src?.description ?? "",
    location: src?.location ?? "",
    merchant: src?.merchant ?? "",
    tags: src?.tags ?? [],
    paymentMethod: expense
      ? (expense.paymentMethod ?? "")
      : (src?.paymentMethod ?? lastPaymentMethod()),
  };
}

export default function ExpenseDialog({
  expense,
  initialValues,
  open,
  onOpenChange,
  onSave,
}: ExpenseDialogProps) {
  const { user } = useAuth();
  const { logAction, logError } = useLogger();
  const expensesQuery = useExpensesQuery(user?.uid);

  const knownTags = useMemo(() => {
    const counts = new Map<string, { display: string; count: number }>();
    for (const exp of expensesQuery.data ?? []) {
      for (const tag of exp.tags ?? []) {
        const key = tag.trim().toLowerCase();
        if (!key) continue;
        const existing = counts.get(key);
        if (existing) existing.count += 1;
        else counts.set(key, { display: tag.trim(), count: 1 });
      }
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .map((t) => t.display);
  }, [expensesQuery.data]);

  const purchaseHistory = useMemo(() => {
    if (!expense) return null;
    const related = findRelatedExpenses(expense, expensesQuery.data ?? []);
    if (related.length < 2) return null;
    return {
      group: getExpenseGroup(expense),
      items: related,
      total: related.reduce((sum, e) => sum + e.amount, 0),
    };
  }, [expense, expensesQuery.data]);

  // Other expenses saved from the same receipt scan
  const sameReceipt = useMemo(() => {
    if (!expense?.receiptId) return [];
    return (expensesQuery.data ?? []).filter(
      (e) => e.receiptId === expense.receiptId && e.id !== expense.id,
    );
  }, [expense, expensesQuery.data]);

  // How many of the user's expenses include each brand, so a brand links across receipts
  const brandCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of expensesQuery.data ?? []) {
      for (const b of new Set((e.brands ?? []).map((x) => x.toLowerCase()))) {
        counts.set(b, (counts.get(b) ?? 0) + 1);
      }
    }
    return counts;
  }, [expensesQuery.data]);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [localCategories, setLocalCategories] = useState(EXPENSE_CATEGORIES);
  const [receiptImages, setReceiptImages] = useState<string[]>([]);
  const [scanDetails, setScanDetails] = useState<ScanDetails | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [repeat, setRepeat] = useState<RecurringFrequency | "never">("never");
  const [duplicateOf, setDuplicateOf] = useState<ExpenseType | null>(null);
  // A ref, not state: "Save anyway" re-submits immediately and must see the new value.
  const allowDuplicate = useRef(false);
  const createRecurring = useCreateRecurringMutation(user?.uid);

  const form = useForm<FormValues>({
    defaultValues: defaultValues(expense, initialValues),
    mode: "onBlur",
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues(expense, initialValues));
      setReceiptImages([]);
      setScanDetails(null);
      setTagInput("");
      setRepeat("never");
      setDuplicateOf(null);
      allowDuplicate.current = false;
    }
  }, [open, expense, initialValues, form]);

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

  const addTag = (tagValue?: string) => {
    const next = (tagValue ?? tagInput).trim();
    if (!next) return;
    if (next.length > 30) {
      toast.error("Tag must be 30 characters or less");
      return;
    }
    if (tags.some((t) => t.toLowerCase() === next.toLowerCase())) {
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

  const tagSuggestions = useMemo(() => {
    const query = tagInput.trim().toLowerCase();
    const selected = new Set(tags.map((t) => t.toLowerCase()));
    return knownTags
      .filter((tag) => !selected.has(tag.toLowerCase()))
      .filter((tag) => (query ? tag.toLowerCase().includes(query) : true))
      .slice(0, 8);
  }, [knownTags, tagInput, tags]);

  const removeTag = (tag: string) => {
    form.setValue(
      "tags",
      tags.filter((t) => t !== tag),
      { shouldDirty: true },
    );
  };

  const handleScanAnalyze = async ({ images }: ScanReceiptResult) => {
    const mimeTypes = images.map((i) => i.mimeType).join(",");
    try {
      await logAction("receipt_analysis_started", {
        imageCount: images.length,
        mimeTypes,
      });
      setReceiptImages(images.map((i) => i.dataUrl));
      setIsAnalyzing(true);
      toast.loading("Analyzing receipt...");
      let scanCost: ScanUsage | null = null;
      const extracted = await analyzeReceipt(images, {
        knownTags,
        knownMerchants: knownMerchantNames(expensesQuery.data ?? []),
        onUsage: (u) => (scanCost = u),
      });
      if (extracted.amount) form.setValue("amount", extracted.amount);
      if (extracted.date) form.setValue("date", format(extracted.date, "yyyy-MM-dd"));
      if (extracted.category) form.setValue("category", extracted.category);
      if (extracted.description) form.setValue("description", extracted.description);
      if (extracted.location) form.setValue("location", extracted.location);
      form.setValue("merchant", extracted.merchant ?? "");
      setScanDetails({
        items: extracted.items,
        receiptTotals: extracted.receiptTotals,
        brands: extracted.brands,
        enrichedAt: extracted.enrichedAt,
      });
      if (extracted.tags && extracted.tags.length > 0) {
        const existing = form.getValues("tags");
        const merged: string[] = [...existing];
        const seen = new Set(existing.map((t) => t.toLowerCase()));
        for (const tag of extracted.tags) {
          const key = tag.toLowerCase();
          if (seen.has(key)) continue;
          if (merged.length >= 10) break;
          merged.push(tag);
          seen.add(key);
        }
        form.setValue("tags", merged, { shouldDirty: true });
      }
      toast.dismiss();
      toast.success("Receipt analyzed", {
        description: scanCost
          ? `Scan cost ${formatScanCost((scanCost as ScanUsage).costUsd)}`
          : undefined,
      });
      setScanDialogOpen(false);
      if (!extracted.location) {
        toast.info("No location detected — add it manually if you'd like.");
      }
    } catch (err) {
      toast.dismiss();
      toast.error(err instanceof Error ? err.message : "Failed to analyze receipt");
      await logError(err as Error, "receipt_analysis_failed", {
        imageCount: images.length,
        mimeTypes,
      });
      setReceiptImages([]);
      setScanDetails(null);
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
      merchant: values.merchant.trim(),
      tags: values.tags,
      paymentMethod: values.paymentMethod || undefined,
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

    // Warn once about a likely duplicate when adding; "Save anyway" sets allowDuplicate.
    if (!expense && !allowDuplicate.current) {
      const dup = findLikelyDuplicate(parsed.data, expensesQuery.data ?? []);
      if (dup) {
        setDuplicateOf(dup);
        return;
      }
    }

    let receiptPath = expense?.receiptPath;
    if (receiptImages.length > 0 && user?.uid) {
      try {
        receiptPath = await uploadReceipt(receiptImages[0]);
        // Replacing a receipt on edit: drop the old photo
        if (expense?.receiptPath) void deleteReceipt(expense.receiptPath);
      } catch (err) {
        console.error("Receipt upload failed:", err);
        toast.warning("Expense saved, but the receipt photo couldn't be kept.");
      }
    }

    const payload: ExpenseType = {
      id: expense?.id || crypto.randomUUID(),
      userId: expense?.userId || user?.uid || "",
      amount: parsed.data.amount,
      date: parsed.data.date,
      category: parsed.data.category,
      description: parsed.data.description,
      location: parsed.data.location || "",
      // Empty on edit clears it (and lets AI detect it again); omitted on add
      ...((expense || parsed.data.merchant) && { merchant: parsed.data.merchant || "" }),
      tags: parsed.data.tags,
      ...(parsed.data.paymentMethod && { paymentMethod: parsed.data.paymentMethod }),
      ...(receiptPath && { receiptPath }),
      ...(expense?.recurringId && { recurringId: expense.recurringId }),
      // Only when a receipt was scanned in this dialog (and still attached)
      ...(receiptImages.length > 0 && scanDetails),
      createdAt: expense?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };

    try {
      await onSave(payload);
      if (payload.paymentMethod) {
        try {
          localStorage.setItem(LAST_PAYMENT_KEY, payload.paymentMethod);
        } catch {
          // storage unavailable — default just won't be remembered
        }
      }
      if (!expense && repeat !== "never" && user?.uid) {
        await createRecurring.mutateAsync({
          rule: {
            amount: payload.amount,
            category: payload.category,
            description: payload.description,
            tags: payload.tags,
            location: payload.location || undefined,
            paymentMethod: payload.paymentMethod,
            frequency: repeat,
            startDate: payload.date,
            active: true,
          },
          firstAlreadySaved: true,
        });
        // A back-dated start may already have missed occurrences — fill them in now.
        const added = await runRecurring(user.uid);
        if (added.length > 0) toast.info(`Added ${added.length} earlier repeat(s) of this expense`);
        toast.success(`Repeats ${repeat}`);
      }
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
        <DialogHeader className="bg-hero flex-shrink-0 px-5 py-4">
          <DialogTitle className="text-lg font-bold">
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
                          className="h-10"
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
                        <Input type="date" className="h-10" {...field} />
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
                      <Input placeholder="What did you spend on?" className="h-10" {...field} />
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
                          <SelectTrigger className="h-10 flex-1">
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
                        className="h-10 w-10 shrink-0"
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
                        className="h-10"
                        maxLength={200}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="merchant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Merchant (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Store or app, e.g. Krave Mart — detected automatically if empty"
                        className="h-10"
                        maxLength={100}
                        list="known-merchants"
                        {...field}
                      />
                    </FormControl>
                    <datalist id="known-merchants">
                      {knownMerchantNames(expensesQuery.data ?? []).map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Paid with</FormLabel>
                    <div
                      className="bg-muted/60 grid grid-cols-4 gap-1 rounded-xl p-1"
                      role="radiogroup"
                    >
                      {PAYMENT_METHODS.map((m) => {
                        const active = field.value === m.value;
                        return (
                          <button
                            key={m.value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => field.onChange(active ? "" : m.value)}
                            className={cn(
                              "rounded-lg px-1 py-1.5 text-xs font-semibold transition-colors",
                              active
                                ? "bg-card text-foreground shadow-soft"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {m.value === "bank" ? "Bank" : m.label}
                          </button>
                        );
                      })}
                    </div>
                  </FormItem>
                )}
              />

              {!expense && (
                <div className="space-y-2">
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    <Repeat className="h-3.5 w-3.5" />
                    Repeats
                  </span>
                  <Select
                    value={repeat}
                    onValueChange={(v) => setRepeat(v as RecurringFrequency | "never")}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      {RECURRING_FREQUENCIES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label} — added automatically
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

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
                        className="h-10 flex-1"
                        maxLength={30}
                        disabled={tags.length >= 10}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 w-10"
                        onClick={() => addTag()}
                        disabled={tags.length >= 10}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    {tagSuggestions.length > 0 && tags.length < 10 && (
                      <div className="mt-2">
                        <p className="text-muted-foreground mb-1 text-[10px] tracking-wide uppercase">
                          Suggestions
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {tagSuggestions.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => addTag(tag)}
                              className="border-border bg-muted/50 hover:bg-muted inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs"
                            >
                              <Plus className="h-2.5 w-2.5" />
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border-primary/30 bg-primary/5 rounded-2xl border-2 border-dashed p-4">
                <span className="mb-2 block text-xs font-medium">Receipt (optional)</span>
                {receiptImages.length > 0 ? (
                  <div className="space-y-1">
                    <div className="flex flex-wrap justify-center gap-1">
                      {receiptImages.map((src, idx) => (
                        <Image
                          key={idx}
                          src={src}
                          alt={`Receipt ${idx + 1}`}
                          className="max-h-24 rounded object-contain"
                          width={120}
                          height={96}
                        />
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1 h-7 w-full text-xs"
                      onClick={() => {
                        setReceiptImages([]);
                        setScanDetails(null);
                      }}
                      disabled={isAnalyzing}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 w-full"
                    onClick={() => setScanDialogOpen(true)}
                    disabled={isAnalyzing}
                  >
                    <ScanLine className="mr-2 h-4 w-4" />
                    Scan receipt
                  </Button>
                )}
                {isAnalyzing && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Analyzing...</span>
                  </div>
                )}
              </div>

              {expense && (expense.merchant || expense.brands?.length || expense.items?.length) ? (
                <div className="bg-muted/50 space-y-2 rounded-2xl p-3">
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {expense.merchant && (
                      <span className="bg-background rounded-full border px-2 py-0.5">
                        Merchant: <span className="font-medium">{expense.merchant}</span>
                      </span>
                    )}
                    {expense.brands?.map((brand) => {
                      const count = brandCounts.get(brand.toLowerCase()) ?? 0;
                      return (
                        <span
                          key={brand}
                          className="bg-background rounded-full border px-2 py-0.5"
                          title={`${count} of your expenses include ${brand}`}
                        >
                          <span className="font-medium">{brand}</span>
                          {count > 1 && <span className="text-muted-foreground"> · {count}×</span>}
                        </span>
                      );
                    })}
                  </div>
                  {!!expense.items?.length && (
                    <>
                      <ul className="space-y-1">
                        {expense.items.map((item, i) => (
                          <li
                            key={i}
                            className="text-muted-foreground flex items-baseline justify-between gap-2 text-xs"
                          >
                            <span className="truncate">
                              {item.quantity > 1 ? `${item.quantity} × ` : ""}
                              {item.name}
                              {item.brand && (
                                <span className="text-muted-foreground/70"> · {item.brand}</span>
                              )}
                            </span>
                            <span className="tabular-nums">{formatCurrency(item.price)}</span>
                          </li>
                        ))}
                      </ul>
                      {expense.receiptTotals && (
                        <div className="text-muted-foreground space-y-0.5 border-t pt-1.5 text-xs">
                          {expense.receiptTotals.subtotal > 0 && (
                            <p className="flex justify-between">
                              <span>Subtotal</span>
                              <span className="tabular-nums">
                                {formatCurrency(expense.receiptTotals.subtotal)}
                              </span>
                            </p>
                          )}
                          {expense.receiptTotals.discount > 0 && (
                            <p className="flex justify-between">
                              <span>Discount</span>
                              <span className="tabular-nums">
                                −{formatCurrency(expense.receiptTotals.discount)}
                              </span>
                            </p>
                          )}
                          {expense.receiptTotals.fees > 0 && (
                            <p className="flex justify-between">
                              <span>Tax &amp; fees</span>
                              <span className="tabular-nums">
                                {formatCurrency(expense.receiptTotals.fees)}
                              </span>
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : null}

              {sameReceipt.length > 0 && (
                <div className="bg-muted/50 rounded-2xl p-3">
                  <p className="text-xs font-medium">From the same receipt</p>
                  <ul className="mt-2 space-y-1">
                    {sameReceipt.map((e) => (
                      <li
                        key={e.id}
                        className="text-muted-foreground flex items-baseline justify-between gap-2 text-xs"
                      >
                        <span className="truncate">{e.description}</span>
                        <span className="tabular-nums">{formatCurrency(e.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {purchaseHistory && (
                <div className="bg-muted/50 rounded-2xl p-3">
                  <p className="text-xs font-medium">
                    {purchaseHistory.group?.label} · {purchaseHistory.items.length} times ·{" "}
                    {formatCurrency(purchaseHistory.total)} total
                  </p>
                  <ul className="mt-2 space-y-1">
                    {purchaseHistory.items.slice(0, 8).map((e) => {
                      const area = getLocationArea(e.location);
                      return (
                        <li
                          key={e.id}
                          className="text-muted-foreground flex items-baseline justify-between gap-2 text-xs"
                        >
                          <span className="truncate">
                            {format(e.date, "MMM d, yyyy")}
                            {area ? ` · ${area}` : ""}
                            {e.description ? ` · ${e.description}` : ""}
                          </span>
                          <span className="tabular-nums">{formatCurrency(e.amount)}</span>
                        </li>
                      );
                    })}
                  </ul>
                  {purchaseHistory.items.length > 8 && (
                    <p className="text-muted-foreground mt-1 text-[10px]">
                      +{purchaseHistory.items.length - 8} more
                    </p>
                  )}
                </div>
              )}

              {duplicateOf && (
                <div
                  role="alert"
                  className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
                >
                  <p className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Looks like a duplicate
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    You already have &ldquo;{duplicateOf.description}&rdquo; for{" "}
                    {formatCurrency(duplicateOf.amount)} on {format(duplicateOf.date, "d MMM yyyy")}
                    .
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        allowDuplicate.current = true;
                        setDuplicateOf(null);
                        onSubmit();
                      }}
                    >
                      Save anyway
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onOpenChange(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <Button type="submit" disabled={isSubmitting} className="h-11 w-full">
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

        <ScanReceiptDialog
          open={scanDialogOpen}
          onOpenChange={setScanDialogOpen}
          onAnalyze={handleScanAnalyze}
          isAnalyzing={isAnalyzing}
        />
      </DialogContent>
    </Dialog>
  );
}
