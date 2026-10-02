// Pure helpers for AI expense enrichment, shared by the API route and its tests.

export const ENRICH_BATCH_SIZE = 25;
const MAX_NAME_LENGTH = 100;

export interface EnrichmentInput {
  id: string;
  /** A merchant the user typed or confirmed; enrichment keeps it instead of its own guess. */
  merchant?: string;
  description: string;
  location?: string;
  category: string;
}

export interface EnrichmentResult {
  id: string;
  /** Empty when the model couldn't tell. */
  merchant: string;
  /** Every product brand named; empty when none. */
  brands: string[];
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

  return `For each personal expense below, identify the merchant (the shop, restaurant, company or service paid) and every product brand bought.${known}

Expenses (JSON):
${JSON.stringify(list)}

Return ONLY a JSON object (no prose, no markdown) in this exact shape:
{ "results": [ { "id": "same id as input", "merchant": "", "brands": [] } ] }

Rules:
- One result per input id.
- "merchant": short common name, e.g. "KFC", "Careem", "Imtiaz". Location text is often "Merchant, Area" — the part before the comma is usually the merchant. Use "" if the expense does not name or clearly imply one.
- "brands": every product brand the description names, one entry each (e.g. ["Tifal"] for "tifal xxl, 3 wipes"; ["Dettol", "Sunsilk"] for "Dettol soap, Sunsilk shampoo"), else []. Do not repeat the merchant as a brand.
- Never invent names that are not supported by the description or location.`;
}

const MAX_BRANDS = 20;

/** The user's merchant names, most used first, to keep AI spellings consistent with theirs. */
export function knownMerchantNames(expenses: { merchant?: string }[], limit = 100): string[] {
  const counts = new Map<string, { name: string; count: number }>();
  for (const e of expenses) {
    const name = e.merchant?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const entry = counts.get(key) ?? { name, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((e) => e.name);
}

function cleanName(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_NAME_LENGTH) : "";
}

/** Unique (case-insensitive) non-empty names, first spelling wins. */
export function uniqueNames(values: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const name = cleanName(v);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.slice(0, MAX_BRANDS);
}

function parseJson(text: string): unknown {
  const unfenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)?.[1] ?? text;
  const candidates = [
    unfenced,
    unfenced.match(/\{[\s\S]*\}/)?.[0],
    unfenced.match(/\[[\s\S]*\]/)?.[0],
  ];
  for (const c of candidates) {
    if (!c) continue;
    try {
      return JSON.parse(c);
    } catch {
      // try the next candidate
    }
  }
  return undefined;
}

/** The results array: `{ results: [...] }` as asked, or a bare array / another key holding one. */
function findResults(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (typeof data !== "object" || data === null) return null;
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.results)) return obj.results;
  return Object.values(obj).find(Array.isArray) ?? null;
}

/**
 * Parses the model's reply, keeping only results for ids we asked about (each once).
 * Returns null when the reply isn't usable JSON.
 */
export function parseEnrichResponse(text: string, ids: string[]): EnrichmentResult[] | null {
  const results = findResults(parseJson(text));
  if (!results) return null;

  const wanted = new Set(ids);
  const out: EnrichmentResult[] = [];
  for (const r of results) {
    if (typeof r !== "object" || r === null) continue;
    const { id, merchant, brands, brand } = r as Record<string, unknown>;
    if (typeof id !== "string" || !wanted.has(id)) continue;
    wanted.delete(id);
    // Tolerate a single "brand" string in case the model answers in that shape
    const list = Array.isArray(brands) ? brands : [brand];
    out.push({ id, merchant: cleanName(merchant), brands: uniqueNames(list) });
  }
  return out;
}
