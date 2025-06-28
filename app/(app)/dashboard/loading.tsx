export default function DashboardLoading() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse" />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6 space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-8 w-20 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-6 space-y-4">
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
        <div className="rounded-lg border p-6 space-y-4">
          <div className="h-6 w-40 bg-muted rounded animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}