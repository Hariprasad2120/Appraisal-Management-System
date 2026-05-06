import { Clock3 } from "lucide-react";
import { kpiEventDetail, kpiEventLabel } from "@/lib/kpi-audit";

type TimelineEvent = {
  id: string;
  eventType: string;
  actorRole: string;
  timestamp: Date;
  reason: string | null;
  oldStatus: string | null;
  newStatus: string | null;
  metadata: unknown;
  actor?: { name: string } | null;
};

function formatDateTime(date: Date) {
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function KpiTaskTimeline({
  events,
  compact = false,
}: {
  events: TimelineEvent[];
  compact?: boolean;
}) {
  const sorted = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
        No audit events recorded yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/20">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-semibold text-foreground">
        <Clock3 className="size-3.5 text-primary" /> Event Timeline
      </div>
      <div className="divide-y divide-border">
        {sorted.map((event) => {
          const detail = kpiEventDetail(event);
          return (
            <div key={event.id} className={compact ? "px-3 py-2" : "px-4 py-3"}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">{kpiEventLabel(event.eventType)}</p>
                <span className="text-[10px] text-muted-foreground">{formatDateTime(event.timestamp)}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {event.actor?.name ?? event.actorRole} ({event.actorRole})
              </p>
              {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
