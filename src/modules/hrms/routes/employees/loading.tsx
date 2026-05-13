import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/skeletons";

export default function AdminEmployeesLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <PageHeaderSkeleton />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <TableSkeleton rows={10} cols={5} />
    </div>
  );
}
