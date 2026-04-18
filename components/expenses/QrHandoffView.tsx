"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Copy } from "lucide-react";

type QrHandoffViewProps = {
  url: string;
  expiresAt: Date;
  onBack: () => void;
};

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function QrHandoffView({ url, expiresAt, onBack }: QrHandoffViewProps) {
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = expiresAt.getTime() - now;
  const expired = remaining <= 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be blocked; silent
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="bg-background rounded-lg border p-4">
        <QRCodeSVG value={url} size={200} level="M" />
      </div>

      <div className="text-center">
        <p className="text-sm font-medium">Scan with your phone camera</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Open this link on your phone, take the photo, and it will appear here.
        </p>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="bg-muted hover:bg-muted/80 text-muted-foreground flex max-w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors"
      >
        <span className="truncate font-mono">{url}</span>
        {copied ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
        ) : (
          <Copy className="h-3.5 w-3.5 shrink-0" />
        )}
      </button>

      <div
        className={
          expired
            ? "text-destructive text-sm font-medium"
            : "text-muted-foreground flex items-center gap-2 text-sm"
        }
      >
        {expired ? (
          "Code expired — go back and try again."
        ) : (
          <>
            <span className="bg-primary/60 relative inline-flex h-2 w-2">
              <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
              <span className="bg-primary relative inline-flex h-2 w-2 rounded-full" />
            </span>
            <span>Waiting for phone… expires in {formatRemaining(remaining)}</span>
          </>
        )}
      </div>

      <Button variant="outline" size="sm" onClick={onBack} className="mt-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
    </div>
  );
}
