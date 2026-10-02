// Server-only: who is calling an API route, from their Firebase ID token.

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
