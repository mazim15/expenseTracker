// Pure helpers for AI expense enrichment, shared by the API route and its tests.

export const ENRICH_BATCH_SIZE = 25;
const MAX_NAME_LENGTH = 100;

export interface EnrichmentInput {
  id: string;
  description: string;
  location?: string;
  category: string;
}

export interface EnrichmentResult {
  id: string;
  /** Empty when the model couldn't tell. */
  merchant: string;
  brand: string;
}

export function buildEnrichPrompt(expenses: EnrichmentInput[], knownMerchants: string[]): string {
  const known = knownMerchants.length
    ? `\n\nThe user already has these merchant names: ${knownMerchants.join(", ")}. When an expense is from one of them, return that exact spelling.`
    : "";
  const list = expenses.map((e) => ({
    id: e.id,
    description: e.description,
    location: e.location ?? "",
    category: e.category,
  }));

  return `For each personal expense below, identify the merchant (the shop, restaurant, company or service paid) and the main product brand bought.${known}

Expenses (JSON):
${JSON.stringify(list)}

Return ONLY a JSON object (no prose, no markdown) in this exact shape:
{ "results": [ { "id": "same id as input", "merchant": "", "brand": "" } ] }

Rules:
- One result per input id.
- "merchant": short common name, e.g. "KFC", "Careem", "Imtiaz". Location text is often "Merchant, Area" — the part before the comma is usually the merchant. Use "" if the expense does not name or clearly imply one.
- "brand": the product brand when the description names one (e.g. "Tifal" for "tifal xxl, 3 wipes"), else "". Do not repeat the merchant as the brand.
- Never invent names that are not supported by the description or location.`;
}

function cleanName(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_NAME_LENGTH) : "";
}

/**
 * Parses the model's reply, keeping only results for ids we asked about (each once).
 * Returns null when the reply isn't usable JSON.
 */
export function parseEnrichResponse(text: string, ids: string[]): EnrichmentResult[] | null {
  const raw = text.match(/\{[\s\S]*\}/)?.[0];
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const results = (data as { results?: unknown })?.results;
  if (!Array.isArray(results)) return null;

  const wanted = new Set(ids);
  const out: EnrichmentResult[] = [];
  for (const r of results) {
    if (typeof r !== "object" || r === null) continue;
    const { id, merchant, brand } = r as Record<string, unknown>;
    if (typeof id !== "string" || !wanted.has(id)) continue;
    wanted.delete(id);
    out.push({ id, merchant: cleanName(merchant), brand: cleanName(brand) });
  }
  return out;
}
