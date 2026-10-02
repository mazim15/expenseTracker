"use client";

import { useState } from "react";
import Image from "next/image";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

/** App mark. Uses /brand/logo-mark.png once it exists, otherwise a gradient tile with an icon. */
export function BrandMark({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <Image
        src="/brand/logo-mark.png"
        alt=""
        width={36}
        height={36}
        className={cn("h-9 w-9 shrink-0", className)}
        onError={() => setFailed(true)}
        priority
      />
    );
  }

  return (
    <span
      className={cn(
        "bg-hero shadow-soft inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
        className,
      )}
    >
      <Wallet className="h-[18px] w-[18px]" />
    </span>
  );
}

export function BrandLogo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark />
      {!collapsed && (
        <span className="text-[15px] font-extrabold tracking-tight">
          Expense<span className="text-primary">Tracker</span>
        </span>
      )}
    </span>
  );
}

/** Full-screen loader shown while auth resolves. */
export function BrandLoader() {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="bg-primary/30 absolute inset-0 animate-ping rounded-2xl" />
        <BrandMark className="relative h-12 w-12" />
      </div>
      <p className="text-muted-foreground animate-pulse text-sm font-medium">Loading your money…</p>
    </div>
  );
}
