import { PageHeaderSkeleton, Skeleton } from "@/components/skeletons";

export default function SelfAssessmentLoading() {
  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeaderSkeleton />
      <div className="rounded-xl border border-border bg-card p-5 space-y-6">
        {Array.from({ length: 4 }).map((_, section) => (
          <div key={section} className="space-y-3">
            <Skeleton className="h-4 w-40 rounded" />
            {Array.from({ length: 3 }).map((_, q) => (
              <div key={q} className="space-y-2 pl-2">
                <Skeleton className="h-3 w-64 rounded" />
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Skeleton key={s} className="size-9 rounded-md" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
    </div>
  );
}
