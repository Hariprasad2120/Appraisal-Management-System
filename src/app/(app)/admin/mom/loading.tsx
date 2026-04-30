import { PageHeaderSkeleton, CardRowsSkeleton } from "@/components/skeletons";

export default function AdminMomLoading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <CardRowsSkeleton rows={6} />
    </div>
  );
}
