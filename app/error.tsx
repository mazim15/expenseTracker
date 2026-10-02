"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/layout/StatusScreen";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <StatusScreen
      image="/illustrations/error.png"
      fallbackIcon={<AlertTriangle />}
      title="Something went wrong!"
      description="An unexpected error occurred. Please try again or contact support if the problem persists."
      actions={
        <>
          <Button onClick={reset}>
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            Go home
          </Button>
        </>
      }
    >
      {process.env.NODE_ENV === "development" && (
        <details className="bg-card rounded-2xl border p-3 text-left text-sm">
          <summary className="cursor-pointer font-medium">Error Details</summary>
          <pre className="mt-2 text-xs whitespace-pre-wrap">{error.message}</pre>
          {error.digest && (
            <p className="text-muted-foreground mt-1 text-xs">Error ID: {error.digest}</p>
          )}
        </details>
      )}
    </StatusScreen>
  );
}
