"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/layout/StatusScreen";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <StatusScreen
      image="/illustrations/not-found.png"
      fallbackIcon={<FileQuestion />}
      code="404"
      title="This page wandered off"
      description="The page you're looking for doesn't exist or has been moved."
      actions={
        <>
          <Button asChild>
            <Link href="/">
              <Home className="h-4 w-4" />
              Go home
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
        </>
      }
    />
  );
}
