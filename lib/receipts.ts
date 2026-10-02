import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

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

/** Downscales an image data URL to a JPEG blob (longest side ≤ 1600px). */
async function compress(dataUrl: string): Promise<Blob> {
  const canvas = await drawScaled(dataUrl);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode receipt"))),
      "image/jpeg",
      QUALITY,
    ),
  );
}

/** Saves a receipt photo and returns its Storage path (to store on the expense). */
export async function uploadReceipt(userId: string, dataUrl: string): Promise<string> {
  const path = `receipts/${userId}/${crypto.randomUUID()}.jpg`;
  await uploadBytes(ref(storage, path), await compress(dataUrl), { contentType: "image/jpeg" });
  return path;
}

export function getReceiptUrl(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path));
}

/** Best-effort delete; a missing file is not an error. */
export async function deleteReceipt(path: string): Promise<void> {
  try {
    await deleteObject(ref(storage, path));
  } catch (error) {
    if ((error as { code?: string }).code !== "storage/object-not-found") {
      console.error("Failed to delete receipt:", error);
    }
  }
}
