import { ExpenseType, ExpenseCategory, EXPENSE_CATEGORIES } from "@/types/expense";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

if (!API_KEY) {
  console.error(
    "Missing Gemini API key. Make sure NEXT_PUBLIC_GEMINI_API_KEY is set in .env.local file.",
  );
}

interface ExtractedReceiptData {
  merchant?: string;
  date?: string;
  items: ExtractedReceiptItem[];
  total?: number;
  location?: string;
  tags?: string[];
}

export interface AnalyzeReceiptOptions {
  knownTags?: string[];
}

interface ExtractedReceiptItem {
  name: string;
  price: number | string;
  category?: string;
  quantity?: number;
}

const DEFAULT_MIME = "image/jpeg";
const SUPPORTED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const UNREADABLE_RECEIPT_ERROR = "Could not read receipt. Try a clearer photo.";

function resolveMimeType(imageData: string, explicitMime?: string): string {
  if (explicitMime && SUPPORTED_MIMES.has(explicitMime)) return explicitMime;
  const match = imageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  if (match && SUPPORTED_MIMES.has(match[1])) return match[1];
  return DEFAULT_MIME;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.\-]/g, "");
    const parsed = parseFloat(cleaned);
    return parsed;
  }
  return NaN;
}

function pickCategory(
  categoryHint: string | undefined,
  itemName: string | undefined,
): ExpenseCategory {
  const hint = categoryHint?.toLowerCase() || "";
  if (hint) {
    const match = EXPENSE_CATEGORIES.find(
      (cat) =>
        hint.includes(cat.value) ||
        cat.value.includes(hint) ||
        hint.includes(cat.label.toLowerCase()) ||
        cat.label.toLowerCase().includes(hint),
    );
    if (match) return match.value as ExpenseCategory;
  }
  if (itemName) {
    const name = itemName.toLowerCase();
    if (
      name.includes("food") ||
      name.includes("meal") ||
      name.includes("snack") ||
      name.includes("drink") ||
      name.includes("cup") ||
      name.includes("pack")
    ) {
      return "food";
    }
  }
  return "other";
}

function mostCommonCategory(items: ExtractedReceiptItem[]): ExpenseCategory {
  if (items.length === 0) return "other";
  const counts = new Map<ExpenseCategory, number>();
  for (const item of items) {
    const cat = pickCategory(item.category, item.name);
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  let winner: ExpenseCategory = "other";
  let best = -1;
  for (const [cat, count] of counts) {
    if (count > best) {
      winner = cat;
      best = count;
    }
  }
  return winner;
}

function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value.toFixed(2);
}

function buildDescription(merchant: string | undefined, items: ExtractedReceiptItem[]): string {
  const header = merchant?.trim() || "Receipt";
  if (items.length === 0) return header;
  const lines = items.map((item) => {
    const qty = item.quantity && item.quantity > 1 ? `${item.quantity}x ` : "";
    const price = toNumber(item.price);
    const priceStr = Number.isFinite(price) && price > 0 ? ` — ${formatMoney(price)}` : "";
    return `- ${qty}${item.name}${priceStr}`;
  });
  return `${header}\n${lines.join("\n")}`;
}

/**
 * Analyzes a receipt image using Gemini and returns a single aggregated expense.
 * Throws if the receipt can't be parsed into a usable expense.
 */
export async function analyzeReceipt(
  imageData: string,
  mimeType?: string,
  options: AnalyzeReceiptOptions = {},
): Promise<Partial<ExpenseType>> {
  if (!API_KEY) {
    throw new Error("Missing Gemini API key");
  }

  if (!imageData || !imageData.includes("base64")) {
    throw new Error("Invalid image data");
  }

  const base64Data = imageData.split(",")[1] || imageData;
  const resolvedMime = resolveMimeType(imageData, mimeType);

  const knownTagsList = (options.knownTags ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 50);

  const knownTagsBlock = knownTagsList.length
    ? `\n\nThe user has previously used these tags: ${knownTagsList.join(", ")}. Prefer reusing these tags when they apply. You may also add up to 2 new tags if clearly warranted.`
    : "\n\nThe user has no prior tags yet. Suggest up to 3 concise tags based on the receipt.";

  const prompt = `Analyze this receipt image and extract its contents.

Return ONLY a JSON object (no prose, no markdown, no code fences) in this exact shape:
{
  "merchant": "store name",
  "date": "YYYY-MM-DD",
  "items": [
    { "name": "item name", "price": 0.00, "quantity": 1, "category": "food" }
  ],
  "total": 0.00,
  "location": "street address or city if printed on the receipt, otherwise empty string",
  "tags": ["tag1", "tag2"]
}

Rules:
- "total" MUST be a number (not a string, not null). Use the printed receipt total. If you truly cannot find it, set it to the sum of item prices.
- "price" and "total" are numbers with up to 2 decimal places. Do not include currency symbols.
- "quantity" is an integer, default 1 if not shown.
- If no line items are visible, return items: [] but still provide total and merchant.
- category should be one of: food, entertainment, transport, shopping, utilities, health, travel, other.
- "location" should only be populated if the receipt clearly shows an address or city. Otherwise use an empty string.
- "tags" should contain 1-5 short lowercase tags (single words or short phrases, each ≤ 30 chars).${knownTagsBlock}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: resolvedMime,
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(`${API_URL}?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini API error (${response.status}):`, errorText);
    throw new Error(`Receipt analysis failed (${response.status})`);
  }

  const result = await response.json();
  const textContent: string | undefined = result?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textContent) {
    console.error("Invalid Gemini response structure:", result);
    throw new Error(UNREADABLE_RECEIPT_ERROR);
  }

  const extractedData = parseReceiptJson(textContent);
  if (!extractedData) {
    console.error("Receipt JSON parse failed. Raw text:", textContent);
    throw new Error(UNREADABLE_RECEIPT_ERROR);
  }

  const items = Array.isArray(extractedData.items) ? extractedData.items : [];

  const totalFromGemini = toNumber(extractedData.total);
  const summed = items.reduce((acc, item) => {
    const price = toNumber(item.price);
    const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
    return Number.isFinite(price) ? acc + price * qty : acc;
  }, 0);

  const amount = Number.isFinite(totalFromGemini) && totalFromGemini > 0 ? totalFromGemini : summed;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(UNREADABLE_RECEIPT_ERROR);
  }

  const parsedDate = extractedData.date ? new Date(extractedData.date) : null;
  const date = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : new Date();

  const location = typeof extractedData.location === "string" ? extractedData.location.trim() : "";

  const normalizedKnown = new Map<string, string>();
  for (const t of options.knownTags ?? []) {
    const trimmed = t.trim();
    if (trimmed) normalizedKnown.set(trimmed.toLowerCase(), trimmed);
  }
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of extractedData.tags ?? []) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim().toLowerCase().slice(0, 30);
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    tags.push(normalizedKnown.get(trimmed) ?? trimmed);
    if (tags.length >= 5) break;
  }

  return {
    amount,
    date,
    description: buildDescription(extractedData.merchant, items),
    category: mostCommonCategory(items),
    location,
    tags,
  };
}

function parseReceiptJson(text: string): ExtractedReceiptData | null {
  const candidates = [
    text,
    text.match(/```json\s*([\s\S]*?)\s*```/)?.[1],
    text.match(/```\s*([\s\S]*?)\s*```/)?.[1],
    text.match(/{[\s\S]*}/)?.[0],
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") {
        return parsed as ExtractedReceiptData;
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

/**
 * Converts a file to base64 encoded string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
