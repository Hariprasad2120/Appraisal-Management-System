import { PageHeaderSkeleton, CardRowsSkeleton } from "@/components/skeletons";

export default function RescheduleLoading() {
  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeaderSkeleton />
      <CardRowsSkeleton rows={3} title />
      <CardRowsSkeleton rows={5} title />
    </div>
  );
}
