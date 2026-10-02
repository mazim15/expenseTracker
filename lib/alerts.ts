import { doc, setDoc, Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { db } from "@/lib/firebase";
import { getNotifications } from "@/lib/notifications";
import { computeInsights } from "@/lib/insights";
import { previousRange, resolveRange } from "@/lib/dateRange";
import { ExpenseType } from "@/types/expense";
import { NotificationType } from "@/types/notification";

/** Fired on window when alerts were written, so the bell can refresh. */
export const NOTIFICATIONS_CHANGED = "notifications:changed";

interface Alert {
  key: string;
  title: string;
  message: string;
  type: NotificationType["type"];
  link?: string;
}

/**
 * Turns this month's warnings (+ a note about auto-added recurring expenses) into
 * notifications. Ids are `{uid}_{key}_{yyyyMM}`, and existing ids are skipped, so an
 * alert appears once per month and a read alert never comes back as unread.
 */
export async function syncAlerts(
  userId: string,
  expenses: ExpenseType[],
  recurringAdded: number,
  now: Date = new Date(),
): Promise<number> {
  const range = resolveRange("thisMonth", null, null, now);
  const alerts: Alert[] = computeInsights(expenses, range, previousRange(range), now)
    .filter((i) => i.tone === "warn")
    .map((i) => ({
      key: i.id.replace(/[^a-zA-Z0-9:_-]/g, "-"),
      title: i.title,
      message: i.body,
      type: "warning" as const,
      link: i.href,
    }));

  if (recurringAdded > 0) {
    alerts.push({
      key: `recurring-added-${format(now, "dd")}`,
      title: `${recurringAdded} recurring expense${recurringAdded === 1 ? "" : "s"} added`,
      message: "Your repeating bills were added automatically.",
      type: "info",
      link: "/expenses",
    });
  }
  if (alerts.length === 0) return 0;

  const month = format(now, "yyyyMM");
  const existing = new Set((await getNotifications(userId)).map((n) => n.id));
  let written = 0;
  for (const alert of alerts) {
    const id = `${userId}_${alert.key}_${month}`.slice(0, 1400);
    if (existing.has(id)) continue;
    await setDoc(doc(db, "notifications", id), {
      userId,
      title: alert.title,
      message: alert.message,
      type: alert.type,
      status: "unread",
      link: alert.link ?? null,
      createdAt: Timestamp.fromDate(now),
    });
    written++;
  }
  if (written > 0 && typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
  }
  return written;
}
