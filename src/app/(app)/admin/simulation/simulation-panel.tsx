"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { shiftDeadlinesAction, extendCycleDeadlineAction, clearSimulationModeAction, setSystemDateAction, clearSystemDateAction, deleteAllCyclesAction } from "./actions";
import { FastForward, Rewind, Clock, AlertTriangle, CalendarPlus, CalendarClock, Trash2 } from "lucide-react";

type ActiveCycle = {
  id: string;
  employeeName: string;
  status: string;
  ratingDeadline: string | null;
  scheduledDate: string | null;
};

export function SimulationPanel({
  activeCycles,
  isSimulationActive,
  systemDateOverride,
}: {
  activeCycles: ActiveCycle[];
  isSimulationActive: boolean;
  systemDateOverride: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [extendDays, setExtendDays] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [overrideDate, setOverrideDate] = useState(
    systemDateOverride
      ? new Date(systemDateOverride).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );
  const router = useRouter();

  function shift(days: number) {
    startTransition(async () => {
      const res = await shiftDeadlinesAction(days);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(`All deadlines shifted by ${days > 0 ? "+" : ""}${days} day${Math.abs(days) !== 1 ? "s" : ""}`);
      router.refresh();
    });
  }

  function extend(cycleId: string) {
    const d = parseInt(extendDays[cycleId] ?? "3", 10);
    if (isNaN(d) || d < 1 || d > 14) { toast.error("Extension must be 1–14 days"); return; }
    startTransition(async () => {
      const res = await extendCycleDeadlineAction(cycleId, d);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(`Deadline extended by ${d} day${d !== 1 ? "s" : ""} — reviewers notified`);
      router.refresh();
    });
  }

  function clearSim() {
    startTransition(async () => {
      const res = await clearSimulationModeAction();
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Simulation mode flag cleared");
      router.refresh();
    });
  }

  function setDate() {
    if (!overrideDate) { toast.error("Pick a date"); return; }
    startTransition(async () => {
      const res = await setSystemDateAction(new Date(overrideDate).toISOString());
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(`System date set to ${new Date(overrideDate).toLocaleDateString("en-IN")}`);
      router.refresh();
    });
  }

  function clearDate() {
    startTransition(async () => {
      const res = await clearSystemDateAction();
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("System date reset to real time");
      router.refresh();
    });
  }

  function deleteAllCycles() {
    startTransition(async () => {
      const res = await deleteAllCyclesAction();
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(`Deleted ${res.deleted} cycle${res.deleted !== 1 ? "s" : ""} and all related data`);
      setDeleteConfirm(false);
      router.refresh();
    });
  }

  const shiftOptions = [
    { label: "+1 day", days: 1, icon: <FastForward className="size-3.5" /> },
    { label: "+3 days", days: 3, icon: <FastForward className="size-3.5" /> },
    { label: "+7 days", days: 7, icon: <FastForward className="size-3.5" /> },
    { label: "−1 day", days: -1, icon: <Rewind className="size-3.5" /> },
    { label: "−3 days", days: -3, icon: <Rewind className="size-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {isSimulationActive && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-xl px-4 py-3">
          <AlertTriangle className="size-4 text-amber-600 shrink-0" />
          <div className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Simulation Mode Active — deadlines have been modified
          </div>
          <button
            type="button"
            onClick={clearSim}
            disabled={pending}
            className="ml-auto text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400 underline underline-offset-2"
          >
            Clear flag
          </button>
        </div>
      )}

      {/* System date override */}
      <Card className="border border-border shadow-sm bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarClock className="size-4 text-violet-500" />
            System Date Override
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Set a fixed date the system treats as &quot;today&quot;. Affects all deadline checks, 30-business-day calculations, and date comparisons. Admin only.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {systemDateOverride && (
            <div className="flex items-center gap-2 text-xs font-semibold text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-lg px-3 py-2">
              <CalendarClock className="size-3.5 shrink-0" />
              Active override: {new Date(systemDateOverride).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              <button
                type="button"
                onClick={clearDate}
                disabled={pending}
                className="ml-auto underline underline-offset-2 font-medium hover:text-violet-900"
              >
                Clear
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="date"
              value={overrideDate}
              onChange={(e) => setOverrideDate(e.target.value)}
              className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <Button
              size="sm"
              disabled={pending}
              onClick={setDate}
              className="bg-violet-600 hover:bg-violet-700 text-white h-9 text-xs"
            >
              Set System Date
            </Button>
            {systemDateOverride && (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={clearDate}
                className="h-9 text-xs border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400"
              >
                Reset to Real Time
              </Button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Real time: {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </CardContent>
      </Card>

      {/* Global time shift */}
      <Card className="border border-border shadow-sm bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            Global Time Shift
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Shifts all active cycle deadlines simultaneously. Affects: self-assessment window, rating deadline, tentative dates, scheduled meeting date.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {shiftOptions.map((opt) => (
              <Button
                key={opt.label}
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => shift(opt.days)}
                className={`flex items-center gap-1.5 text-xs ${
                  opt.days > 0
                    ? "border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-950/30"
                    : "border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950/30"
                }`}
              >
                {opt.icon}
                {opt.label}
              </Button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Active cycles affected: {activeCycles.length}. Does NOT affect DECIDED or CLOSED cycles.
          </p>
        </CardContent>
      </Card>

      {/* Per-cycle deadline extension */}
      <Card className="border border-border shadow-sm bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarPlus className="size-4 text-amber-500" />
            Per-Cycle Deadline Extension
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Extend the rating deadline for a specific cycle. Sends notifications to assigned reviewers.
          </p>
        </CardHeader>
        <CardContent>
          {activeCycles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No active cycles</p>
          ) : (
            <div className="space-y-3">
              {activeCycles.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{c.employeeName}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {c.status.replace(/_/g, " ")}
                      {c.ratingDeadline ? ` · Deadline: ${new Date(c.ratingDeadline).toLocaleDateString("en-IN")}` : ""}
                      {c.scheduledDate ? ` · Meeting: ${new Date(c.scheduledDate).toLocaleDateString("en-IN")}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      type="number"
                      min={1}
                      max={14}
                      value={extendDays[c.id] ?? "3"}
                      onChange={(e) => setExtendDays((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      className="w-16 h-7 text-xs text-center"
                    />
                    <span className="text-xs text-muted-foreground">days</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => extend(c.id)}
                      className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
                    >
                      Extend
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger zone — delete all cycles */}
      <Card className="border border-red-300 dark:border-red-800 shadow-sm bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-red-600 dark:text-red-400">
            <Trash2 className="size-4" />
            Danger Zone — Reset All Appraisal Data
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Permanently deletes <strong>all appraisal cycles</strong> and every related record (self-assessments, ratings, decisions, votes, MOMs, extensions, disagreements). Cannot be undone. Dev / testing use only.
          </p>
        </CardHeader>
        <CardContent>
          {!deleteConfirm ? (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setDeleteConfirm(true)}
              className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30 text-xs h-8"
            >
              <Trash2 className="size-3.5 mr-1.5" />
              Delete All Cycles
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                Are you sure? This will wipe ALL appraisal history permanently.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={deleteAllCycles}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs h-8"
                >
                  Yes, delete everything
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setDeleteConfirm(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Safety note */}
      <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
        <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
        <div className="text-xs text-red-700 dark:text-red-400">
          <span className="font-semibold">Safety: </span>
          These controls modify real database dates. Use only in development or admin-enabled testing mode. Changes are logged in the audit trail.
        </div>
      </div>
    </div>
  );
}
