import { PageHeaderSkeleton, Skeleton, CardRowsSkeleton } from "@/components/skeletons";

export default function ReviewerCycleLoading() {
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeaderSkeleton />
      {/* Reviewer info card */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-40 rounded" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-4 rounded-full" />
              <Skeleton className="h-3 w-32 rounded" />
              <Skeleton className="h-5 w-16 rounded-full ml-auto" />
            </div>
          ))}
        </div>
      </div>
      {/* Rating criteria */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <Skeleton className="h-4 w-36 rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-48 rounded" />
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="size-9 rounded-md" />
              ))}
            </div>
          </div>
        ))}
        <Skeleton className="h-20 w-full rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
    </div>
  );
}
