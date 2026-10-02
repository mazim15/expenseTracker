// Expense enrichment, server-side: reads expense descriptions/locations and asks a text model
// on OpenRouter for the merchant and brands, so related expenses can be linked. Text-only, so
// it costs a fraction of a receipt scan (~$0.001 per batch of 25).
import { NextResponse } from "next/server";
import { z } from "zod";
import { userIdFromRequest } from "@/lib/server/auth";
import { DEFAULT_ENRICH_MODEL, OPENROUTER_URL } from "@/lib/server/openrouter";
import { buildEnrichPrompt, ENRICH_BATCH_SIZE, parseEnrichResponse } from "@/lib/utils/enrichment";

export const runtime = "nodejs";

// The detection model reasons before answering, so allow it more time than a plain reply
const MODEL_TIMEOUT_MS = 60_000;

const Body = z.object({
  expenses: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        description: z.string().max(500),
        location: z.string().max(200).optional(),
        category: z.string().max(50),
      }),
    )
    .min(1)
    .max(ENRICH_BATCH_SIZE),
  knownMerchants: z.array(z.string().max(100)).max(200).default([]),
});

function error(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return error(500, "Enrichment isn't configured on the server.");

  const userId = await userIdFromRequest(req);
  if (!userId) return error(401, "Please sign in again.");

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error(400, parsed.error.issues[0]?.message ?? "Invalid request");
  const { expenses, knownMerchants } = parsed.data;

  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Expense Tracker",
      },
      body: JSON.stringify({
        model: process.env.ENRICH_MODEL || DEFAULT_ENRICH_MODEL,
        temperature: 0,
        max_tokens: 4096,
        response_format: { type: "json_object" },
        usage: { include: true },
        messages: [{ role: "user", content: buildEnrichPrompt(expenses, knownMerchants) }],
      }),
    });
  } catch {
    return error(504, "Couldn't reach the enrichment model.");
  }

  if (!res.ok) {
    console.error("enrich-expenses: OpenRouter", res.status, await res.text().catch(() => ""));
    return error(502, `Enrichment failed (${res.status})`);
  }

  const out = (await res.json()) as {
    model?: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
    choices?: { finish_reason?: string; message?: { content?: string | null } }[];
  };
  console.info("enrich-expenses", { userId, count: expenses.length, usage: out.usage });

  const choice = out.choices?.[0];
  const text = choice?.message?.content ?? "";
  const results = parseEnrichResponse(
    text,
    expenses.map((e) => e.id),
  );
  if (!results) {
    // e.g. an empty reply from the provider's safety filter, or a truncated answer
    console.error("enrich-expenses: unreadable reply", {
      userId,
      finishReason: choice?.finish_reason ?? null,
      text: text.slice(0, 500),
    });
    return error(
      502,
      `Enrichment returned an unreadable answer (${choice?.finish_reason ?? "no reply"}).`,
    );
  }
  return NextResponse.json({
    results,
    model: out.model ?? null,
    costUsd: typeof out.usage?.cost === "number" ? out.usage.cost : null,
    tokens: (out.usage?.prompt_tokens ?? 0) + (out.usage?.completion_tokens ?? 0),
  });
}
