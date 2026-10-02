// Receipt scanning, server-side: the browser sends the photos with its Firebase ID token,
// and this route asks a vision model on OpenRouter to read them. Keeping the call here means
// the OpenRouter key never reaches the browser (same pattern as the Android app's /scan).
import { NextResponse } from "next/server";
import { z } from "zod";
import { userIdFromRequest } from "@/lib/server/auth";
import { DEFAULT_MODEL, OPENROUTER_URL } from "@/lib/server/openrouter";

export const runtime = "nodejs";

const MODEL_TIMEOUT_MS = 45_000;

const Body = z.object({
  images: z
    .array(
      z.object({
        dataUrl: z.string().regex(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "Invalid image"),
      }),
    )
    .min(1)
    .max(8)
    .refine((imgs) => imgs.reduce((n, i) => n + i.dataUrl.length, 0) < 5_500_000, {
      message: "Images are too large",
    }),
  knownTags: z.array(z.string().max(30)).max(50).default([]),
  categories: z.array(z.string().min(1).max(50)).max(50).default([]),
  knownMerchants: z.array(z.string().min(1).max(100)).max(100).default([]),
});

function error(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

function buildPrompt(
  imageCount: number,
  knownTags: string[],
  categories: string[],
  knownMerchants: string[],
) {
  const tags = knownTags.map((t) => t.trim()).filter(Boolean);
  const knownTagsBlock = tags.length
    ? `\n\nThe user has previously used these tags: ${tags.join(", ")}. Prefer reusing these tags when they apply. You may also add up to 2 new tags if clearly warranted.`
    : "\n\nThe user has no prior tags yet. Suggest up to 3 concise tags based on the receipt.";
  const multiImageNote =
    imageCount > 1
      ? `\n\nIMPORTANT: ${imageCount} images are provided. They are different parts of the SAME receipt (e.g. a long receipt photographed in sections, front/back, or overlapping segments). Combine all visible line items into a single result and avoid double-counting items that appear in overlapping regions across images. The total should reflect the receipt as a whole.`
      : "";
  // Order screenshots often don't print the store name; without the user's own merchants the
  // model confidently guesses a wrong one (e.g. "Pandamart" for a Krave Mart order).
  const merchantsBlock = knownMerchants.length
    ? ` The user has bought from these merchants before: ${knownMerchants.join(", ")}. If this receipt is from one of them, return that exact name.`
    : "";
  const categoryList = categories.length
    ? categories.join(", ")
    : "food, transportation, shopping, utilities, healthcare, entertainment, other";

  return `Analyze the receipt image(s) and extract the receipt's contents.${multiImageNote}

Return ONLY a JSON object (no prose, no markdown, no code fences) in this exact shape:
{
  "merchant": "store name",
  "date": "YYYY-MM-DD",
  "items": [
    { "name": "item name", "price": 0.00, "quantity": 1, "category": "food", "brand": "" }
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
- "brand" is the item's product brand when the line names one (e.g. "Dettol" for "DETTOL SOAP 110G"), otherwise an empty string. Do not use the store's own name as the brand.
- If no line items are visible, return items: [] but still provide total and merchant.
- category must be one of: ${categoryList}.
- "date" must be the printed PURCHASE / ORDER / TRANSACTION date in YYYY-MM-DD. Do NOT use phone clock, status bar time, expiry dates, "best before" dates, order IDs, or any number that is not clearly a transaction date. If no purchase date is clearly printed, return an empty string.
- "merchant" is the store or app the purchase was made with.${merchantsBlock} If you can't tell, use an empty string — a wrong merchant is worse than an empty one.
- "location" is the store's address or city, only if the receipt clearly shows it; otherwise an empty string. Never use the customer's delivery address.
- "tags" should contain 1-5 short lowercase tags (single words or short phrases, each ≤ 30 chars).${knownTagsBlock}`;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return error(500, "Receipt scanning isn't configured on the server.");

  const userId = await userIdFromRequest(req);
  if (!userId) return error(401, "Please sign in again to scan receipts.");

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error(400, parsed.error.issues[0]?.message ?? "Invalid request");
  const { images, knownTags, categories, knownMerchants } = parsed.data;

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
        model: process.env.SCAN_MODEL || DEFAULT_MODEL,
        temperature: 0.2,
        max_tokens: 8192,
        response_format: { type: "json_object" },
        // Ask OpenRouter to include the charge for this call (USD) in `usage.cost`
        usage: { include: true },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: buildPrompt(images.length, knownTags, categories, knownMerchants),
              },
              ...images.map((img) => ({ type: "image_url", image_url: { url: img.dataUrl } })),
            ],
          },
        ],
      }),
    });
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    return error(
      504,
      timedOut
        ? "Scanning took too long — try fewer or smaller images."
        : "Couldn't reach the scanner.",
    );
  }

  if (!res.ok) {
    console.error("scan-receipt: OpenRouter", res.status, await res.text().catch(() => ""));
    return error(502, `Receipt analysis failed (${res.status})`);
  }

  const out = (await res.json()) as {
    model?: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
    choices?: { finish_reason?: string; message?: { content?: string } }[];
  };
  const choice = out.choices?.[0];
  console.info("scan-receipt", { userId, model: out.model, usage: out.usage });

  return NextResponse.json({
    text: choice?.message?.content ?? "",
    finishReason: choice?.finish_reason ?? null,
    model: out.model ?? null,
    costUsd: typeof out.usage?.cost === "number" ? out.usage.cost : null,
    tokens: (out.usage?.prompt_tokens ?? 0) + (out.usage?.completion_tokens ?? 0),
  });
}
