"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Bell, AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type PopupNotification = {
  id: string;
  type: string;
  message: string;
  link: string | null;
  createdAt: string;
  urgent?: boolean;
  important?: boolean;
};

type Props = {
  initialNotifications: PopupNotification[];
};

const iconByType: Record<string, React.ReactNode> = {
  ASSIGNMENT: <Bell className="size-4 text-[#00cec4]" />,
  REASSIGN_NEEDED: <AlertTriangle className="size-4 text-[#ff8333]" />,
  NOT_AVAILABLE_ALERT: <AlertTriangle className="size-4 text-red-500" />,
  RATING_REMINDER: <Bell className="size-4 text-[#ffaa2d]" />,
  EXTENSION_REQUEST: <AlertTriangle className="size-4 text-purple-500" />,
  REVIEW_WINDOW_OPEN: <CheckCircle className="size-4 text-green-500" />,
  ALL_REVIEWERS_AVAILABLE: <CheckCircle className="size-4 text-green-500" />,
  RATINGS_COMPLETE: <CheckCircle className="size-4 text-[#00cec4]" />,
};

const MAX_VISIBLE = 3;

export function PersistentPopup({ initialNotifications }: Props) {
  const [queue, setQueue] = useState<PopupNotification[]>(() =>
    [...initialNotifications].sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0))
  );
  const [busy, setBusy] = useState<string | null>(null);

  // Poll every 30s for new notifications
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/notifications/persistent");
        if (!res.ok) return;
        const data = await res.json() as PopupNotification[];
        setQueue((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const incoming = data.filter((n) => !existingIds.has(n.id));
          if (incoming.length === 0) return prev;
          // Urgent ones bubble to front
          const merged = [...prev, ...incoming];
          merged.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
          return merged;
        });
      } catch {
        // silent
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const dismiss = useCallback(async (id: string) => {
    setBusy(id);
    try {
      await fetch("/api/notifications/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // silent
    }
    setQueue((prev) => prev.filter((n) => n.id !== id));
    setBusy(null);
  }, []);

  const acknowledge = useCallback(async (id: string) => {
    setBusy(id);
    try {
      await fetch("/api/notifications/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // silent
    }
    setQueue((prev) => prev.filter((n) => n.id !== id));
    setBusy(null);
  }, []);

  const dismissAll = useCallback(() => {
    const ids = queue.map((n) => n.id);
    setQueue([]);
    void Promise.all(
      ids.map((id) =>
        fetch("/api/notifications/dismiss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        }).catch(() => null)
      )
    );
  }, [queue]);

  const visible = queue.slice(0, MAX_VISIBLE);
  const overflow = queue.length - MAX_VISIBLE;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col-reverse gap-2">
      {queue.length > 0 && (
        <button
          type="button"
          onClick={dismissAll}
          className="self-end rounded-full border border-border bg-popover/95 px-3 py-1.5 text-[11px] font-normal text-muted-foreground shadow-lg backdrop-blur transition-colors hover:text-foreground"
          aria-label="Dismiss all persistent notifications"
        >
          Dismiss all
        </button>
      )}
      {overflow > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-border bg-popover/95 px-3 py-1.5 text-center text-xs text-muted-foreground shadow-lg backdrop-blur"
        >
          +{overflow} more notification{overflow > 1 ? "s" : ""}
        </motion.div>
      )}
      <AnimatePresence>
        {visible.map((n, idx) => (
          <NotificationToast
            key={n.id}
            notification={n}
            index={idx}
            busy={busy}
            onDismiss={dismiss}
            onAcknowledge={acknowledge}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function NotificationToast({
  notification: n,
  index,
  busy,
  onDismiss,
  onAcknowledge,
}: {
  notification: PopupNotification;
  index: number;
  busy: string | null;
  onDismiss: (id: string) => void;
  onAcknowledge: (id: string) => void;
}) {
  const isUrgent = n.urgent;
  const isBusy = busy === n.id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 24, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.92, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 320, damping: 28, delay: index * 0.04 }}
      className={[
        "relative overflow-hidden rounded-xl border shadow-lg backdrop-blur",
        isUrgent
          ? "border-red-400/60 bg-popover/95 shadow-red-950/20"
          : "border-border/80 bg-popover/95",
      ].join(" ")}
      style={{ backdropFilter: "blur(12px)" }}
    >
      {/* Urgent pulsing bar */}
      {isUrgent && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 animate-pulse" />
      )}

      <div className="px-4 py-3">
        {/* Header row */}
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 shrink-0">
            <div className={isUrgent ? "rounded-full bg-red-500/10 p-1" : "rounded-full bg-primary/10 p-1"}>
              {isUrgent
                ? <ShieldAlert className="size-4 text-red-500" />
                : (iconByType[n.type] ?? <Bell className="size-4 text-primary" />)
              }
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {isUrgent && (
                <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                  Urgent
                </span>
              )}
              {n.important && !isUrgent && (
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  Important
                </span>
              )}
            </div>
            <p className="line-clamp-3 text-xs leading-relaxed text-popover-foreground">{n.message}</p>
            {n.link && (
              <Link
                href={n.link}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary transition-colors hover:text-primary/80"
                onClick={() => !isUrgent && onDismiss(n.id)}
              >
                View details →
              </Link>
            )}
          </div>
          {/* Close button — disabled for urgent (must acknowledge) */}
          {!isUrgent && (
            <button
              onClick={() => onDismiss(n.id)}
              disabled={isBusy}
              className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Action row */}
        <div className="flex gap-2 mt-2.5">
          <Button
            size="sm"
            disabled={isBusy}
            onClick={() => onAcknowledge(n.id)}
            className={[
              "h-7 text-[11px] font-semibold flex-1",
              isUrgent
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-primary hover:bg-primary/90 text-primary-foreground",
            ].join(" ")}
          >
            {isBusy ? "..." : isUrgent ? "Acknowledge & Close" : "Acknowledge"}
          </Button>
          {!isUrgent && (
            <Button
              size="sm"
              variant="ghost"
              disabled={isBusy}
              onClick={() => onDismiss(n.id)}
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Close
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
