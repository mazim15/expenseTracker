// Receipt photos: upload (POST), short-lived view link (GET ?path=) and delete (DELETE ?path=).
// Each call is checked against the signed-in Firebase user; files live in DigitalOcean Spaces.
import { NextResponse } from "next/server";
import { z } from "zod";
import { userIdFromRequest } from "@/lib/server/auth";
import {
  ownsReceiptPath,
  putReceipt,
  receiptViewUrl,
  removeReceipt,
} from "@/lib/server/receiptStore";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;

const Body = z.object({
  dataUrl: z.string().regex(/^data:image\/jpeg;base64,/, "Receipt must be a JPEG"),
});

function error(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** The signed-in user and, for GET/DELETE, a `path` they own. */
async function authorize(req: Request, needPath: boolean) {
  const userId = await userIdFromRequest(req);
  if (!userId) return { res: error(401, "Please sign in again.") };
  if (!needPath) return { userId };
  const path = new URL(req.url).searchParams.get("path") ?? "";
  if (!ownsReceiptPath(userId, path)) return { res: error(403, "Not your receipt.") };
  return { userId, path };
}

export async function POST(req: Request) {
  const auth = await authorize(req, false);
  if (auth.res) return auth.res;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error(400, parsed.error.issues[0]?.message ?? "Invalid request");
  const jpeg = Buffer.from(parsed.data.dataUrl.split(",")[1] ?? "", "base64");
  if (jpeg.length === 0 || jpeg.length > MAX_BYTES)
    return error(413, "Receipt photo is too large.");

  try {
    return NextResponse.json({ path: await putReceipt(auth.userId!, jpeg) });
  } catch (e) {
    console.error("receipts: upload failed", e);
    return error(502, "Couldn't save the receipt photo.");
  }
}

export async function GET(req: Request) {
  const auth = await authorize(req, true);
  if (auth.res) return auth.res;
  try {
    return NextResponse.json({ url: await receiptViewUrl(auth.path!) });
  } catch (e) {
    console.error("receipts: sign failed", e);
    return error(502, "Couldn't load the receipt photo.");
  }
}

export async function DELETE(req: Request) {
  const auth = await authorize(req, true);
  if (auth.res) return auth.res;
  try {
    await removeReceipt(auth.path!);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("receipts: delete failed", e);
    return error(502, "Couldn't delete the receipt photo.");
  }
}
