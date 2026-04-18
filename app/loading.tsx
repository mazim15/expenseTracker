import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <LoadingSkeleton />
    </div>
  );
}
