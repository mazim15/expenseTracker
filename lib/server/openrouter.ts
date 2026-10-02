// Server-only helpers shared by the AI routes (receipt scanning, expense enrichment).

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Cheap, fast vision model that reads receipts well (~$0.25/M input, $1.50/M output tokens;
// roughly $0.002 per scan). Override with SCAN_MODEL.
export const DEFAULT_MODEL = "google/gemini-3.1-flash-lite";
// Text-only merchant/brand detection: same answers as the scan model in testing at about a
// third of the cost ($0.10/M input, $0.50/M output), but slower — fine in the background.
// Override with ENRICH_MODEL.
export const DEFAULT_ENRICH_MODEL = "openai/gpt-6-luna";
