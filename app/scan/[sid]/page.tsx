"use client";

import { useCallback, useRef, useState } from "react";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle2, Loader2, AlertCircle, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImageForSession, submitImageToSession } from "@/lib/scanHandoff";

type Status = "idle" | "compressing" | "sending" | "sent" | "error";

export default function PhoneScanPage({ params }: { params: Promise<{ sid: string }> }) {
  const { sid } = use(params);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setError(null);
      try {
        // One at a time: each photo is its own upload, so a failure keeps the ones already sent
        for (const file of Array.from(files)) {
          setStatus("compressing");
          const { dataUrl, mimeType } = await compressImageForSession(file);

          setStatus("sending");
          await submitImageToSession(sid, dataUrl, mimeType);
          setPreviews((prev) => [...prev, dataUrl]);
        }
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

  const busy = status === "compressing" || status === "sending";

  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Scan receipt</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Take or pick one or more photos of your receipt. They will appear on the device that
            showed you the QR code.
          </p>
        </div>

        {previews.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((src, index) => (
              <div key={index} className="bg-muted overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Receipt photo ${index + 1}`}
                  className="h-28 w-full object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {status === "sent" && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <p className="text-base font-semibold">
              {previews.length} photo{previews.length === 1 ? "" : "s"} sent
            </p>
            <p className="text-muted-foreground text-sm">
              Long receipt? Add more photos below, or close this tab and review them on the other
              device.
            </p>
          </div>
        )}

        <>
          <div className="space-y-2">
            <Button
              type="button"
              size="lg"
              className="h-14 w-full text-base"
              onClick={() => cameraInputRef.current?.click()}
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
                  {previews.length > 0 ? "Take another photo" : "Take photo"}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 w-full text-sm"
              onClick={() => libraryInputRef.current?.click()}
              disabled={busy}
            >
              <ImageIcon className="h-5 w-5" />
              Choose from library (multiple)
            </Button>
          </div>
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
          <input
            ref={libraryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
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
      </div>
    </main>
  );
}
