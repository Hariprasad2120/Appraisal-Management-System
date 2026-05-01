import type React from "react";
import { cn } from "@/lib/utils";

// ─── Base pulse skeleton ───────────────────────────────────────────────────

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/70 dark:bg-muted/40",
        className
      )}
      style={style}
    />
  );
}

// ─── Stat card skeleton (3-up grid) ───────────────────────────────────────

export function StatCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className={`grid gap-4 grid-cols-${count <= 3 ? count : 3} sm:grid-cols-${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-xl" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
          <Skeleton className="h-5 w-24 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Card with rows skeleton ───────────────────────────────────────────────

export function CardRowsSkeleton({ rows = 4, title = true }: { rows?: number; title?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {title && (
        <div className="px-5 py-4 border-b border-border">
          <Skeleton className="h-4 w-36 rounded" />
        </div>
      )}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-5 py-4 flex items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3.5 w-40 rounded" />
              <Skeleton className="h-3 w-56 rounded" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page header skeleton ──────────────────────────────────────────────────

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-7 w-52 rounded-md" />
      <Skeleton className="h-3.5 w-72 rounded" />
    </div>
  );
}

// ─── Employee dashboard skeleton ───────────────────────────────────────────

export function EmployeeDashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeaderSkeleton />
      <div className="grid gap-4 grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 rounded-xl" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
            <Skeleton className="h-5 w-28 rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-40 rounded" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-4 rounded-full" />
              <Skeleton className="h-3 flex-1 max-w-xs rounded" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </div>
  );
}

// ─── Table skeleton (for admin list pages) ────────────────────────────────

export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex gap-4 bg-muted/30">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 rounded" style={{ width: `${60 + i * 20}px` }} />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-5 py-3.5 flex items-center gap-4">
            <Skeleton className="size-7 rounded-full shrink-0" />
            <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${cols - 1}, 1fr)` }}>
              {Array.from({ length: cols - 1 }).map((_, j) => (
                <Skeleton key={j} className="h-3 rounded" style={{ width: `${70 + j * 15}%` }} />
              ))}
            </div>
            <Skeleton className="h-7 w-16 rounded-md shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Management/reviewer cycle card skeleton ──────────────────────────────

export function CycleCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Form skeleton ────────────────────────────────────────────────────────

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-5">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
      <Skeleton className="h-9 w-28 rounded-md mt-2" />
    </div>
  );
}

// ─── Full page generic skeleton (fallback) ────────────────────────────────

export function GenericPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={3} />
      <CardRowsSkeleton rows={5} />
    </div>
  );
}
