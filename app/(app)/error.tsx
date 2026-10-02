"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/layout/StatusScreen";
import { handleError } from "@/lib/utils/errorHandler";
import { AlertTriangle } from "lucide-react";

export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    handleError(error, "app-segment");
  }, [error]);

  return (
    <StatusScreen
      className="min-h-[70vh] rounded-3xl"
      image="/illustrations/error.png"
      fallbackIcon={<AlertTriangle />}
      title="Something went wrong"
      description="We hit an unexpected error loading this page. You can try again or head back to your dashboard."
      actions={
        <>
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
          <Button asChild>
            <a href="/dashboard">Go to dashboard</a>
          </Button>
        </>
      }
    />
  );
}
