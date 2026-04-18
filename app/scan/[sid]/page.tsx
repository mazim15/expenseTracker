"use client";

import { useCallback, useRef, useState } from "react";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle2, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImageForSession, submitImageToSession } from "@/lib/scanHandoff";

type Status = "idle" | "compressing" | "sending" | "sent" | "error";

export default function PhoneScanPage({ params }: { params: Promise<{ sid: string }> }) {
  const { sid } = use(params);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      setError(null);
      try {
        setStatus("compressing");
        const { dataUrl, mimeType } = await compressImageForSession(file);
        setPreview(dataUrl);

        setStatus("sending");
        await submitImageToSession(sid, dataUrl, mimeType);
        setStatus("sent");
      } catch (err) {
        setStatus("error");
        const message = err instanceof Error ? err.message : "Could not send photo";
        if (
          message.toLowerCase().includes("permission") ||
          message.toLowerCase().includes("insufficient")
        ) {
          setError("This code has expired or is no longer valid. Ask for a fresh QR code.");
        } else {
          setError(message);
        }
      }
    },
    [sid],
  );

  const reset = () => {
    setStatus("idle");
    setError(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const busy = status === "compressing" || status === "sending";

  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Scan receipt</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Take a photo of your receipt. It will appear on the device that showed you the QR code.
          </p>
        </div>

        {preview && (
          <div className="bg-muted overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Receipt preview"
              className="max-h-[320px] w-full object-contain"
            />
          </div>
        )}

        {status === "sent" ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            <div>
              <p className="text-base font-semibold">Sent</p>
              <p className="text-muted-foreground mt-1 text-sm">
                You can close this tab. Review the photo on the other device.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
              Send another
            </Button>
          </div>
        ) : (
          <>
            <Button
              type="button"
              size="lg"
              className="h-14 w-full text-base"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {busy ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {status === "compressing" ? "Processing…" : "Sending…"}
                </>
              ) : (
                <>
                  <Camera className="h-5 w-5" />
                  Take photo
                </>
              )}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {error && (
              <div
                className={cn(
                  "border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
                )}
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
