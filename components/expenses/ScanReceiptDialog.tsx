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
import { Loader2, Upload, Camera, Smartphone, X, ImageIcon, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthContext";
import { createScanSession, deleteScanSession, subscribeToScanSession } from "@/lib/scanHandoff";
import QrHandoffView from "./QrHandoffView";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export type ScanReceiptResult = {
  dataUrl: string;
  mimeType: string;
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

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/data:([^;]+);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export default function ScanReceiptDialog({
  open,
  onOpenChange,
  onAnalyze,
  isAnalyzing,
}: ScanReceiptDialogProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = useState<Date | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setMode("pick");
    setFile(null);
    setPreview(null);
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

  useEffect(() => {
    if (!qrSessionId) return;
    const unsubscribe = subscribeToScanSession(
      qrSessionId,
      async (data) => {
        if (!data) return;
        if (data.status === "received" && data.imageData) {
          const dataUrl = data.imageData;
          const mime = data.mimeType || "image/jpeg";
          try {
            const blob = dataUrlToBlob(dataUrl);
            const synthetic = new File([blob], "receipt-from-phone.jpg", { type: mime });
            setFile(synthetic);
            setPreview(dataUrl);
            setMode("preview");
            setError(null);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load photo from phone");
          } finally {
            await deleteScanSession(qrSessionId);
            setQrSessionId(null);
            setQrUrl(null);
            setQrExpiresAt(null);
          }
        }
      },
      (err) => {
        setError(err.message);
      },
    );
    return unsubscribe;
  }, [qrSessionId]);

  const handleFile = useCallback(async (chosen: File | null | undefined) => {
    if (!chosen) return;
    const msg = validateFile(chosen);
    if (msg) {
      setError(msg);
      setFile(null);
      setPreview(null);
      return;
    }
    setError(null);
    setFile(chosen);
    try {
      const url = await readAsDataUrl(chosen);
      setPreview(url);
      setMode("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read file");
    }
  }, []);

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
    setMode("pick");
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
    const dropped = e.dataTransfer.files?.[0];
    handleFile(dropped);
  };

  const handleAnalyzeClick = async () => {
    if (!file || !preview) return;
    await onAnalyze({ dataUrl: preview, mimeType: file.type });
  };

  const removePreview = () => {
    setFile(null);
    setPreview(null);
    setMode("pick");
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!isAnalyzing ? onOpenChange(next) : null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Scan receipt</DialogTitle>
          <DialogDescription>
            Upload a photo of a receipt and we&apos;ll extract the line items for review.
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
            <p className="text-sm font-medium">Drag and drop a receipt image</p>
            <p className="text-muted-foreground mt-1 text-xs">
              JPEG, PNG, WebP, or HEIC · up to 10MB
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
                Choose file
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
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        )}

        {mode === "qr" && qrUrl && qrExpiresAt && (
          <QrHandoffView url={qrUrl} expiresAt={qrExpiresAt} onBack={handleQrBack} />
        )}

        {mode === "preview" && preview && (
          <div className="space-y-3">
            <div className="bg-muted relative overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Receipt preview"
                className="max-h-[360px] w-full object-contain"
              />
              {!isAnalyzing && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={removePreview}
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {file && (
              <p className="text-muted-foreground truncate text-xs">
                {file.name} · {(file.size / 1024).toFixed(0)} KB
              </p>
            )}
          </div>
        )}

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
            disabled={mode !== "preview" || !file || isAnalyzing}
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
