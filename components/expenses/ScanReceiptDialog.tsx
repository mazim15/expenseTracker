"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Camera, Smartphone, X, ImageIcon, AlertCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthContext";
import { createScanSession, deleteScanSession, subscribeToScanSession } from "@/lib/scanHandoff";
import QrHandoffView from "./QrHandoffView";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGES = 8;

export type ScanReceiptImage = {
  dataUrl: string;
  mimeType: string;
  name: string;
  size: number;
};

export type ScanReceiptResult = {
  images: { dataUrl: string; mimeType: string }[];
};

type ScanReceiptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnalyze: (result: ScanReceiptResult) => Promise<void> | void;
  isAnalyzing: boolean;
};

type Mode = "pick" | "qr" | "preview";

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Unsupported file type. Use JPEG, PNG, WebP, or HEIC.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "Image is over 10MB. Try a smaller photo or crop the receipt.";
  }
  return null;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export default function ScanReceiptDialog({
  open,
  onOpenChange,
  onAnalyze,
  isAnalyzing,
}: ScanReceiptDialogProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("pick");
  const [images, setImages] = useState<ScanReceiptImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = useState<Date | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setMode("pick");
    setImages([]);
    setError(null);
    setIsDragging(false);
  }, []);

  const cancelSession = useCallback(async () => {
    if (qrSessionId) {
      await deleteScanSession(qrSessionId);
      setQrSessionId(null);
      setQrUrl(null);
      setQrExpiresAt(null);
    }
  }, [qrSessionId]);

  useEffect(() => {
    if (!open) {
      if (qrSessionId) deleteScanSession(qrSessionId);
      setQrSessionId(null);
      setQrUrl(null);
      setQrExpiresAt(null);
      reset();
    }
  }, [open, qrSessionId, reset]);

  const handleFiles = useCallback(
    async (incoming: FileList | File[] | null | undefined) => {
      if (!incoming) return;
      const list = Array.from(incoming);
      if (list.length === 0) return;

      const accepted: ScanReceiptImage[] = [];
      let firstError: string | null = null;

      for (const file of list) {
        if (images.length + accepted.length >= MAX_IMAGES) {
          firstError = `You can only attach up to ${MAX_IMAGES} images per receipt.`;
          break;
        }
        const msg = validateFile(file);
        if (msg) {
          firstError = firstError ?? msg;
          continue;
        }
        try {
          const dataUrl = await readAsDataUrl(file);
          accepted.push({
            dataUrl,
            mimeType: file.type,
            name: file.name,
            size: file.size,
          });
        } catch (err) {
          firstError = firstError ?? (err instanceof Error ? err.message : "Could not read file");
        }
      }

      if (accepted.length > 0) {
        setImages((prev) => [...prev, ...accepted]);
        setMode("preview");
      }
      setError(firstError);
    },
    [images.length],
  );

  useEffect(() => {
    if (!qrSessionId) return;
    const unsubscribe = subscribeToScanSession(
      qrSessionId,
      async (data) => {
        if (!data) return;
        if (data.status === "received" && data.imageData) {
          const dataUrl = data.imageData;
          const mime = data.mimeType || "image/jpeg";
          setImages((prev) => [
            ...prev,
            {
              dataUrl,
              mimeType: mime,
              name: "receipt-from-phone.jpg",
              size: Math.round((dataUrl.length * 3) / 4),
            },
          ]);
          setMode("preview");
          setError(null);
          await deleteScanSession(qrSessionId);
          setQrSessionId(null);
          setQrUrl(null);
          setQrExpiresAt(null);
        }
      },
      (err) => {
        setError(err.message);
      },
    );
    return unsubscribe;
  }, [qrSessionId]);

  const handleUsePhone = async () => {
    if (!user) {
      setError("Please sign in to use phone handoff.");
      return;
    }
    setError(null);
    try {
      const { sessionId, expiresAt } = await createScanSession(user.uid);
      const origin =
        process.env.NEXT_PUBLIC_APP_URL ||
        (typeof window !== "undefined" ? window.location.origin : "");
      setQrSessionId(sessionId);
      setQrUrl(`${origin}/scan/${sessionId}`);
      setQrExpiresAt(expiresAt);
      setMode("qr");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start phone session");
    }
  };

  const handleQrBack = async () => {
    await cancelSession();
    setMode(images.length > 0 ? "preview" : "pick");
  };

  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAnalyzing) setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isAnalyzing) return;
    handleFiles(e.dataTransfer.files);
  };

  const handleAnalyzeClick = async () => {
    if (images.length === 0) return;
    await onAnalyze({
      images: images.map(({ dataUrl, mimeType }) => ({ dataUrl, mimeType })),
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) setMode("pick");
      return next;
    });
  };

  const canAddMore = images.length < MAX_IMAGES && !isAnalyzing;

  return (
    <Dialog open={open} onOpenChange={(next) => (!isAnalyzing ? onOpenChange(next) : null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Scan receipt</DialogTitle>
          <DialogDescription>
            Upload one or more photos of a receipt. If your receipt is long, take overlapping shots
            and we&apos;ll combine them into a single expense.
          </DialogDescription>
        </DialogHeader>

        {mode === "pick" && (
          <div
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/50",
            )}
          >
            <div className="bg-muted mb-3 rounded-full p-3">
              <ImageIcon className="text-muted-foreground h-5 w-5" />
            </div>
            <p className="text-sm font-medium">Drag and drop receipt images</p>
            <p className="text-muted-foreground mt-1 text-xs">
              JPEG, PNG, WebP, or HEIC · up to 10MB each · {MAX_IMAGES} max
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={isAnalyzing}
              >
                <Upload className="h-4 w-4" />
                Choose files
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isAnalyzing}
              >
                <Camera className="h-4 w-4" />
                Use camera
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUsePhone}
                disabled={isAnalyzing || !user}
              >
                <Smartphone className="h-4 w-4" />
                Use phone
              </Button>
            </div>
          </div>
        )}

        {mode === "qr" && qrUrl && qrExpiresAt && (
          <QrHandoffView url={qrUrl} expiresAt={qrExpiresAt} onBack={handleQrBack} />
        )}

        {mode === "preview" && images.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {images.map((img, index) => (
                <div
                  key={`${img.name}-${index}`}
                  className="bg-muted relative overflow-hidden rounded-md border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.dataUrl}
                    alt={`Receipt ${index + 1}`}
                    className="h-32 w-full object-cover"
                  />
                  {!isAnalyzing && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removeImage(index)}
                      aria-label={`Remove image ${index + 1}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  <div className="bg-background/80 text-muted-foreground absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[10px]">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>
                {images.length} image{images.length === 1 ? "" : "s"} ·{" "}
                {(images.reduce((acc, i) => acc + i.size, 0) / 1024).toFixed(0)} KB total
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                  disabled={!canAddMore}
                >
                  <Plus className="h-4 w-4" />
                  Add files
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={!canAddMore}
                >
                  <Camera className="h-4 w-4" />
                  Add photo
                </Button>
              </div>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {error && (
          <div className="border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAnalyzing}>
            Cancel
          </Button>
          <Button
            onClick={handleAnalyzeClick}
            disabled={mode !== "preview" || images.length === 0 || isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Analyze receipt
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
