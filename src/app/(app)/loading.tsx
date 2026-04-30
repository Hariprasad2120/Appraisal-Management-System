import { Skeleton, GenericPageSkeleton } from "@/components/skeletons";

export default function AppLoading() {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar skeleton */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-border bg-sidebar flex-col sticky top-0 h-screen overflow-hidden">
        {/* Logo area */}
        <div className="px-5 py-5 border-b border-border space-y-1.5">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-2.5 w-20 rounded" />
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg">
              <Skeleton className="size-4 rounded shrink-0" />
              <Skeleton className="h-3 rounded" style={{ width: `${50 + i * 8}%` }} />
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-border space-y-3">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-4 w-14 rounded" />
            </div>
          </div>
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header skeleton */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar">
          <div className="space-y-1">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-2.5 w-16 rounded" />
          </div>
          <Skeleton className="size-8 rounded-md" />
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">
          <GenericPageSkeleton />
        </main>
      </div>
    </div>
  );
}
