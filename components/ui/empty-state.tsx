import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  variant?: "default" | "minimal" | "card";
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className,
  variant = "default"
}: EmptyStateProps) {
  const baseClasses = "flex flex-col items-center justify-center text-center animate-fade-in";
  
  const variantClasses = {
    default: "py-16 px-6",
    minimal: "py-8 px-4",
    card: "py-12 px-8 rounded-lg border bg-card"
  };

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)}>
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse-slow" />
        <div className="relative rounded-full bg-gradient-to-br from-muted via-muted/80 to-muted/60 p-6 shadow-lg">
          <div className="text-muted-foreground/80 [&>svg]:h-8 [&>svg]:w-8">
            {icon}
          </div>
        </div>
      </div>
      
      <div className="space-y-3 max-w-md">
        <h3 className="text-xl font-semibold tracking-tight">
          {title}
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
      
      {actionLabel && onAction && (
        <div className="mt-8">
          <Button 
            onClick={onAction}
            className="hover-lift shadow-md"
            size="lg"
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
} 