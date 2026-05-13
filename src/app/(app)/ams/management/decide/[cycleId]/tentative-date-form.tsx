"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { submitTentativeDatesAction } from "./actions";
import { CalendarDays } from "lucide-react";

function addBusinessDays(from: Date, days: number): Date {
  let count = 0;
  const d = new Date(from);
  while (count < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return d;
}

function toLocalDatetimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
}

export function TentativeDateForm({
  cycleId,
  decidedAt,
}: {
  cycleId: string;
  decidedAt: string;
}) {
  const decided = new Date(decidedAt);
  const maxDate = addBusinessDays(decided, 30);
  const minDate = new Date(decided);
  minDate.setDate(minDate.getDate() + 1);

  const maxDateStr = toLocalDatetimeValue(maxDate).slice(0, 10);
  const minDateStr = toLocalDatetimeValue(minDate).slice(0, 10);

  const [date1, setDate1] = useState("");
  const [date2, setDate2] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!date1 || !date2) {
      toast.error("Both tentative dates are required");
      return;
    }
    if (date1 === date2) {
      toast.error("Tentative dates must be different");
      return;
    }
    startTransition(async () => {
      const res = await submitTentativeDatesAction({
        cycleId,
        tentativeDate1: new Date(date1).toISOString(),
        tentativeDate2: new Date(date2).toISOString(),
      });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Tentative dates submitted — HR has been notified to confirm");
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Propose 2 tentative meeting dates within <strong>30 business days</strong> of the decision
        (by <strong>{maxDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong>).
        HR will select the confirmed date and notify all parties.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5">
            <CalendarDays className="size-3" /> Option 1
          </Label>
          <input
            type="date"
            min={minDateStr}
            max={maxDateStr}
            value={date1}
            onChange={(e) => setDate1(e.target.value)}
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5">
            <CalendarDays className="size-3" /> Option 2
          </Label>
          <input
            type="date"
            min={minDateStr}
            max={maxDateStr}
            value={date2}
            onChange={(e) => setDate2(e.target.value)}
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <Button onClick={submit} disabled={pending} className="w-full sm:w-auto">
        {pending ? "Submitting..." : "Propose Dates & Notify HR"}
      </Button>
    </div>
  );
}
