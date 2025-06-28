import { LoadingSkeleton } from '@/components/ui/loading-skeleton'

export default function Loading() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <LoadingSkeleton />
    </div>
  )
}