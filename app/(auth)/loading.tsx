export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-6">
        <div className="space-y-2 text-center">
          <div className="h-8 w-48 bg-muted rounded mx-auto animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded mx-auto animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </div>
          <div className="h-10 w-full bg-primary/20 rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}