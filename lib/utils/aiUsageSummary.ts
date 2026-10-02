// Pure aggregation for the AI usage page.

export type AiFeature = "receipt_scan" | "enrichment";

export const AI_FEATURE_LABELS: Record<AiFeature, string> = {
  receipt_scan: "Receipt scans",
  enrichment: "Merchant/brand detection",
};

export interface AiUsageEntry {
  id: string;
  feature: AiFeature;
  model: string;
  costUsd: number;
  /** False when the provider didn't report a cost for this call. */
  costKnown: boolean;
  tokens: number;
  count: number;
  createdAt: Date;
}

export interface UsageBreakdown {
  key: string;
  calls: number;
  costUsd: number;
  tokens: number;
  count: number;
}

export interface AiUsageSummary {
  totalCost: number;
  totalCalls: number;
  totalTokens: number;
  thisMonthCost: number;
  lastMonthCost: number;
  /** Calls whose cost the provider didn't report (counted as $0). */
  unknownCostCalls: number;
  byFeature: UsageBreakdown[];
  byModel: UsageBreakdown[];
  /** Cost per day for the last `days` days, oldest first. */
  daily: { day: string; costUsd: number; calls: number }[];
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function breakdown(entries: AiUsageEntry[], keyOf: (e: AiUsageEntry) => string): UsageBreakdown[] {
  const map = new Map<string, UsageBreakdown>();
  for (const e of entries) {
    const key = keyOf(e);
    const b = map.get(key) ?? { key, calls: 0, costUsd: 0, tokens: 0, count: 0 };
    b.calls += 1;
    b.costUsd += e.costUsd;
    b.tokens += e.tokens;
    b.count += e.count;
    map.set(key, b);
  }
  return [...map.values()].sort((a, b) => b.costUsd - a.costUsd);
}

export function summarizeAiUsage(
  entries: AiUsageEntry[],
  now: Date = new Date(),
  days = 30,
): AiUsageSummary {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const daily = new Map<string, { day: string; costUsd: number; calls: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i));
    daily.set(key, { day: key, costUsd: 0, calls: 0 });
  }

  let totalCost = 0;
  let totalTokens = 0;
  let thisMonthCost = 0;
  let lastMonthCost = 0;
  let unknownCostCalls = 0;
  for (const e of entries) {
    totalCost += e.costUsd;
    totalTokens += e.tokens;
    if (!e.costKnown) unknownCostCalls += 1;
    if (e.createdAt >= monthStart) thisMonthCost += e.costUsd;
    else if (e.createdAt >= lastMonthStart) lastMonthCost += e.costUsd;
    const d = daily.get(dayKey(e.createdAt));
    if (d) {
      d.costUsd += e.costUsd;
      d.calls += 1;
    }
  }

  return {
    totalCost,
    totalCalls: entries.length,
    totalTokens,
    thisMonthCost,
    lastMonthCost,
    unknownCostCalls,
    byFeature: breakdown(entries, (e) => e.feature),
    byModel: breakdown(entries, (e) => e.model),
    daily: [...daily.values()],
  };
}

/** USD with enough precision for sub-cent AI costs. */
export function formatUsd(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}
