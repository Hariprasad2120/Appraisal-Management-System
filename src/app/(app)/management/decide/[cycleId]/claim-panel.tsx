"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { claimAppraisalAction } from "./actions";

export function ClaimPanel({
  cycleId,
}: {
  cycleId: string;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">Management Review</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Claim this appraisal to lock it for your review.
        </div>
      </div>
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await claimAppraisalAction(cycleId);
            if (!res.ok) {
              toast.error(res.error ?? "Failed");
              return;
            }
            toast.success("Claimed");
            window.location.reload();
          })
        }
      >
        {pending ? "Claiming..." : "Claim"}
      </Button>
    </div>
  );
}

