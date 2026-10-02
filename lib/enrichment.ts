import { deleteField, doc, Timestamp, writeBatch } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { logError } from "@/lib/logging";
import { recordAiUsage } from "@/lib/aiUsage";
import { ENRICH_BATCH_SIZE, EnrichmentInput, EnrichmentResult } from "@/lib/utils/enrichment";

async function requestEnrichment(
  expenses: EnrichmentInput[],
  knownMerchants: string[],
): Promise<EnrichmentResult[]> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not signed in");
  const res = await fetch("/api/enrich-expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      expenses: expenses.map((e) => ({
        id: e.id,
        description: e.description.slice(0, 500),
        location: e.location?.slice(0, 200),
        category: e.category.slice(0, 50),
      })),
      knownMerchants: knownMerchants.slice(0, 200),
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    results?: EnrichmentResult[];
    error?: string;
    model?: string | null;
    costUsd?: number | null;
    tokens?: number;
  };
  if (!res.ok || !body.results) throw new Error(body.error || `Enrichment failed (${res.status})`);
  void recordAiUsage({
    feature: "enrichment",
    model: body.model ?? null,
    costUsd: body.costUsd ?? null,
    tokens: body.tokens ?? 0,
    count: expenses.length,
  });
  return body.results;
}

/**
 * Asks AI for each expense's merchant and brand and saves them with `enrichedAt`.
 * `knownMerchants` keeps spellings consistent with what the user already has.
 * Calls `onProgress` with the running count. Returns how many expenses were enriched.
 */
export async function enrichExpenses(
  userId: string,
  expenses: EnrichmentInput[],
  knownMerchants: string[] = [],
  onProgress?: (done: number) => void,
): Promise<number> {
  const known = new Set(knownMerchants);
  let done = 0;
  for (let i = 0; i < expenses.length; i += ENRICH_BATCH_SIZE) {
    const results = await requestEnrichment(expenses.slice(i, i + ENRICH_BATCH_SIZE), [...known]);
    const batch = writeBatch(db);
    const now = Timestamp.now();
    for (const r of results) {
      batch.update(doc(db, "users", userId, "expenses", r.id), {
        merchant: r.merchant || deleteField(),
        brand: r.brand || deleteField(),
        enrichedAt: now,
      });
      if (r.merchant) known.add(r.merchant);
    }
    await batch.commit();
    done += results.length;
    onProgress?.(done);
  }
  return done;
}

/** Fire-and-forget enrichment after a save; failures are logged, never shown to the user. */
export function enrichInBackground(userId: string, expenses: EnrichmentInput[]): void {
  if (expenses.length === 0) return;
  enrichExpenses(userId, expenses).catch((err) =>
    logError(err as Error, "enrichInBackground", { userId, count: expenses.length }),
  );
}
