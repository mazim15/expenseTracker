import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: React.ReactNode;
  trend?: {
    value: number;
    isPositive?: boolean;
  };
  /** Tint for the icon tile, e.g. "bg-primary/12 text-primary". */
  tone?: string;
  /** Optional decoration under the value, such as a sparkline. */
  children?: React.ReactNode;
  className?: string;
};

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  tone = "bg-primary/12 text-primary",
  children,
  className,
}: StatCardProps) {
  return (
    <Card variant="interactive" className={cn("relative overflow-hidden p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        {Icon ? (
          <span
            className={cn("inline-flex h-10 w-10 items-center justify-center rounded-2xl", tone)}
          >
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</div>
      <div className="text-muted-foreground mt-1.5 flex items-center gap-2 text-xs">
        {trend ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              trend.isPositive
                ? "bg-success/12 text-success"
                : "bg-destructive/12 text-destructive",
            )}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value.toFixed(1)}%
          </span>
        ) : null}
        {hint}
      </div>
      {children}
    </Card>
  );
}
