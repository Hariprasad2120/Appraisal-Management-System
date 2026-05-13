"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { requestRescheduleAction } from "./actions";
import { CalendarDays } from "lucide-react";

export function RescheduleForm({ cycleId, employeeName }: { cycleId: string; employeeName: string }) {
  const [newDate, setNewDate] = useState("");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (!newDate) {
      toast.error("Select a new meeting date");
      return;
    }
    if (!reason.trim() || reason.trim().length < 10) {
      toast.error("Reason must be at least 10 characters");
      return;
    }

    // Convert date-only input to ISO datetime (start of day UTC)
    const dateObj = new Date(newDate + "T00:00:00.000Z");

    startTransition(async () => {
      const res = await requestRescheduleAction({
        cycleId,
        newDate: dateObj.toISOString(),
        reason: reason.trim(),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Meeting rescheduled for ${employeeName}. All parties notified.`);
      setNewDate("");
      setReason("");
    });
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm">New Meeting Date</Label>
        <input
          type="date"
          value={newDate}
          min={minDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm">Reason for Rescheduling</Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why the meeting needs to be rescheduled (min 10 characters)…"
          rows={3}
          className="text-sm resize-none"
        />
        <p className="text-xs text-slate-500">{reason.trim().length}/1000</p>
      </div>

      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
        <p className="font-medium">Notifications will be sent to:</p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>Employee ({employeeName})</li>
          <li>All assigned reviewers</li>
          <li>All Admin users</li>
          <li>All Management users</li>
        </ul>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={pending || !newDate || reason.trim().length < 10}
        className="bg-teal-600 hover:bg-teal-700 text-white"
      >
        <CalendarDays className="size-4 mr-2" />
        {pending ? "Rescheduling…" : "Confirm Reschedule"}
      </Button>
    </div>
  );
}
