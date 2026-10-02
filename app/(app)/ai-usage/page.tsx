"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Bot, Coins, Cpu, Loader2, ScanLine, Sparkles } from "lucide-react";
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";
import { useAuth } from "@/lib/auth/AuthContext";
import { useExpensesQuery } from "@/lib/queries/expenses";
import { listAiUsage } from "@/lib/aiUsage";
import { enrichExpenses } from "@/lib/enrichment";
import {
  AI_FEATURE_LABELS,
  AiFeature,
  UsageBreakdown,
  formatUsd,
  summarizeAiUsage,
} from "@/lib/utils/aiUsageSummary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";

// Merchant detection costs roughly this much per expense (a batch of 25 is ~$0.001)
const EST_ENRICH_COST_PER_EXPENSE = 0.00004;

function DailyTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { day: string; costUsd: number; calls: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-popover shadow-lift rounded-2xl border px-3 py-2">
      <p className="text-muted-foreground text-xs font-medium">
        {format(parseISO(d.day), "EEE, d MMM")}
      </p>
      <p className="text-sm font-bold tabular-nums">{formatUsd(d.costUsd)}</p>
      <p className="text-muted-foreground text-xs">
        {d.calls} call{d.calls === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function BreakdownTable({
  rows,
  label,
  countLabel,
}: {
  rows: UsageBreakdown[];
  label: (key: string) => string;
  countLabel: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left text-xs">
            <th className="py-2 pr-3 font-medium">Name</th>
            <th className="py-2 pr-3 text-right font-medium">Calls</th>
            <th className="py-2 pr-3 text-right font-medium">{countLabel}</th>
            <th className="py-2 pr-3 text-right font-medium">Tokens</th>
            <th className="py-2 text-right font-medium">Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b last:border-0">
              <td className="max-w-[14rem] truncate py-2 pr-3">{label(r.key)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{r.calls}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{r.count}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{r.tokens.toLocaleString()}</td>
              <td className="py-2 text-right font-medium tabular-nums">{formatUsd(r.costUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AiUsagePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const usageQuery = useQuery({
    queryKey: ["aiUsage", user?.uid],
    queryFn: () => listAiUsage(user!.uid),
    enabled: !!user,
  });
  const expensesQuery = useExpensesQuery(user?.uid);

  const summary = useMemo(() => summarizeAiUsage(usageQuery.data ?? []), [usageQuery.data]);
  const scans = summary.byFeature.find((b) => b.key === "receipt_scan");

  const unenriched = useMemo(
    () => (expensesQuery.data ?? []).filter((e) => !e.enrichedAt),
    [expensesQuery.data],
  );
  const [backfill, setBackfill] = useState<{ done: number; total: number } | null>(null);
  const [backfillError, setBackfillError] = useState<string | null>(null);

  const runBackfill = async () => {
    if (!user || unenriched.length === 0) return;
    setBackfillError(null);
    setBackfill({ done: 0, total: unenriched.length });
    const knownMerchants = [
      ...new Set((expensesQuery.data ?? []).map((e) => e.merchant).filter(Boolean)),
    ] as string[];
    try {
      await enrichExpenses(user.uid, unenriched, knownMerchants, (done) =>
        setBackfill({ done, total: unenriched.length }),
      );
    } catch (err) {
      setBackfillError(err instanceof Error ? err.message : "Enrichment failed");
    } finally {
      setBackfill(null);
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["aiUsage"] });
    }
  };

  const loading = usageQuery.isLoading;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-4 lg:px-8 lg:py-2">
      <p className="text-muted-foreground text-sm">
        What the app&apos;s AI features have cost you: receipt scanning and automatic merchant/brand
        detection. Costs are what the AI provider (OpenRouter) charged, in USD.
      </p>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard
            label="Total AI cost"
            icon={Coins}
            value={formatUsd(summary.totalCost)}
            hint={<span>{summary.totalCalls} calls · all time</span>}
          />
          <StatCard
            label="This month"
            icon={Sparkles}
            value={formatUsd(summary.thisMonthCost)}
            hint={<span>Last month {formatUsd(summary.lastMonthCost)}</span>}
          />
          <StatCard
            label="Per receipt scan"
            icon={ScanLine}
            value={scans?.calls ? formatUsd(scans.costUsd / scans.calls) : "—"}
            hint={<span>{scans?.calls ?? 0} scans · average</span>}
          />
          <StatCard
            label="Tokens used"
            icon={Cpu}
            value={summary.totalTokens.toLocaleString()}
            hint={<span>input + output</span>}
          />
        </div>
      )}

      {summary.unknownCostCalls > 0 && (
        <p className="text-muted-foreground text-xs">
          {summary.unknownCostCalls} call{summary.unknownCostCalls === 1 ? "" : "s"} had no cost
          reported by the provider and {summary.unknownCostCalls === 1 ? "is" : "are"} counted as
          $0.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Daily AI cost</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.daily} margin={{ left: -8, right: 8 }}>
                <CartesianGrid
                  strokeDasharray="4 6"
                  vertical={false}
                  stroke="currentColor"
                  strokeOpacity={0.15}
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  tickFormatter={(d: string) => format(parseISO(d), "d MMM")}
                  minTickGap={24}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  tickFormatter={(v: number) => formatUsd(v)}
                  width={64}
                />
                <Tooltip content={<DailyTooltip />} cursor={{ fillOpacity: 0.06 }} />
                <Bar dataKey="costUsd" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By feature</CardTitle>
            <CardDescription>
              Items = photos scanned, or expenses checked for merchant/brand
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary.byFeature.length === 0 ? (
              <p className="text-muted-foreground text-sm">No AI calls recorded yet.</p>
            ) : (
              <BreakdownTable
                rows={summary.byFeature}
                label={(k) => AI_FEATURE_LABELS[k as AiFeature] ?? k}
                countLabel="Items"
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By model</CardTitle>
            <CardDescription>Which AI model handled the calls</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.byModel.length === 0 ? (
              <p className="text-muted-foreground text-sm">No AI calls recorded yet.</p>
            ) : (
              <BreakdownTable rows={summary.byModel} label={(k) => k} countLabel="Items" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Detect merchants for older expenses
          </CardTitle>
          <CardDescription>
            New expenses get their merchant and brand detected automatically. Expenses saved before
            this feature can be processed once here, so they link up with the rest.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            {unenriched.length} expense{unenriched.length === 1 ? "" : "s"} not processed yet
            {unenriched.length > 0 &&
              ` · estimated cost ${formatUsd(unenriched.length * EST_ENRICH_COST_PER_EXPENSE)}`}
          </p>
          <Button onClick={runBackfill} disabled={!!backfill || unenriched.length === 0}>
            {backfill ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {backfill.done} / {backfill.total} processed
              </>
            ) : (
              "Detect merchants"
            )}
          </Button>
          {backfillError && <p className="text-destructive text-sm">{backfillError}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent AI calls</CardTitle>
          <CardDescription>Every call, newest first</CardDescription>
        </CardHeader>
        <CardContent>
          {(usageQuery.data ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nothing yet — scan a receipt or add an expense.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs">
                    <th className="py-2 pr-3 font-medium">When</th>
                    <th className="py-2 pr-3 font-medium">Feature</th>
                    <th className="py-2 pr-3 font-medium">Model</th>
                    <th className="py-2 pr-3 text-right font-medium">Items</th>
                    <th className="py-2 pr-3 text-right font-medium">Tokens</th>
                    <th className="py-2 text-right font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {(usageQuery.data ?? []).slice(0, 100).map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {format(e.createdAt, "d MMM, HH:mm")}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {AI_FEATURE_LABELS[e.feature]}
                      </td>
                      <td className="text-muted-foreground max-w-[12rem] truncate py-2 pr-3">
                        {e.model}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{e.count}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {e.tokens.toLocaleString()}
                      </td>
                      <td className="py-2 text-right font-medium tabular-nums">
                        {e.costKnown ? formatUsd(e.costUsd) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
