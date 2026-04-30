import { PageHeaderSkeleton, StatCardsSkeleton, CardRowsSkeleton } from "@/components/skeletons";

export default function AdminArrearsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={4} />
      <CardRowsSkeleton rows={6} />
    </div>
  );
}
