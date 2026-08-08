import { Skeleton } from "@/components/ui/skeleton";

/**
 * Suspense fallback for lazily-loaded routes. Mirrors the common page shell
 * (header strip + content cards) so the swap to the real page feels instant
 * rather than showing a bare spinner.
 */
const RouteFallback = () => (
  <div className="min-h-screen bg-background pb-24" role="status" aria-live="polite" aria-busy="true">
    <span className="sr-only">Loading page…</span>
    <div className="border-b border-border bg-card">
      <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-5 w-40" />
      </div>
    </div>
    <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  </div>
);

export default RouteFallback;
