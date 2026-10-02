// Server-only helpers shared by the AI routes (receipt scanning, expense enrichment).

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Cheap, fast model that reads receipts well (~$0.25/M input, $1.50/M output tokens;
// roughly $0.001–0.002 per single-photo scan). Override with SCAN_MODEL / ENRICH_MODEL.
export const DEFAULT_MODEL = "google/gemini-3.1-flash-lite";

/** Verifies a Firebase ID token with the Identity Toolkit REST API (no admin SDK needed). */
export async function verifyIdToken(token: string): Promise<string | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
      signal: AbortSignal.timeout(5_000),
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { users?: { localId?: string }[] };
  return data.users?.[0]?.localId ?? null;
}

/** The signed-in user's id from the request's `Authorization: Bearer <Firebase ID token>`. */
export async function userIdFromRequest(req: Request): Promise<string | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return token ? await verifyIdToken(token).catch(() => null) : null;
}
