import { PageHeaderSkeleton, CycleCardSkeleton } from "@/components/skeletons";

export default function ReviewerLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CycleCardSkeleton count={3} />
    </div>
  );
}
