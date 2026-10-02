"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getReceiptUrl } from "@/lib/receipts";

/** Shows a saved receipt photo (stored in DigitalOcean Spaces). */
export function ReceiptViewer({
  path,
  title,
  onOpenChange,
}: {
  path: string | null;
  title?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setUrl(null);
    setError(false);
    getReceiptUrl(path)
      .then((u) => !cancelled && setUrl(u))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [path]);

  return (
    <Dialog open={!!path} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{title ?? "Receipt"}</DialogTitle>
        </DialogHeader>
        <div className="bg-muted/50 flex min-h-[240px] items-center justify-center overflow-hidden rounded-2xl">
          {error ? (
            <p className="text-muted-foreground p-6 text-center text-sm">
              This receipt photo couldn&apos;t be loaded.
            </p>
          ) : url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={title ?? "Receipt"}
              className="max-h-[70dvh] w-full object-contain"
            />
          ) : (
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
