"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fastForwardSelfAssessmentAction } from "./actions";

type Props = {
  cycleId: string;
  editableUntil: string;
  submittedAt: string | null;
};

export function DemoControls({ cycleId, editableUntil, submittedAt }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function fastForward() {
    startTransition(async () => {
      const result = await fastForwardSelfAssessmentAction(cycleId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
      toast.success("Self-assessment window closed for demo testing");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demo Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          Current self-assessment deadline:{" "}
          <b suppressHydrationWarning>{new Date(editableUntil).toLocaleString()}</b>
        </div>
        <div>
          Submission state: <b>{submittedAt ? "Submitted" : "Pending"}</b>
        </div>
        <Button onClick={fastForward} disabled={pending}>
          {pending ? "Updating..." : "Fast-forward 3 business days"}
        </Button>
        <p className="text-muted-foreground">
          This closes the self-assessment window immediately so reviewers can move to rating once
          availability is complete.
        </p>
      </CardContent>
    </Card>
  );
}
