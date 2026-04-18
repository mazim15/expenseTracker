import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export default function AppLoading() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="space-y-2">
        <div className="bg-muted h-8 w-48 animate-pulse rounded" />
        <div className="bg-muted h-4 w-96 animate-pulse rounded" />
      </div>
      <LoadingSkeleton />
    </div>
  );
}
