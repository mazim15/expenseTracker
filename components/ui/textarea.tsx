import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "bg-input/60 hover:bg-input placeholder:text-muted-foreground focus-visible:ring-primary/40 focus-visible:border-primary focus-visible:bg-card flex min-h-[96px] w-full rounded-xl border border-transparent px-3.5 py-2.5 text-sm transition-colors duration-200 focus-visible:ring-4 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
