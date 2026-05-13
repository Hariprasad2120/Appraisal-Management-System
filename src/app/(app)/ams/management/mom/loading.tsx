import { PageHeaderSkeleton, CardRowsSkeleton } from "@/components/skeletons";

export default function ManagementMomLoading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <CardRowsSkeleton rows={5} />
    </div>
  );
}
