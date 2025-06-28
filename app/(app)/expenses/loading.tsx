export default function ExpensesLoading() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          <div className="h-4 w-48 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-primary/20 rounded animate-pulse" />
      </div>
      
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-5 w-40 bg-muted rounded animate-pulse" />
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-6 w-20 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}