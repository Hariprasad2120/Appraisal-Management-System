import { PageHeaderSkeleton, Skeleton } from "@/components/skeletons";

export default function RateLoading() {
  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeaderSkeleton />
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <Skeleton className="h-4 w-44 rounded" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-52 rounded" />
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="size-10 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-24 w-full rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
    </div>
  );
}
