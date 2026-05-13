"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { requestExtensionAction } from "./extension-actions";
import { Clock } from "lucide-react";

export function ExtensionRequestForm({ cycleId }: { cycleId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!reason.trim()) { toast.error("Reason is required"); return; }
    startTransition(async () => {
      const res = await requestExtensionAction({ cycleId, reason });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Extension request submitted — pending admin approval");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1.5 underline-offset-2 underline"
      >
        <Clock className="size-3.5" /> Request time extension (up to 2 days)
      </button>
    );
  }

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3 bg-white dark:bg-slate-900">
      <p className="text-sm font-medium text-slate-900 dark:text-white">Request Extension (up to 2 business days)</p>
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder="Provide a reason for the extension..."
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending ? "Submitting..." : "Submit Request"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
