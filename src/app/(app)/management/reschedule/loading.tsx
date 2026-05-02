import { PageHeaderSkeleton, CardRowsSkeleton } from "@/components/skeletons";

export default function RescheduleLoading() {
  return (
    <div className="w-full max-w-3xl space-y-5">
      <PageHeaderSkeleton />
      <CardRowsSkeleton rows={3} title />
      <CardRowsSkeleton rows={5} title />
    </div>
  );
}
