export default function DashboardLoading() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="space-y-2">
        <div className="bg-muted h-8 w-32 animate-pulse rounded" />
        <div className="bg-muted h-4 w-64 animate-pulse rounded" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-6">
            <div className="bg-muted h-4 w-24 animate-pulse rounded" />
            <div className="bg-muted h-8 w-20 animate-pulse rounded" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-lg border p-6">
          <div className="bg-muted h-6 w-32 animate-pulse rounded" />
          <div className="bg-muted h-64 animate-pulse rounded" />
        </div>
        <div className="space-y-4 rounded-lg border p-6">
          <div className="bg-muted h-6 w-40 animate-pulse rounded" />
          <div className="bg-muted h-64 animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}
