import { PageHeaderSkeleton, Skeleton, FormSkeleton } from "@/components/skeletons";

export default function DecideLoading() {
  return (
    <div className="w-full max-w-5xl space-y-6">
      <PageHeaderSkeleton />
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left — management criteria */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <Skeleton className="h-4 w-40 rounded" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-32 rounded" />
                <div className="flex gap-2">
                  {[0,1,2,3,4].map((j) => (
                    <Skeleton key={j} className="size-8 rounded-md" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Right — scoring summary */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <Skeleton className="h-4 w-32 rounded" />
            {[0,1,2].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-3 w-28 rounded" />
                <Skeleton className="h-5 w-16 rounded" />
              </div>
            ))}
            <Skeleton className="h-px w-full rounded" />
            <Skeleton className="h-6 w-24 rounded" />
          </div>
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
