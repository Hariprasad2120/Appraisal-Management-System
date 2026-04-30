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

  const visible = queue.slice(0, MAX_VISIBLE);
  const overflow = queue.length - MAX_VISIBLE;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2 w-[360px] max-w-[calc(100vw-2rem)]">
      {overflow > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-center text-muted-foreground bg-background/80 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5"
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
        "relative rounded-xl shadow-lg border overflow-hidden",
        isUrgent
          ? "bg-red-950/95 border-red-500/60 shadow-red-950/50"
          : "bg-[#0d1117]/95 border-[#00cec4]/20",
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
            {isUrgent
              ? <ShieldAlert className="size-4 text-red-400" />
              : (iconByType[n.type] ?? <Bell className="size-4 text-[#00cec4]" />)
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {isUrgent && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded">
                  Urgent
                </span>
              )}
              {n.important && !isUrgent && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                  Important
                </span>
              )}
            </div>
            <p className="text-xs text-white/85 leading-relaxed line-clamp-3">{n.message}</p>
            {n.link && (
              <Link
                href={n.link}
                className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-[#00cec4] hover:text-[#008993] font-medium transition-colors"
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
              className="shrink-0 text-white/30 hover:text-white/70 transition-colors mt-0.5"
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
                : "bg-[#00cec4] hover:bg-[#008993] text-black",
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
              className="h-7 text-[11px] text-white/40 hover:text-white/70 px-2"
            >
              Close
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
