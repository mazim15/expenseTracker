"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowUpRight, Info, Sparkles, ThumbsUp } from "lucide-react";
import { fadeUp, stagger } from "@/lib/motion";
import { Insight, InsightTone } from "@/lib/insights";
import { cn } from "@/lib/utils";

const TONE: Record<InsightTone, { icon: typeof Info; tile: string }> = {
  warn: { icon: AlertTriangle, tile: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  good: { icon: ThumbsUp, tile: "bg-primary/12 text-primary" },
  info: { icon: Info, tile: "bg-sky-500/12 text-sky-700 dark:text-sky-300" },
};

export function InsightList({
  insights,
  columns = 2,
  className,
}: {
  insights: Insight[];
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  if (insights.length === 0) {
    return (
      <div className="text-muted-foreground flex items-center gap-3 rounded-2xl border border-dashed p-4 text-sm">
        <Sparkles className="text-primary h-5 w-5 shrink-0" />
        Add a few more expenses and insights about your spending will show up here.
      </div>
    );
  }

  return (
    <motion.ul
      initial="hidden"
      animate="visible"
      variants={stagger(0.05)}
      className={cn(
        "grid gap-3",
        columns >= 2 && "sm:grid-cols-2",
        columns === 3 && "lg:grid-cols-3",
        className,
      )}
    >
      {insights.map((insight) => {
        const { icon: Icon, tile } = TONE[insight.tone];
        const body = (
          <>
            <span
              className={cn(
                "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                tile,
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug font-bold">{insight.title}</p>
              <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{insight.body}</p>
            </div>
            {insight.href && (
              <ArrowUpRight className="text-muted-foreground h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            )}
          </>
        );
        const base = "bg-muted/40 flex items-start gap-3 rounded-2xl p-3.5 transition-colors";
        return (
          <motion.li key={insight.id} variants={fadeUp}>
            {insight.href ? (
              <Link href={insight.href} className={cn(base, "group hover:bg-muted/70")}>
                {body}
              </Link>
            ) : (
              <div className={base}>{body}</div>
            )}
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
