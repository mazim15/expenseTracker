"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const percentage = Math.min(Math.max(0, (value / max) * 100), 100);
    
    // Determine color based on percentage
    let colorClass = "bg-primary";
    if (percentage > 90) colorClass = "bg-destructive";
    else if (percentage > 75) colorClass = "bg-amber-500";
    
    return (
      <div
        ref={ref}
        className={cn(
          "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
          className
        )}
        {...props}
      >
        <div
          className={`h-full w-full flex-1 transition-all duration-300 ease-in-out ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white mix-blend-difference">
          {Math.round(percentage)}%
        </span>
      </div>
    );
  }
);

Progress.displayName = "Progress";

export { Progress }; 