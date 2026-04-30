"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Users, Clock, Wifi, MapPin, Shield, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActiveSession = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  loginAt: string;
  lastSeenAt: string;
  ipAddress: string | null;
  location: string | null;
  durationMs: number;
};

type SessionHistory = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  loginAt: string;
  lastSeenAt: string;
  logoutAt: string | null;
  status: string;
  ipAddress: string | null;
  location: string | null;
  durationMs: number;
};

type SecurityEvent = {
  id: string;
  event: string;
  outcome: string;
  email: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

type Props = {
  initialActive: ActiveSession[];
  history: SessionHistory[];
  securityEvents: SecurityEvent[];
  renderedAt: string;
  timeoutMinutes: number;
};

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

const roleColors: Record<string, string> = {
  ADMIN: "text-orange-400 bg-orange-500/10",
  MANAGEMENT: "text-amber-400 bg-amber-500/10",
  MANAGER: "text-teal-400 bg-teal-500/10",
  HR: "text-cyan-400 bg-cyan-500/10",
  TL: "text-amber-400 bg-amber-500/10",
  EMPLOYEE: "text-slate-400 bg-slate-500/10",
  PARTNER: "text-teal-400 bg-teal-500/10",
};

const statusColors: Record<string, string> = {
  ACTIVE: "text-green-400 bg-green-500/10",
  TIMED_OUT: "text-amber-400 bg-amber-500/10",
  LOGGED_OUT: "text-slate-400 bg-slate-500/10",
};

const outcomeColors: Record<string, string> = {
  SUCCESS: "text-green-400 bg-green-500/10",
  FAILED: "text-red-400 bg-red-500/10",
};

function formatEventLabel(event: string): string {
  return event.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SessionsDashboard({ initialActive, history, securityEvents, renderedAt, timeoutMinutes }: Props) {
  const [active, setActive] = useState<ActiveSession[]>(initialActive);
  const [nowMs, setNowMs] = useState(() => new Date(renderedAt).getTime());
  const [newTimeout, setNewTimeout] = useState<string>(String(timeoutMinutes));
  const [savingTimeout, setSavingTimeout] = useState(false);
  const [timeoutSaved, setTimeoutSaved] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const todayCutoffMs = nowMs - 86_400_000;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/session/active");
      if (res.ok) {
        const data = await res.json() as ActiveSession[];
        setActive(data);
      }
    } catch {
      // silent
    }
    setRefreshing(false);
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(() => setNowMs(new Date().getTime()), 30_000);
    return () => clearInterval(interval);
  }, []);

  async function saveTimeout() {
    const mins = parseInt(newTimeout, 10);
    if (isNaN(mins) || mins < 1) return;
    setSavingTimeout(true);
    try {
      await fetch("/api/session/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeoutMinutes: mins }),
      });
      setTimeoutSaved(true);
      setTimeout(() => setTimeoutSaved(false), 2000);
    } catch {
      // silent
    }
    setSavingTimeout(false);
  }

  return (
    <div className="space-y-8">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Now", value: active.length, icon: <Wifi className="size-4" />, color: "text-green-400" },
          { label: "Today's Sessions", value: history.filter((s) => new Date(s.loginAt).getTime() > todayCutoffMs).length, icon: <Users className="size-4" />, color: "text-[#00cec4]" },
          { label: "Timed Out", value: history.filter((s) => s.status === "TIMED_OUT").length, icon: <Clock className="size-4" />, color: "text-amber-400" },
          { label: "Timeout Config", value: `${timeoutMinutes}m`, icon: <Shield className="size-4" />, color: "text-[#ff8333]" },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
          >
            <div className={`${stat.color} shrink-0`}>{stat.icon}</div>
            <div>
              <div className="text-xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Timeout config */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Shield className="size-4 text-[#ff8333]" />
          Inactivity Timeout Config
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={480}
              value={newTimeout}
              onChange={(e) => setNewTimeout(e.target.value)}
              className="w-20 h-9 rounded-lg border border-border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <span className="text-sm text-muted-foreground">minutes</span>
          </div>
          <Button
            size="sm"
            onClick={saveTimeout}
            disabled={savingTimeout}
            className="h-9 bg-[#008993] hover:bg-[#00cec4] text-white text-xs font-semibold"
          >
            {savingTimeout ? "Saving…" : timeoutSaved ? "Saved ✓" : "Save"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Warning shown 1 minute before expiry. Changes apply to new sessions.
          </p>
        </div>
      </div>

      {/* Active sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Wifi className="size-4 text-green-400" />
            Currently Active Sessions
            <span className="ml-1 text-xs bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded font-medium">
              {active.length}
            </span>
          </h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={refresh}
            disabled={refreshing}
            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <RefreshCw className={`size-3 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {active.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
            No active sessions
          </div>
        ) : (
          <div className="space-y-2">
            {active.map((s, idx) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="bg-card border border-border rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center gap-3"
              >
                {/* User info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="size-8 rounded-full bg-gradient-to-br from-[#008993] to-[#00cec4] flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {s.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{s.userName}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.userEmail}</div>
                  </div>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ml-auto md:ml-0 ${roleColors[s.userRole] ?? "text-slate-400"}`}>
                    {s.userRole}
                  </span>
                </div>

                {/* Session meta */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="size-3" />
                    <span>Login: {formatTime(s.loginAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Wifi className="size-3 text-green-400" />
                    <span className="text-green-400">Active {formatDuration(nowMs - new Date(s.loginAt).getTime())}</span>
                  </div>
                  {s.ipAddress && (
                    <div className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      <span>{s.ipAddress}{s.location ? ` · ${s.location}` : ""}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Session history */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="size-4 text-muted-foreground" />
          Session History (last 100)
        </h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Login</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Duration</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">IP / Location</th>
              </tr>
            </thead>
            <tbody>
              {history.map((s, idx) => (
                <tr
                  key={s.id}
                  className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/5"}`}
                >
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-foreground">{s.userName}</div>
                    <div className="text-muted-foreground">{s.userEmail}</div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{formatTime(s.loginAt)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                    {formatDuration(
                      s.logoutAt
                        ? new Date(s.logoutAt).getTime() - new Date(s.loginAt).getTime()
                        : new Date(s.lastSeenAt).getTime() - new Date(s.loginAt).getTime()
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded font-semibold text-[10px] uppercase ${statusColors[s.status] ?? "text-slate-400"}`}>
                      {s.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {s.ipAddress ?? "—"}
                    {s.location ? ` · ${s.location}` : ""}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No session history</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security audit trail */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Shield className="size-4 text-[#ff8333]" />
          Security Audit Trail (last 100)
        </h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">When</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Event</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Outcome</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">IP</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">User Agent</th>
              </tr>
            </thead>
            <tbody>
              {securityEvents.map((event, idx) => (
                <tr
                  key={event.id}
                  className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/5"}`}
                >
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{formatTime(event.createdAt)}</td>
                  <td className="px-4 py-2.5 text-foreground whitespace-nowrap">{formatEventLabel(event.event)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded font-semibold text-[10px] uppercase ${outcomeColors[event.outcome] ?? "text-slate-400"}`}>
                      {event.outcome}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-foreground">{event.userName ?? event.email ?? "Unknown"}</div>
                    <div className="text-muted-foreground">{event.userEmail ?? event.email ?? "No account matched"}</div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{event.ipAddress ?? "N/A"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground max-w-[260px] truncate">{event.userAgent ?? "N/A"}</td>
                </tr>
              ))}
              {securityEvents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No security events yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
