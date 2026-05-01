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
  subtotal?: number | string;
  discount?: number | string;
  fees?: number | string;
  total?: number;
  location?: string;
  tags?: string[];
}

const MAX_DESCRIPTION_LENGTH = 480;
const MAX_PAST_DAYS = 365;
const MAX_FUTURE_DAYS = 7;

export interface AnalyzeReceiptOptions {
  knownTags?: string[];
}

export interface ReceiptImageInput {
  dataUrl: string;
  mimeType?: string;
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
  if (items.length === 0) return header.slice(0, MAX_DESCRIPTION_LENGTH);

  const lines = items.map((item) => {
    const qty = item.quantity && item.quantity > 1 ? `${item.quantity}x ` : "";
    const price = toNumber(item.price);
    const priceStr = Number.isFinite(price) && price > 0 ? ` — ${formatMoney(price)}` : "";
    return `- ${qty}${item.name}${priceStr}`;
  });

  const full = `${header}\n${lines.join("\n")}`;
  if (full.length <= MAX_DESCRIPTION_LENGTH) return full;

  // Trim items from the end until it fits, leaving room for a "+ N more" suffix.
  const kept: string[] = [];
  let used = header.length;
  for (let i = 0; i < lines.length; i++) {
    const suffix = `\n+ ${items.length - i} more`;
    const candidate = used + 1 + lines[i].length + suffix.length;
    if (candidate > MAX_DESCRIPTION_LENGTH) {
      const remaining = items.length - i;
      if (remaining > 0) {
        return `${header}\n${kept.join("\n")}\n+ ${remaining} more`.slice(
          0,
          MAX_DESCRIPTION_LENGTH,
        );
      }
      break;
    }
    kept.push(lines[i]);
    used += 1 + lines[i].length;
  }
  return `${header}\n${kept.join("\n")}`.slice(0, MAX_DESCRIPTION_LENGTH);
}

function clampDate(parsed: Date | null): Date {
  if (!parsed || isNaN(parsed.getTime())) return new Date();
  const now = Date.now();
  const diffDays = (parsed.getTime() - now) / (1000 * 60 * 60 * 24);
  if (diffDays > MAX_FUTURE_DAYS || diffDays < -MAX_PAST_DAYS) {
    console.warn("Receipt date outside expected range, falling back to today:", parsed);
    return new Date();
  }
  return parsed;
}

/**
 * Analyzes one or more images of a single receipt using Gemini and returns one aggregated expense.
 * When multiple images are passed, they are treated as different parts/pages of the SAME receipt
 * (e.g. a long receipt photographed in sections) and combined into one result.
 * Throws if the receipt can't be parsed into a usable expense.
 */
export async function analyzeReceipt(
  images: ReceiptImageInput[],
  options: AnalyzeReceiptOptions = {},
): Promise<Partial<ExpenseType>> {
  if (!API_KEY) {
    throw new Error("Missing Gemini API key");
  }

  if (!Array.isArray(images) || images.length === 0) {
    throw new Error("No receipt images provided");
  }

  const imageParts = images.map((img) => {
    if (!img?.dataUrl || !img.dataUrl.includes("base64")) {
      throw new Error("Invalid image data");
    }
    const base64Data = img.dataUrl.split(",")[1] || img.dataUrl;
    return {
      inline_data: {
        mime_type: resolveMimeType(img.dataUrl, img.mimeType),
        data: base64Data,
      },
    };
  });

  const knownTagsList = (options.knownTags ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 50);

  const knownTagsBlock = knownTagsList.length
    ? `\n\nThe user has previously used these tags: ${knownTagsList.join(", ")}. Prefer reusing these tags when they apply. You may also add up to 2 new tags if clearly warranted.`
    : "\n\nThe user has no prior tags yet. Suggest up to 3 concise tags based on the receipt.";

  const multiImageNote =
    images.length > 1
      ? `\n\nIMPORTANT: ${images.length} images are provided. They are different parts of the SAME receipt (e.g. a long receipt photographed in sections, front/back, or overlapping segments). Combine all visible line items into a single result and avoid double-counting items that appear in overlapping regions across images. The total should reflect the receipt as a whole.`
      : "";

  const prompt = `Analyze the receipt image(s) and extract the receipt's contents.${multiImageNote}

Return ONLY a JSON object (no prose, no markdown, no code fences) in this exact shape:
{
  "merchant": "store name",
  "date": "YYYY-MM-DD",
  "items": [
    { "name": "item name", "price": 0.00, "quantity": 1, "category": "food" }
  ],
  "subtotal": 0.00,
  "discount": 0.00,
  "fees": 0.00,
  "total": 0.00,
  "location": "street address or city if printed on the receipt, otherwise empty string",
  "tags": ["tag1", "tag2"]
}

Rules:
- "total" MUST be a number representing the FINAL amount the customer paid. This is the grand total AFTER subtracting all discounts, vouchers, coupons, promo codes, loyalty rewards, and credits, AND adding any taxes, tips, fees, delivery charges, or service charges. Use the printed grand total when available.
- "discount" is the sum of all reductions (voucher, coupon, promo, loyalty, etc.) as a positive number. Use 0 if none.
- "fees" is the sum of all additions (tax, tip, delivery, service charge, etc.) as a positive number. Use 0 if none.
- "subtotal" is the pre-discount, pre-fee sum of items. Use 0 if not printed.
- If the printed total is missing, compute it as: subtotal - discount + fees (or sum(items) - discount + fees).
- "price" and all money fields are numbers with up to 2 decimal places. No currency symbols.
- "quantity" is an integer, default 1 if not shown.
- If no line items are visible, return items: [] but still provide total and merchant.
- category should be one of: food, entertainment, transport, shopping, utilities, health, travel, other.
- "date" must be the printed PURCHASE / ORDER / TRANSACTION date in YYYY-MM-DD. Do NOT use phone clock, status bar time, expiry dates, "best before" dates, order IDs, or any number that is not clearly a transaction date. If no purchase date is clearly printed, return an empty string.
- "location" should only be populated if the receipt clearly shows an address or city. Otherwise use an empty string.
- "tags" should contain 1-5 short lowercase tags (single words or short phrases, each ≤ 30 chars).${knownTagsBlock}`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }, ...imageParts],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
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
  const candidate = result?.candidates?.[0];
  const finishReason: string | undefined = candidate?.finishReason;
  const textContent: string | undefined = candidate?.content?.parts?.[0]?.text;

  if (!textContent) {
    console.error("Invalid Gemini response structure:", {
      finishReason,
      promptFeedback: result?.promptFeedback,
      result,
    });
    if (finishReason === "MAX_TOKENS") {
      throw new Error("Receipt is too long — try fewer or smaller images.");
    }
    if (finishReason === "SAFETY" || finishReason === "RECITATION") {
      throw new Error("Receipt was blocked by content filters. Try a different image.");
    }
    throw new Error(UNREADABLE_RECEIPT_ERROR);
  }

  const extractedData = parseReceiptJson(textContent);
  if (!extractedData) {
    console.error("Receipt JSON parse failed.", { finishReason, rawText: textContent });
    if (finishReason === "MAX_TOKENS") {
      throw new Error("Receipt is too long — try fewer or smaller images.");
    }
    throw new Error(UNREADABLE_RECEIPT_ERROR);
  }

  const items = Array.isArray(extractedData.items) ? extractedData.items : [];

  const totalFromGemini = toNumber(extractedData.total);
  const discount = Math.max(0, toNumber(extractedData.discount) || 0);
  const fees = Math.max(0, toNumber(extractedData.fees) || 0);
  const summed = items.reduce((acc, item) => {
    const price = toNumber(item.price);
    const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
    return Number.isFinite(price) ? acc + price * qty : acc;
  }, 0);

  // Prefer Gemini's printed total when it already accounts for discount/fees; otherwise
  // derive it from items (sum - discount + fees). Sanity-check by reconciling against the
  // computed value — if Gemini's total ignores a voucher we extracted, fall back to the
  // adjusted value.
  const computed = summed - discount + fees;
  let amount: number;
  if (Number.isFinite(totalFromGemini) && totalFromGemini > 0) {
    const offBy = Math.abs(totalFromGemini - computed);
    const ignoresDiscount = discount > 0 && Math.abs(totalFromGemini - (computed + discount)) < 0.5;
    amount = ignoresDiscount && offBy > 0.5 ? computed : totalFromGemini;
  } else {
    amount = computed > 0 ? computed : summed;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(UNREADABLE_RECEIPT_ERROR);
  }

  const parsedDate = extractedData.date ? new Date(extractedData.date) : null;
  const date = clampDate(parsedDate);

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
