import { PageHeaderSkeleton, Skeleton } from "@/components/skeletons";

export default function ArrearsLoading() {
  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeaderSkeleton />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card border-l-4 border-l-amber-300 p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-5 w-20 rounded" />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
