import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6", 
  lg: "h-8 w-8",
  xl: "h-12 w-12"
};

export function LoadingSpinner({ 
  size = "md", 
  className,
  label = "Loading..." 
}: LoadingSpinnerProps) {
  return (
    <div 
      className="flex items-center justify-center"
      role="status" 
      aria-label={label}
    >
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-current border-t-transparent",
          sizeClasses[size],
          className
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function PageLoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <LoadingSpinner size="xl" className="text-primary" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

export function InlineLoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center space-x-2 py-4">
      <LoadingSpinner size="sm" className="text-primary" />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
}

export function ChartLoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <LoadingSpinner size="lg" className="text-primary" label="Loading chart data" />
    </div>
  );
}