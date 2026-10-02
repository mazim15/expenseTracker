"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Pencil, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryIcon } from "@/components/expenses/CategoryIcon";
import DeleteConfirmDialog from "@/components/expenses/DeleteConfirmDialog";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  useDeleteRecurringMutation,
  useRecurringQuery,
  useUpdateRecurringMutation,
} from "@/lib/queries/recurring";
import { RecurringRule } from "@/lib/recurring";
import { RECURRING_FREQUENCIES, RecurringFrequency } from "@/lib/utils/recurringSchedule";
import { formatCurrency, cn } from "@/lib/utils";

export default function RecurringDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const rulesQuery = useRecurringQuery(open ? user?.uid : undefined);
  const updateRule = useUpdateRecurringMutation(user?.uid);
  const deleteRule = useDeleteRecurringMutation(user?.uid);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const rules = rulesQuery.data ?? [];
  const monthlyTotal = rules
    .filter((r) => r.active)
    .reduce((sum, r) => sum + (r.frequency === "weekly" ? (r.amount * 52) / 12 : r.amount), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="text-primary h-5 w-5" />
            Recurring expenses
          </DialogTitle>
          <DialogDescription>
            Added automatically when they&apos;re due. To create one, add an expense and set
            &ldquo;Repeats&rdquo;.
          </DialogDescription>
        </DialogHeader>

        {rules.length > 0 && (
          <div className="bg-primary/8 flex items-center justify-between rounded-2xl px-4 py-3 text-sm">
            <span className="text-muted-foreground">Active, per month (approx.)</span>
            <span className="font-bold tabular-nums">{formatCurrency(monthlyTotal)}</span>
          </div>
        )}

        <div className="max-h-[55dvh] space-y-2 overflow-y-auto">
          {rulesQuery.isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : rules.length === 0 ? (
            <p className="text-muted-foreground rounded-2xl border border-dashed p-6 text-center text-sm">
              No recurring expenses yet. Rent, subscriptions and bills are good candidates.
            </p>
          ) : (
            rules.map((rule) =>
              editingId === rule.id ? (
                <RuleEditor
                  key={rule.id}
                  rule={rule}
                  saving={updateRule.isPending}
                  onCancel={() => setEditingId(null)}
                  onSave={async (patch) => {
                    await updateRule.mutateAsync({ id: rule.id, patch });
                    setEditingId(null);
                    toast.success("Recurring expense updated");
                  }}
                />
              ) : (
                <div
                  key={rule.id}
                  className={cn(
                    "bg-muted/40 flex items-center gap-3 rounded-2xl p-3",
                    !rule.active && "opacity-60",
                  )}
                >
                  <CategoryIcon category={rule.category} className="h-10 w-10 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{rule.description}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatCurrency(rule.amount)} · {rule.frequency} ·{" "}
                      {rule.active ? `next ${format(rule.nextDue, "d MMM")}` : "paused"}
                    </p>
                  </div>
                  <Switch
                    checked={rule.active}
                    onCheckedChange={(active) =>
                      updateRule.mutate({ id: rule.id, patch: { active } })
                    }
                    aria-label={rule.active ? "Pause" : "Resume"}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingId(rule.id)}
                    aria-label={`Edit ${rule.description}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-destructive/10 hover:text-destructive h-8 w-8"
                    onClick={() => setDeletingId(rule.id)}
                    aria-label={`Delete ${rule.description}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ),
            )
          )}
        </div>

        <DeleteConfirmDialog
          open={!!deletingId}
          onOpenChange={() => setDeletingId(null)}
          onConfirm={async () => {
            if (!deletingId) return;
            await deleteRule.mutateAsync(deletingId);
            setDeletingId(null);
            toast.success("Recurring expense removed");
          }}
          title="Stop this recurring expense?"
          description="It won't be added any more. Expenses already created stay in your history."
        />
      </DialogContent>
    </Dialog>
  );
}

function RuleEditor({
  rule,
  saving,
  onSave,
  onCancel,
}: {
  rule: RecurringRule;
  saving: boolean;
  onSave: (patch: {
    amount: number;
    description: string;
    frequency: RecurringFrequency;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(String(rule.amount));
  const [description, setDescription] = useState(rule.description);
  const [frequency, setFrequency] = useState<RecurringFrequency>(rule.frequency);
  const value = Number(amount);
  const valid = value > 0 && value <= 1_000_000 && description.trim().length > 0;

  return (
    <div className="border-primary/30 space-y-2 rounded-2xl border p-3">
      <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
      <div className="flex gap-2">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1"
        />
        <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurringFrequency)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECURRING_FREQUENCIES.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={!valid || saving}
          onClick={() => onSave({ amount: value, description: description.trim(), frequency })}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
