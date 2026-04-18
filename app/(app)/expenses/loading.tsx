export default function ExpensesLoading() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="bg-muted h-8 w-32 animate-pulse rounded" />
          <div className="bg-muted h-4 w-48 animate-pulse rounded" />
        </div>
        <div className="bg-primary/20 h-10 w-32 animate-pulse rounded" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="bg-muted h-5 w-40 animate-pulse rounded" />
                <div className="bg-muted h-4 w-24 animate-pulse rounded" />
              </div>
              <div className="bg-muted h-6 w-20 animate-pulse rounded" />
            </div>
            <div className="bg-muted h-4 w-64 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
