import { auth } from "@/lib/firebase";

const MAX_SIDE = 1600;
const QUALITY = 0.8;

async function drawScaled(dataUrl: string): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Downscales an image data URL to a JPEG data URL (longest side ≤ 1600px). */
export async function compressImage(dataUrl: string): Promise<string> {
  return (await drawScaled(dataUrl)).toDataURL("image/jpeg", QUALITY);
}

async function receiptsApi(method: string, init: { path?: string; body?: unknown } = {}) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Please sign in again.");
  const query = init.path ? `?path=${encodeURIComponent(init.path)}` : "";
  const res = await fetch(`/api/receipts${query}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(init.body !== undefined && { body: JSON.stringify(init.body) }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    path?: string;
    url?: string;
    error?: string;
  };
  if (!res.ok) throw new Error(data.error || `Receipt request failed (${res.status})`);
  return data;
}

/** Saves a receipt photo (DigitalOcean Spaces, via /api/receipts) and returns its path. */
export async function uploadReceipt(dataUrl: string): Promise<string> {
  const { path } = await receiptsApi("POST", { body: { dataUrl: await compressImage(dataUrl) } });
  if (!path) throw new Error("Receipt upload failed");
  return path;
}

/** A short-lived link to view a saved receipt photo. */
export async function getReceiptUrl(path: string): Promise<string> {
  const { url } = await receiptsApi("GET", { path });
  if (!url) throw new Error("Receipt link failed");
  return url;
}

/** Best-effort delete; failures are logged, never thrown. */
export async function deleteReceipt(path: string): Promise<void> {
  try {
    await receiptsApi("DELETE", { path });
  } catch (error) {
    console.error("Failed to delete receipt:", error);
  }
}
