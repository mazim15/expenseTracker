import { ExpenseType, ExpenseCategory, EXPENSE_CATEGORIES } from "@/types/expense";
import { auth } from "@/lib/firebase";
import { compressImage } from "@/lib/receipts";

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

export interface ScanUsage {
  model: string | null;
  /** What OpenRouter charged for this scan, in USD (null if not reported). */
  costUsd: number | null;
  tokens: number;
}

export interface AnalyzeReceiptOptions {
  knownTags?: string[];
  /** Called with the model, token count and cost of the scan once the model has answered. */
  onUsage?: (usage: ScanUsage) => void;
}

/** "$0.0012" — scan costs are fractions of a cent, so show 4 significant digits. */
export function formatScanCost(usd: number | null): string {
  if (usd === null) return "cost unavailable";
  return `$${usd < 0.01 ? usd.toPrecision(2) : usd.toFixed(3)}`;
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

/** The original data URL, relabelled with a supported MIME type when the browser left it blank. */
function withMime(img: ReceiptImageInput): string {
  const mime = resolveMimeType(img.dataUrl, img.mimeType);
  return img.dataUrl.replace(/^data:[^;]*;base64,/, `data:${mime};base64,`);
}

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
 * Analyzes one or more images of a single receipt and returns one aggregated expense.
 * The images go to our `/api/scan-receipt` route, which asks a vision model on OpenRouter
 * to read them (the API key stays on the server). When multiple images are passed they are
 * treated as parts/pages of the SAME receipt and combined into one result.
 * Throws if the receipt can't be parsed into a usable expense.
 */
export async function analyzeReceipt(
  images: ReceiptImageInput[],
  options: AnalyzeReceiptOptions = {},
): Promise<Partial<ExpenseType>> {
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error("No receipt images provided");
  }
  for (const img of images) {
    if (!img?.dataUrl || !img.dataUrl.includes("base64")) {
      throw new Error("Invalid image data");
    }
  }

  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Please sign in again to scan receipts.");

  // Downscale before upload: phone photos are often 5–10 MB, far over what the server accepts.
  // Formats the browser can't decode (e.g. HEIC outside Safari) are sent as-is.
  const prepared = await Promise.all(
    images.map(async (img) => ({
      dataUrl: await compressImage(img.dataUrl).catch(() => withMime(img)),
    })),
  );

  const response = await fetch("/api/scan-receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      images: prepared,
      knownTags: (options.knownTags ?? []).slice(0, 50),
      categories: EXPENSE_CATEGORIES.map((c) => c.value),
    }),
  });

  const result = (await response.json().catch(() => ({}))) as {
    text?: string;
    finishReason?: string | null;
    error?: string;
    model?: string | null;
    costUsd?: number | null;
    tokens?: number;
  };
  if (!response.ok) {
    throw new Error(result.error || `Receipt analysis failed (${response.status})`);
  }
  options.onUsage?.({
    model: result.model ?? null,
    costUsd: result.costUsd ?? null,
    tokens: result.tokens ?? 0,
  });

  const finishReason = result.finishReason ?? undefined;
  const textContent = result.text;

  if (!textContent) {
    if (finishReason === "length") {
      throw new Error("Receipt is too long — try fewer or smaller images.");
    }
    if (finishReason === "content_filter") {
      throw new Error("Receipt was blocked by content filters. Try a different image.");
    }
    throw new Error(UNREADABLE_RECEIPT_ERROR);
  }

  const extractedData = parseReceiptJson(textContent);
  if (!extractedData) {
    console.error("Receipt JSON parse failed.", { finishReason, rawText: textContent });
    if (finishReason === "length") {
      throw new Error("Receipt is too long — try fewer or smaller images.");
    }
    throw new Error(UNREADABLE_RECEIPT_ERROR);
  }

  const items = Array.isArray(extractedData.items) ? extractedData.items : [];

  const totalFromModel = toNumber(extractedData.total);
  const discount = Math.max(0, toNumber(extractedData.discount) || 0);
  const fees = Math.max(0, toNumber(extractedData.fees) || 0);
  const summed = items.reduce((acc, item) => {
    const price = toNumber(item.price);
    const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
    return Number.isFinite(price) ? acc + price * qty : acc;
  }, 0);

  // Prefer the model's printed total when it already accounts for discount/fees; otherwise
  // derive it from items (sum - discount + fees). Sanity-check by reconciling against the
  // computed value — if the model's total ignores a voucher we extracted, fall back to the
  // adjusted value.
  const computed = summed - discount + fees;
  let amount: number;
  if (Number.isFinite(totalFromModel) && totalFromModel > 0) {
    const offBy = Math.abs(totalFromModel - computed);
    const ignoresDiscount = discount > 0 && Math.abs(totalFromModel - (computed + discount)) < 0.5;
    amount = ignoresDiscount && offBy > 0.5 ? computed : totalFromModel;
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
