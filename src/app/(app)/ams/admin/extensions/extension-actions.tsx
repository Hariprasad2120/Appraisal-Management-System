"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { decideExtensionAction } from "./actions";
import { CheckCircle, XCircle } from "lucide-react";

export function ExtensionActions({ extensionId }: { extensionId: string }) {
  const [pending, startTransition] = useTransition();

  function decide(decision: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      const res = await decideExtensionAction(extensionId, decision);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Extension ${decision.toLowerCase()}`);
    });
  }

  return (
    <div className="flex gap-2 shrink-0">
      <Button
        size="sm"
        variant="outline"
        className="text-green-600 border-green-200 hover:bg-green-50 h-8 px-3"
        onClick={() => decide("APPROVED")}
        disabled={pending}
      >
        <CheckCircle className="size-3.5 mr-1" />
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="text-red-600 border-red-200 hover:bg-red-50 h-8 px-3"
        onClick={() => decide("REJECTED")}
        disabled={pending}
      >
        <XCircle className="size-3.5 mr-1" />
        Reject
      </Button>
    </div>
  );
}
