export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-6">
        <div className="space-y-2 text-center">
          <div className="bg-muted mx-auto h-8 w-48 animate-pulse rounded" />
          <div className="bg-muted mx-auto h-4 w-64 animate-pulse rounded" />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="bg-muted h-4 w-16 animate-pulse rounded" />
            <div className="bg-muted h-10 w-full animate-pulse rounded" />
          </div>
          <div className="space-y-2">
            <div className="bg-muted h-4 w-20 animate-pulse rounded" />
            <div className="bg-muted h-10 w-full animate-pulse rounded" />
          </div>
          <div className="bg-primary/20 h-10 w-full animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}
