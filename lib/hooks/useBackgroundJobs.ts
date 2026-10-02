"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthContext";
import { runRecurring } from "@/lib/recurring";
import { syncAlerts } from "@/lib/alerts";
import { listExpenses } from "@/lib/services/expenses.service";
import { expensesKeys } from "@/lib/queries/expenses";
import { formatCurrency } from "@/lib/utils";

const SESSION_KEY = "backgroundJobsRan";

/** Read straight from storage: SettingsContext only fills in after mount. */
function notificationsEnabled(): boolean {
  try {
    return JSON.parse(localStorage.getItem("userSettings") ?? "{}").notifications !== false;
  } catch {
    return true;
  }
}

/**
 * Work the app does on its own once per browser session after sign-in:
 * add due recurring expenses, then raise spending alerts.
 * (There is no server cron — this runs in the signed-in browser.)
 */
export function useBackgroundJobs() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) return;
    const key = `${SESSION_KEY}:${uid}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage unavailable: jobs are idempotent, so running again is safe
    }

    let cancelled = false;
    (async () => {
      const added = await runRecurring(uid);
      if (cancelled) return;
      if (added.length > 0) {
        const total = added.reduce((s, e) => s + e.amount, 0);
        toast.success(
          added.length === 1
            ? `Added recurring "${added[0].description}" (${formatCurrency(total)})`
            : `Added ${added.length} recurring expenses (${formatCurrency(total)})`,
        );
        await qc.invalidateQueries({ queryKey: ["expenses", uid] });
      }
      if (!notificationsEnabled()) return;
      try {
        const expenses = await qc.fetchQuery({
          queryKey: expensesKeys.all(uid),
          queryFn: () => listExpenses(uid),
        });
        if (!cancelled) await syncAlerts(uid, expenses, added.length);
      } catch (error) {
        console.error("Failed to sync alerts:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, qc]);
}
