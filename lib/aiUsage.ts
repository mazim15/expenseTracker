import { addDoc, collection, getDocs, limit, orderBy, query, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AiFeature, AiUsageEntry } from "@/lib/utils/aiUsageSummary";

const MAX_ENTRIES = 2000;

function usageCollection(userId: string) {
  return collection(db, "users", userId, "aiUsage");
}

/** Records one AI call for the signed-in user. Best-effort: never throws. */
export async function recordAiUsage(entry: {
  feature: AiFeature;
  model: string | null;
  costUsd: number | null;
  tokens: number;
  /** Photos scanned or expenses enriched in this call. */
  count: number;
}): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    await addDoc(usageCollection(uid), {
      feature: entry.feature,
      model: (entry.model ?? "unknown").slice(0, 100),
      costUsd: entry.costUsd ?? 0,
      costKnown: entry.costUsd !== null,
      tokens: entry.tokens,
      count: entry.count,
      createdAt: Timestamp.now(),
    });
  } catch (err) {
    console.error("Could not record AI usage:", err);
  }
}

/** The user's AI calls, newest first. */
export async function listAiUsage(userId: string): Promise<AiUsageEntry[]> {
  const snap = await getDocs(
    query(usageCollection(userId), orderBy("createdAt", "desc"), limit(MAX_ENTRIES)),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      feature: data.feature === "enrichment" ? "enrichment" : "receipt_scan",
      model: typeof data.model === "string" ? data.model : "unknown",
      costUsd: typeof data.costUsd === "number" ? data.costUsd : 0,
      costKnown: data.costKnown !== false,
      tokens: typeof data.tokens === "number" ? data.tokens : 0,
      count: typeof data.count === "number" ? data.count : 0,
      createdAt: data.createdAt?.toDate?.() ?? new Date(0),
    };
  });
}
