import { LoadingSkeleton } from '@/components/ui/loading-skeleton'

export default function AppLoading() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-4 w-96 bg-muted rounded animate-pulse" />
      </div>
      <LoadingSkeleton />
    </div>
  )
}