import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: React.ReactNode;
  trend?: {
    value: number;
    isPositive?: boolean;
  };
  className?: string;
};

export function StatCard({ label, value, icon: Icon, hint, trend, className }: StatCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground flex items-center justify-between text-sm font-medium">
          <span>{label}</span>
          {Icon ? (
            <span className="bg-muted text-foreground/70 inline-flex h-8 w-8 items-center justify-center rounded-full">
              <Icon className="h-4 w-4" />
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          {trend ? (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                trend.isPositive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                  : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
              )}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value.toFixed(1)}%
            </span>
          ) : null}
          {hint}
        </div>
      </CardContent>
    </Card>
  );
}
