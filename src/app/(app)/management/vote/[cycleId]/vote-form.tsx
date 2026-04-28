"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { proposeTentativeDatesAction, finalizeMeetingDateAction } from "./actions";

export function VoteForm({
  cycleId,
  mode,
  initial1,
  initial2,
}: {
  cycleId: string;
  mode: "propose" | "finalize";
  initial1?: string | null;
  initial2?: string | null;
}) {
  const [date1, setDate1] = useState(initial1 ?? "");
  const [date2, setDate2] = useState(initial2 ?? "");
  const [finalDate, setFinalDate] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minStr = minDate.toISOString().split("T")[0];

  function submit() {
    startTransition(async () => {
      const res =
        mode === "propose"
          ? await proposeTentativeDatesAction({ cycleId, date1, date2 })
          : await finalizeMeetingDateAction({ cycleId, finalDate });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(mode === "propose" ? "Tentative dates proposed" : "Final date set");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {mode === "propose" ? (
        <>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tentative date 1</label>
            <input
              type="date"
              value={date1}
              onChange={(e) => setDate1(e.target.value)}
              min={minStr}
              className="mt-1 w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tentative date 2</label>
            <input
              type="date"
              value={date2}
              onChange={(e) => setDate2(e.target.value)}
              min={minStr}
              className="mt-1 w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button onClick={submit} disabled={pending || !date1 || !date2} className="w-full">
            {pending ? "Saving..." : "Propose Dates"}
          </Button>
        </>
      ) : (
        <>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Select final date</label>
            <input
              type="date"
              value={finalDate}
              onChange={(e) => setFinalDate(e.target.value)}
              min={minStr}
              className="mt-1 w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button onClick={submit} disabled={pending || !finalDate} className="w-full">
            {pending ? "Saving..." : "Finalize Date"}
          </Button>
        </>
      )}
    </div>
  );
}
