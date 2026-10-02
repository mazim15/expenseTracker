import { describe, it, expect } from "vitest";
import { AiUsageEntry, formatUsd, summarizeAiUsage } from "./aiUsageSummary";

function entry(partial: Partial<AiUsageEntry>): AiUsageEntry {
  return {
    id: crypto.randomUUID(),
    feature: "receipt_scan",
    model: "m1",
    costUsd: 0.002,
    costKnown: true,
    tokens: 1000,
    count: 1,
    createdAt: new Date(2026, 9, 2, 12),
    ...partial,
  };
}

const NOW = new Date(2026, 9, 2, 18);

describe("summarizeAiUsage", () => {
  it("totals cost, calls and tokens", () => {
    const s = summarizeAiUsage([entry({}), entry({ costUsd: 0.003, tokens: 500 })], NOW);
    expect(s.totalCost).toBeCloseTo(0.005);
    expect(s.totalCalls).toBe(2);
    expect(s.totalTokens).toBe(1500);
  });

  it("splits this month and last month", () => {
    const s = summarizeAiUsage(
      [
        entry({ costUsd: 0.01 }),
        entry({ costUsd: 0.02, createdAt: new Date(2026, 8, 15) }),
        entry({ costUsd: 0.04, createdAt: new Date(2026, 6, 1) }),
      ],
      NOW,
    );
    expect(s.thisMonthCost).toBeCloseTo(0.01);
    expect(s.lastMonthCost).toBeCloseTo(0.02);
    expect(s.totalCost).toBeCloseTo(0.07);
  });

  it("breaks down by feature and model, most expensive first", () => {
    const s = summarizeAiUsage(
      [
        entry({ feature: "enrichment", model: "m2", costUsd: 0.001, count: 25 }),
        entry({ feature: "receipt_scan", model: "m1", costUsd: 0.005, count: 2 }),
        entry({ feature: "receipt_scan", model: "m1", costUsd: 0.002, count: 1 }),
      ],
      NOW,
    );
    expect(s.byFeature.map((b) => b.key)).toEqual(["receipt_scan", "enrichment"]);
    expect(s.byFeature[0]).toMatchObject({ calls: 2, count: 3 });
    expect(s.byModel[1]).toMatchObject({ key: "m2", count: 25 });
  });

  it("fills every day of the window, oldest first", () => {
    const s = summarizeAiUsage([entry({ costUsd: 0.01 })], NOW, 7);
    expect(s.daily).toHaveLength(7);
    expect(s.daily[6]).toEqual({ day: "2026-10-02", costUsd: 0.01, calls: 1 });
    expect(s.daily[0].day).toBe("2026-09-26");
  });

  it("counts calls with no reported cost", () => {
    const s = summarizeAiUsage([entry({ costUsd: 0, costKnown: false })], NOW);
    expect(s.unknownCostCalls).toBe(1);
  });
});

describe("formatUsd", () => {
  it("shows sub-cent amounts with 4 decimals", () => {
    expect(formatUsd(0.0012)).toBe("$0.0012");
    expect(formatUsd(1.5)).toBe("$1.50");
    expect(formatUsd(0)).toBe("$0.00");
  });
});
