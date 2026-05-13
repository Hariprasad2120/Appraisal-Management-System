"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { forceMarkAvailableAction } from "./actions";
import { Zap } from "lucide-react";

export function ForceAvailableButton({ assignmentId }: { assignmentId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function forceAvailable() {
    startTransition(async () => {
      const res = await forceMarkAvailableAction(assignmentId);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Reviewer force-marked as Available — they have been notified");
      router.refresh();
    });
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={forceAvailable}
      disabled={pending}
      className="h-7 text-xs border-amber-400 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
    >
      <Zap className="size-3 mr-1" />
      {pending ? "Forcing..." : "Force Available"}
    </Button>
  );
}
