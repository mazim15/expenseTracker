"use client";

import { ReactNode, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fadeUp, stagger } from "@/lib/motion";

interface EmptyStateProps {
  icon: ReactNode;
  /** Illustration path under /public, e.g. "/illustrations/empty-expenses.png". Falls back to `icon` if missing. */
  image?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  variant?: "default" | "minimal" | "card";
}

export function EmptyState({
  icon,
  image,
  title,
  description,
  actionLabel,
  onAction,
  className,
  variant = "default",
}: EmptyStateProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const variantClasses = {
    default: "py-14 px-6",
    minimal: "py-8 px-4",
    card: "py-12 px-8 rounded-3xl border bg-card shadow-soft",
  };

  const showImage = image && !imageFailed;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger(0.08)}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        variantClasses[variant],
        className,
      )}
    >
      <motion.div variants={fadeUp} className="relative mb-5">
        {showImage ? (
          <Image
            src={image}
            alt=""
            width={variant === "minimal" ? 112 : 168}
            height={variant === "minimal" ? 112 : 168}
            className="animate-float drop-shadow-xl"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <>
            <div className="bg-primary/15 absolute inset-0 scale-125 rounded-full blur-2xl" />
            <div className="bg-primary/10 text-primary relative rounded-3xl p-5 [&>svg]:h-8 [&>svg]:w-8">
              {icon}
            </div>
          </>
        )}
      </motion.div>

      <motion.div variants={fadeUp} className="max-w-sm space-y-2">
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </motion.div>

      {actionLabel && onAction && (
        <motion.div variants={fadeUp} className="mt-6">
          <Button onClick={onAction}>{actionLabel}</Button>
        </motion.div>
      )}
    </motion.div>
  );
}
