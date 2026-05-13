import { PageHeaderSkeleton, CycleCardSkeleton, StatCardsSkeleton } from "@/components/skeletons";

export default function ManagementLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={3} />
      <CycleCardSkeleton count={4} />
    </div>
  );
}
