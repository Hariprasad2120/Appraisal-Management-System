"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import {
  Bell, CheckCircle, CheckCheck, AlertTriangle, Info,
  LogIn, Star, Ticket, Calendar, UserCheck, ClipboardList,
  Filter, Trash2,
} from "lucide-react";
import { markAllReadAction, markOneReadAction, deleteAllNotificationsAction } from "./actions";

type NotificationRow = {
  id: string;
  type: string;
  message: string;
  link: string | null;
  createdAt: string;
  read: boolean;
  critical: boolean;
  urgent: boolean;
  important: boolean;
  persistent: boolean;
};

type Tab = "all" | "unread" | "important";

function typeIcon(type: string) {
  const map: Record<string, React.ReactNode> = {
    LOGIN_ACTIVITY: <LogIn className="size-4 text-[#008993]" />,
    ASSIGNMENT: <UserCheck className="size-4 text-[#00cec4]" />,
    CYCLE_STARTED: <ClipboardList className="size-4 text-[#008993]" />,
    SELF_ASSESSMENT_SUBMITTED: <CheckCircle className="size-4 text-green-500" />,
    ALL_REVIEWERS_AVAILABLE: <CheckCircle className="size-4 text-[#00cec4]" />,
    REVIEW_WINDOW_OPEN: <Bell className="size-4 text-[#ffaa2d]" />,
    RATING_SUBMITTED: <Star className="size-4 text-[#ffaa2d]" />,
    ALL_RATINGS_COMPLETE: <CheckCheck className="size-4 text-green-500" />,
    RATINGS_COMPLETE: <CheckCheck className="size-4 text-green-500" />,
    RATING_OVERDUE: <AlertTriangle className="size-4 text-red-500" />,
    APPRAISAL_DECIDED: <CheckCheck className="size-4 text-[#00cec4]" />,
    APPRAISAL_SCHEDULED: <Calendar className="size-4 text-[#008993]" />,
    MANAGEMENT_CLAIMED: <UserCheck className="size-4 text-[#ffaa2d]" />,
    TENTATIVE_DATES_SET: <Calendar className="size-4 text-[#ffaa2d]" />,
    EXTENSION_REQUEST: <AlertTriangle className="size-4 text-purple-400" />,
    EXTENSION_DECISION: <Info className="size-4 text-[#008993]" />,
    NOT_AVAILABLE_ALERT: <AlertTriangle className="size-4 text-red-500" />,
    FORCE_AVAILABLE: <UserCheck className="size-4 text-[#ff8333]" />,
    FORCE_MARKED_AVAILABLE: <UserCheck className="size-4 text-[#ff8333]" />,
    TICKET_CREATED: <Ticket className="size-4 text-[#008993]" />,
    TICKET_COMMENT: <Ticket className="size-4 text-[#ffaa2d]" />,
    TICKET_STATUS: <Ticket className="size-4 text-green-500" />,
    MEETING_DAY: <Calendar className="size-4 text-[#ff8333]" />,
  };
  return map[type] ?? <Bell className="size-4 text-muted-foreground" />;
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    LOGIN_ACTIVITY: "Login Activity",
    ASSIGNMENT: "Assignment",
    CYCLE_STARTED: "Cycle Started",
    SELF_ASSESSMENT_SUBMITTED: "Self Assessment",
    ALL_REVIEWERS_AVAILABLE: "Reviewers Ready",
    REVIEW_WINDOW_OPEN: "Review Window",
    RATING_SUBMITTED: "Rating",
    ALL_RATINGS_COMPLETE: "All Ratings Done",
    RATINGS_COMPLETE: "Ratings Complete",
    RATING_OVERDUE: "Rating Overdue",
    APPRAISAL_DECIDED: "Decision",
    APPRAISAL_SCHEDULED: "Scheduled",
    MANAGEMENT_CLAIMED: "Claimed",
    TENTATIVE_DATES_SET: "Dates Proposed",
    EXTENSION_REQUEST: "Extension Request",
    EXTENSION_DECISION: "Extension Decision",
    NOT_AVAILABLE_ALERT: "Unavailability Alert",
    FORCE_AVAILABLE: "Force Marked Available",
    FORCE_MARKED_AVAILABLE: "Force Marked Available",
    TICKET_CREATED: "Ticket",
    TICKET_COMMENT: "Ticket Reply",
    TICKET_STATUS: "Ticket Update",
    MEETING_DAY: "Meeting Day",
  };
  return map[type] ?? type;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "important", label: "Important" },
];

export function NotificationsPanel({
  initialNotifications,
}: {
  initialNotifications: NotificationRow[];
}) {
  const [rows, setRows] = useState(initialNotifications);
  const [tab, setTab] = useState<Tab>("all");
  const [isPending, startTransition] = useTransition();

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllReadAction();
      setRows((prev) => prev.map((n) => ({ ...n, read: true })));
    });
  };

  const handleMarkOneRead = (id: string) => {
    startTransition(async () => {
      await markOneReadAction(id);
      setRows((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    });
  };

  const handleDeleteAll = () => {
    startTransition(async () => {
      await deleteAllNotificationsAction();
      setRows([]);
    });
  };

  const filtered = rows.filter((n) => {
    if (tab === "unread") return !n.read;
    if (tab === "important") return n.important || n.urgent || n.critical;
    return true;
  });

  const unreadCount = rows.filter((n) => !n.read).length;

  const counts: Record<Tab, number> = {
    all: rows.length,
    unread: unreadCount,
    important: rows.filter((n) => n.important || n.urgent || n.critical).length,
  };

  return (
    <div className="space-y-4">
      {/* Tab bar + actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
          <Filter className="size-3.5 text-muted-foreground ml-2 shrink-0" />
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                tab === t.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {t.label}
              {counts[t.id] > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  tab === t.id ? "bg-primary/15 text-primary" : "bg-muted-foreground/20"
                }`}>
                  {counts[t.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </button>
          )}
          {rows.length > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={isPending}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
              Delete all
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="rounded-xl border border-border overflow-hidden divide-y divide-border/60">
        <AnimatePresence initial={false}>
          {filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 flex flex-col items-center gap-3 text-muted-foreground"
            >
              <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                <Bell className="size-5" />
              </div>
              <p className="text-sm">No notifications here</p>
            </motion.div>
          )}

          {filtered.map((n, i) => (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, delay: i * 0.02 }}
              className={[
                "group flex items-start gap-3.5 px-4 py-3.5 transition-colors",
                n.read ? "bg-background hover:bg-muted/30" : "bg-primary/5 hover:bg-primary/8",
                n.urgent && !n.read ? "border-l-2 border-red-500" : "",
              ].join(" ")}
            >
              {/* Icon */}
              <div className={`mt-0.5 size-8 rounded-lg flex items-center justify-center shrink-0 ${
                n.read ? "bg-muted/50" : "bg-primary/10"
              }`}>
                {typeIcon(n.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {typeLabel(n.type)}
                      </span>
                      {n.urgent && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className={`text-sm leading-snug ${n.read ? "text-muted-foreground" : "text-foreground font-medium"}`}>
                      {n.message}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[11px] text-muted-foreground/70">{timeAgo(n.createdAt)}</span>
                      {n.link && (
                        <Link
                          href={n.link}
                          onClick={() => !n.read && handleMarkOneRead(n.id)}
                          className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                          View details →
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Unread dot + mark read */}
                  <div className="flex items-center gap-2 shrink-0 mt-0.5">
                    {!n.read && (
                      <>
                        <span className="size-2 rounded-full bg-primary shrink-0" />
                        <button
                          onClick={() => handleMarkOneRead(n.id)}
                          disabled={isPending}
                          title="Mark read"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <CheckCircle className="size-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {rows.length >= 100 && (
        <p className="text-xs text-center text-muted-foreground">Showing latest 100 notifications.</p>
      )}
    </div>
  );
}
