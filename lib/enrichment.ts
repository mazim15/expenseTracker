import { deleteField, doc, Timestamp, writeBatch } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { logError } from "@/lib/logging";
import { recordAiUsage } from "@/lib/aiUsage";
import { ENRICH_BATCH_SIZE, EnrichmentInput, EnrichmentResult } from "@/lib/utils/enrichment";

class EnrichmentError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

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
  if (!res.ok || !body.results) {
    throw new EnrichmentError(body.error || `Enrichment failed (${res.status})`, res.status);
  }
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
 * Calls `onProgress` with the running count of processed (done + skipped) expenses.
 *
 * When the model's answer for a batch is unreadable (502), the batch is split in half and
 * retried down to single expenses, so one problem expense can't block the rest; expenses
 * that still fail are skipped and left unprocessed. Other errors (auth, server config) throw.
 */
export async function enrichExpenses(
  userId: string,
  expenses: EnrichmentInput[],
  knownMerchants: string[] = [],
  onProgress?: (processed: number) => void,
): Promise<{ done: number; skipped: number }> {
  const known = new Set(knownMerchants);
  let done = 0;
  let skipped = 0;

  const run = async (chunk: EnrichmentInput[]): Promise<void> => {
    let results: EnrichmentResult[];
    try {
      results = await requestEnrichment(chunk, [...known]);
    } catch (err) {
      if (!(err instanceof EnrichmentError) || err.status !== 502) throw err;
      if (chunk.length === 1) {
        skipped += 1;
        onProgress?.(done + skipped);
        return;
      }
      const half = Math.ceil(chunk.length / 2);
      await run(chunk.slice(0, half));
      await run(chunk.slice(half));
      return;
    }
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
    // Ids the model left out of its answer stay unprocessed
    skipped += chunk.length - results.length;
    onProgress?.(done + skipped);
  };

  for (let i = 0; i < expenses.length; i += ENRICH_BATCH_SIZE) {
    await run(expenses.slice(i, i + ENRICH_BATCH_SIZE));
  }
  return { done, skipped };
}

/** Fire-and-forget enrichment after a save; failures are logged, never shown to the user. */
export function enrichInBackground(userId: string, expenses: EnrichmentInput[]): void {
  if (expenses.length === 0) return;
  enrichExpenses(userId, expenses).catch((err) =>
    logError(err as Error, "enrichInBackground", { userId, count: expenses.length }),
  );
}
