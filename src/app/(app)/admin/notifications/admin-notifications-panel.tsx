"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell, AlertTriangle, CheckCircle, ShieldAlert, RotateCcw, Star, StarOff,
  Filter, Search, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { Role } from "@/generated/prisma/enums";

type NotificationRow = {
  id: string;
  type: string;
  message: string;
  link: string | null;
  createdAt: string;
  acknowledgedAt: string | null;
  read: boolean;
  dismissed: boolean;
  acknowledged: boolean;
  important: boolean;
  urgent: boolean;
  critical: boolean;
  persistent: boolean;
  retriggeredFromId: string | null;
  user: { id: string; name: string; role: Role; email: string };
};

type Props = { notifications: NotificationRow[] };

const STATUS_FILTERS = ["all", "pending", "acknowledged", "dismissed", "urgent"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function statusLabel(n: NotificationRow): string {
  if (n.urgent && !n.dismissed) return "urgent";
  if (n.acknowledged) return "acknowledged";
  if (n.dismissed) return "dismissed";
  if (n.critical && !n.dismissed) return "pending";
  return "read";
}

function statusBadge(n: NotificationRow) {
  const s = statusLabel(n);
  const map: Record<string, string> = {
    urgent: "bg-red-500/20 text-red-400 border-red-500/40",
    acknowledged: "bg-green-500/20 text-green-400 border-green-500/40",
    dismissed: "bg-muted text-muted-foreground border-border",
    pending: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    read: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  };
  return (
    <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${map[s] ?? ""}`}>
      {s}
    </span>
  );
}

function typeIcon(type: string) {
  const map: Record<string, React.ReactNode> = {
    ASSIGNMENT: <Bell className="size-3.5 text-[#00cec4]" />,
    REASSIGN_NEEDED: <AlertTriangle className="size-3.5 text-[#ff8333]" />,
    NOT_AVAILABLE_ALERT: <AlertTriangle className="size-3.5 text-red-500" />,
    RATING_REMINDER: <Bell className="size-3.5 text-[#ffaa2d]" />,
    EXTENSION_REQUEST: <AlertTriangle className="size-3.5 text-purple-400" />,
    REVIEW_WINDOW_OPEN: <CheckCircle className="size-3.5 text-green-500" />,
    ALL_REVIEWERS_AVAILABLE: <CheckCircle className="size-3.5 text-green-500" />,
    RATINGS_COMPLETE: <CheckCircle className="size-3.5 text-[#00cec4]" />,
  };
  return map[type] ?? <Bell className="size-3.5 text-muted-foreground" />;
}

export function AdminNotificationsPanel({ notifications: initial }: Props) {
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const markImportant = (id: string, important: boolean) => {
    startTransition(async () => {
      await fetch("/api/notifications/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, important }),
      });
      setRows((prev) => prev.map((n) => n.id === id ? { ...n, important } : n));
    });
  };

  const retrigger = (id: string) => {
    startTransition(async () => {
      const res = await fetch("/api/notifications/retrigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        const data = await res.json() as { ok: boolean; id: string };
        // Add the new urgent notification to list optimistically
        const original = rows.find((n) => n.id === id);
        if (original && data.id) {
          const urgent: NotificationRow = {
            ...original,
            id: data.id,
            message: `[URGENT] ${original.message}`,
            urgent: true,
            important: true,
            critical: true,
            persistent: true,
            acknowledged: false,
            dismissed: false,
            read: false,
            retriggeredFromId: id,
            createdAt: new Date().toISOString(),
            acknowledgedAt: null,
          };
          setRows((prev) => [urgent, ...prev]);
        }
      }
    });
  };

  const filtered = rows.filter((n) => {
    const s = statusLabel(n);
    const matchFilter =
      filter === "all" ||
      (filter === "pending" && s === "pending") ||
      (filter === "acknowledged" && s === "acknowledged") ||
      (filter === "dismissed" && s === "dismissed") ||
      (filter === "urgent" && s === "urgent");
    const matchSearch =
      !search ||
      n.message.toLowerCase().includes(search.toLowerCase()) ||
      n.user.name.toLowerCase().includes(search.toLowerCase()) ||
      n.type.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts: Record<StatusFilter, number> = {
    all: rows.length,
    pending: rows.filter((n) => statusLabel(n) === "pending").length,
    acknowledged: rows.filter((n) => statusLabel(n) === "acknowledged").length,
    dismissed: rows.filter((n) => statusLabel(n) === "dismissed").length,
    urgent: rows.filter((n) => statusLabel(n) === "urgent").length,
  };

  return (
    <div className="space-y-4">
      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by user, message, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="size-3.5 text-muted-foreground shrink-0" />
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                "px-2.5 py-1 rounded-full text-xs font-medium transition-colors capitalize",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {f} <span className="opacity-60">({counts[f]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="bg-muted/50 px-4 py-2.5 grid grid-cols-[1fr_160px_100px_80px_120px] gap-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Message</span>
          <span>User</span>
          <span>Triggered</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        <div className="divide-y divide-border">
          <AnimatePresence initial={false}>
            {filtered.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                No notifications match this filter.
              </div>
            )}
            {filtered.map((n) => (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div
                  className={[
                    "px-4 py-3 grid grid-cols-[1fr_160px_100px_80px_120px] gap-4 items-start cursor-pointer hover:bg-muted/30 transition-colors",
                    n.urgent && !n.dismissed ? "bg-red-500/5" : "",
                  ].join(" ")}
                  onClick={() => setExpanded(expanded === n.id ? null : n.id)}
                >
                  {/* Message */}
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="mt-0.5 shrink-0">{typeIcon(n.type)}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate leading-snug">{n.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{n.type}</p>
                    </div>
                    {n.important && (
                      <Star className="size-3 text-amber-400 shrink-0 mt-1" />
                    )}
                  </div>

                  {/* User */}
                  <div className="min-w-0">
                    <Link
                      href={`/admin/employees/${n.user.id}/assign`}
                      className="block truncate text-sm text-foreground transition-colors hover:text-primary hover:underline"
                    >
                      {n.user.name}
                    </Link>
                    <p className="text-[11px] text-muted-foreground capitalize">{n.user.role.toLowerCase()}</p>
                  </div>

                  {/* Triggered */}
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(n.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                    <br />
                    {new Date(n.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </div>

                  {/* Status */}
                  <div>{statusBadge(n)}</div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      title={n.important ? "Unmark important" : "Mark important"}
                      onClick={() => markImportant(n.id, !n.important)}
                      disabled={isPending}
                    >
                      {n.important
                        ? <StarOff className="size-3.5 text-amber-400" />
                        : <Star className="size-3.5 text-muted-foreground" />
                      }
                    </Button>
                    {(n.dismissed || !n.acknowledged) && n.important && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-red-400 hover:text-red-300"
                        title="Re-trigger as urgent"
                        onClick={() => retrigger(n.id)}
                        disabled={isPending}
                      >
                        <RotateCcw className="size-3.5" />
                      </Button>
                    )}
                    <ChevronDown
                      className={[
                        "size-3.5 text-muted-foreground transition-transform",
                        expanded === n.id ? "rotate-180" : "",
                      ].join(" ")}
                    />
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {expanded === n.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 pt-1 bg-muted/20 border-t border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground mb-0.5">Email</p>
                          <p className="text-foreground">{n.user.email}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">Acknowledged</p>
                          <p className={n.acknowledged ? "text-green-400" : "text-muted-foreground"}>
                            {n.acknowledged && n.acknowledgedAt
                              ? new Date(n.acknowledgedAt).toLocaleString("en-IN")
                              : n.dismissed ? "Dismissed (closed)" : "Not yet"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">Flags</p>
                          <p className="text-foreground flex gap-1 flex-wrap">
                            {n.critical && <Badge variant="secondary" className="text-[10px] py-0">Critical</Badge>}
                            {n.urgent && <Badge variant="destructive" className="text-[10px] py-0">Urgent</Badge>}
                            {n.important && <Badge className="text-[10px] py-0 bg-amber-500/20 text-amber-400 border-amber-500/40">Important</Badge>}
                            {n.persistent && <Badge variant="outline" className="text-[10px] py-0">Persistent</Badge>}
                            {n.retriggeredFromId && <Badge variant="outline" className="text-[10px] py-0">Re-triggered</Badge>}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">Link</p>
                          {n.link
                            ? <Link href={n.link} className="text-[#00cec4] hover:underline truncate block">{n.link}</Link>
                            : <span className="text-muted-foreground">—</span>
                          }
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {rows.length >= 200 && (
        <p className="text-xs text-center text-muted-foreground">Showing latest 200 records.</p>
      )}
    </div>
  );
}
