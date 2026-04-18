import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="space-y-3">
        <div className="relative overflow-hidden">
          <Skeleton className="h-[125px] w-full rounded-xl" />
          <div className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
        <div className="space-y-2">
          <div className="relative overflow-hidden">
            <Skeleton className="h-4 w-[250px]" />
            <div className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
          <div className="relative overflow-hidden">
            <Skeleton className="h-4 w-[200px]" />
            <div className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} delay={i * 100} />
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div className="animate-fade-in space-y-3" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative overflow-hidden">
        <Skeleton className="h-[125px] w-full rounded-xl" />
        <div className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>
      <div className="space-y-2">
        <div className="relative overflow-hidden">
          <Skeleton className="h-4 w-[250px]" />
          <div className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
        <div className="relative overflow-hidden">
          <Skeleton className="h-4 w-[200px]" />
          <div className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </div>
    </div>
  );
}

export function ExpenseListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-[250px] w-full rounded-xl" />
      <div className="flex justify-center space-x-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}
