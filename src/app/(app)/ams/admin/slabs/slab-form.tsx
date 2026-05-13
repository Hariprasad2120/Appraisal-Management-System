"use client";

import { useActionState } from "react";
import { createSlabAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export function SlabForm() {
  const [grade, setGrade] = useState<string>("");
  const [tier, setTier] = useState<string>("ALL");

  const [state, action, pending] = useActionState(
    async (_prev: unknown, fd: FormData) => {
      fd.set("grade", grade);
      fd.set("salaryTier", tier);
      return createSlabAction(fd);
    },
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label>Label</Label>
        <Input name="label" placeholder="e.g. Grade A+ (≤15k)" className="mt-1" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Grade</Label>
          <Select value={grade} onValueChange={(v) => setGrade(v ?? "")}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select grade" />
            </SelectTrigger>
            <SelectContent>
              {["A+", "A", "B+", "B", "C+", "C", "D"].map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Salary Tier</Label>
          <Select value={tier} onValueChange={(v) => setTier(v ?? "ALL")}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="UPTO_15K">≤ ₹15,000/mo</SelectItem>
              <SelectItem value="BTW_15K_30K">₹15,001–30,000/mo</SelectItem>
              <SelectItem value="ABOVE_30K">&gt; ₹30,000/mo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Min Rating (0–100)</Label>
          <Input name="minRating" type="number" step="1" min="0" max="100" placeholder="0" className="mt-1" required />
        </div>
        <div>
          <Label>Max Rating (0–100)</Label>
          <Input name="maxRating" type="number" step="1" min="0" max="100" placeholder="100" className="mt-1" required />
        </div>
      </div>
      <div>
        <Label>Hike %</Label>
        <Input name="hikePercent" type="number" step="0.1" min="0" max="100" placeholder="10" className="mt-1" required />
      </div>
      {state && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}
      {state && state.ok && <p className="text-sm text-green-600">Slab created.</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving..." : "Add Slab"}
      </Button>
    </form>
  );
}
