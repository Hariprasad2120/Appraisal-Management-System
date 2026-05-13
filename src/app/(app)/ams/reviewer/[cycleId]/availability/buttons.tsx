"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { submitAvailabilityAction } from "./actions";
import { CheckCircle, XCircle } from "lucide-react";

export function AvailabilityButtons({ assignmentId }: { assignmentId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(choice: "AVAILABLE" | "NOT_AVAILABLE") {
    startTransition(async () => {
      const res = await submitAvailabilityAction({ assignmentId, choice });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(choice === "AVAILABLE" ? "Marked as available — you'll receive rating access" : "Marked not available — admin will be notified");
      router.push("/ams/reviewer");
      router.refresh();
    });
  }

  return (
    <div className="flex gap-3">
      <Button
        disabled={pending}
        onClick={() => submit("AVAILABLE")}
        className="flex-1 h-11 bg-green-600 hover:bg-green-700"
      >
        <CheckCircle className="size-4 mr-2" />
        Available
      </Button>
      <Button
        disabled={pending}
        variant="outline"
        onClick={() => submit("NOT_AVAILABLE")}
        className="flex-1 h-11 border-red-200 text-red-600 hover:bg-red-50"
      >
        <XCircle className="size-4 mr-2" />
        Not Available
      </Button>
    </div>
  );
}
