"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { saveMomManagementAction } from "./actions";
import { FileText, Save, IndianRupee } from "lucide-react";

export function ManagementMomEditor({
  cycleId,
  existingContent,
  isNew,
  originalFinalAmount,
}: {
  cycleId: string;
  existingContent: string;
  isNew: boolean;
  originalFinalAmount: number;
}) {
  const [content, setContent] = useState(existingContent);
  const [negotiated, setNegotiated] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    const negotiatedAmount = negotiated.trim() ? Number(negotiated.replace(/[^0-9.]/g, "")) : undefined;
    if (negotiated.trim() && (isNaN(negotiatedAmount!) || negotiatedAmount! < 0)) {
      toast.error("Enter a valid negotiated amount");
      return;
    }
    startTransition(async () => {
      const res = await saveMomManagementAction({ cycleId, content, negotiatedAmount });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(isNew ? "Final meeting recorded" : "Minutes updated", {
        description: isNew
          ? "Salary has been updated and the cycle is now closed."
          : "The meeting record has been saved.",
      });
    });
  }

  const negotiatedNum = negotiated.trim() ? Number(negotiated.replace(/[^0-9.]/g, "")) : null;
  const effectiveAmount = negotiatedNum && negotiatedNum > 0 ? negotiatedNum : originalFinalAmount;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <FileText className="size-4" />
        <span>{isNew ? "Record MOM" : "Edit MOM"} - finalizes the cycle and updates salary</span>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={16}
        className="font-mono text-sm resize-y"
        placeholder="Record the minutes of the appraisal meeting..."
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3 dark:border-amber-800 dark:bg-amber-950/20">
        <div className="flex items-center gap-2 text-sm font-normal text-amber-700 dark:text-amber-400">
          <IndianRupee className="size-4" />
          Negotiated Increment (optional)
        </div>
        <p className="text-xs text-amber-600 dark:text-amber-500">
          If a different increment was agreed during the meeting, enter it here. This will override the management decision amount.
          Leave blank to use the original decision: <strong>Rs. {originalFinalAmount.toLocaleString("en-IN")}/yr</strong>.
        </p>
        <div className="space-y-1">
          <Label className="text-xs text-amber-700 dark:text-amber-400">Final Agreed Increment (Rs./yr)</Label>
          <input
            type="number"
            min={0}
            step={1000}
            value={negotiated}
            onChange={(e) => setNegotiated(e.target.value)}
            placeholder={`Original: ${originalFinalAmount.toLocaleString("en-IN")}`}
            className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-amber-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
        {negotiatedNum !== null && negotiatedNum > 0 && negotiatedNum !== originalFinalAmount && (
          <p className="text-xs font-normal text-amber-700 dark:text-amber-400">
            Effective increment: Rs. {effectiveAmount.toLocaleString("en-IN")}/yr
            {negotiatedNum > originalFinalAmount ? " (increased)" : " (reduced)"}
          </p>
        )}
      </div>

      <Button onClick={save} disabled={pending} className="flex items-center gap-2 w-full h-11">
        <Save className="size-4" />
        {pending ? "Saving..." : isNew ? "Publish MOM & Finalize Salary" : "Update MOM"}
      </Button>
    </div>
  );
}
