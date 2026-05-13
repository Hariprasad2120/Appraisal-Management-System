"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateHikePercentAction } from "./actions";
import { TrendingUp } from "lucide-react";

export function HikeEditForm({
  cycleId,
  currentHikePercent,
  grossAnnum,
}: {
  cycleId: string;
  currentHikePercent: number;
  grossAnnum: number;
}) {
  const [hikeInput, setHikeInput] = useState(String(currentHikePercent));
  const [hikePercent, setHikePercent] = useState(currentHikePercent);
  const [pending, startTransition] = useTransition();

  const increment = Math.round(grossAnnum * hikePercent / 100);
  const newGross = grossAnnum + increment;

  function handleInput(val: string) {
    setHikeInput(val);
    const n = parseFloat(val);
    if (!isNaN(n) && n >= 0 && n <= 100) setHikePercent(n);
  }

  function submit() {
    const n = parseFloat(hikeInput);
    if (isNaN(n) || n < 0 || n > 100) {
      toast.error("Hike % must be between 0 and 100");
      return;
    }
    startTransition(async () => {
      const res = await updateHikePercentAction({ cycleId, hikePercent: n });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Hike percentage updated");
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={hikeInput}
          onChange={(e) => handleInput(e.target.value)}
          className="w-28 text-base font-bold"
        />
        <span className="text-sm text-slate-500">%</span>
        {hikePercent > 0 && (
          <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-3 py-1.5">
            <TrendingUp className="size-3.5 shrink-0" />
            <span>{hikePercent}% = +₹{increment.toLocaleString("en-IN")}/yr → New Gross ₹{newGross.toLocaleString("en-IN")}/yr</span>
          </div>
        )}
      </div>
      <Button onClick={submit} disabled={pending} size="sm" className="h-8 text-xs">
        {pending ? "Updating..." : "Update Hike %"}
      </Button>
    </div>
  );
}
