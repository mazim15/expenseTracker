import {
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export const SESSION_TTL_MS = 5 * 60 * 1000;
export const MAX_IMAGE_BYTES = 850_000;
const MAX_IMAGE_EDGE = 1400;

export type ScanSessionStatus = "waiting" | "received";

export type ScanSessionDoc = {
  createdBy: string;
  createdAt?: Timestamp;
  expiresAt: Timestamp;
  status: ScanSessionStatus;
  imageData?: string;
  mimeType?: string;
};

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export async function createScanSession(userId: string): Promise<{
  sessionId: string;
  expiresAt: Date;
}> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await setDoc(doc(db, "scan-sessions", sessionId), {
    createdBy: userId,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    status: "waiting" as ScanSessionStatus,
  });
  return { sessionId, expiresAt };
}

export async function deleteScanSession(sessionId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "scan-sessions", sessionId));
  } catch {
    // Best-effort cleanup; ignore if already gone or rule-denied
  }
}

export function subscribeToScanSession(
  sessionId: string,
  onUpdate: (data: ScanSessionDoc | null) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, "scan-sessions", sessionId),
    (snap) => {
      onUpdate(snap.exists() ? (snap.data() as ScanSessionDoc) : null);
    },
    (err) => onError?.(err),
  );
}

export async function submitImageToSession(
  sessionId: string,
  imageData: string,
  mimeType: string,
): Promise<void> {
  await updateDoc(doc(db, "scan-sessions", sessionId), {
    imageData,
    mimeType,
    status: "received" as ScanSessionStatus,
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not decode image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function canvasToDataUrl(img: HTMLImageElement, quality: number): string {
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export async function compressImageForSession(
  file: File,
): Promise<{ dataUrl: string; mimeType: string }> {
  const img = await loadImage(file);
  let dataUrl = canvasToDataUrl(img, 0.7);
  if (dataUrl.length > MAX_IMAGE_BYTES) {
    dataUrl = canvasToDataUrl(img, 0.55);
  }
  if (dataUrl.length > MAX_IMAGE_BYTES) {
    dataUrl = canvasToDataUrl(img, 0.4);
  }
  if (dataUrl.length > MAX_IMAGE_BYTES) {
    throw new Error("Image is too large even after compression. Try a smaller photo.");
  }
  return { dataUrl, mimeType: "image/jpeg" };
}
