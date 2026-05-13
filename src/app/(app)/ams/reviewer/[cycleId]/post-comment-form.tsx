"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addPostCommentAction } from "./rate/actions";
import { MessageSquarePlus } from "lucide-react";

export function PostCommentForm({
  ratingId,
  existingComment,
}: {
  ratingId: string;
  existingComment: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState(existingComment ?? "");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!comment.trim()) { toast.error("Comment cannot be empty"); return; }
    startTransition(async () => {
      const res = await addPostCommentAction(ratingId, comment);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Post-submission comment saved");
      setOpen(false);
    });
  }

  if (existingComment && !open) {
    return (
      <div className="border border-amber-200 dark:border-amber-800 rounded-lg p-3 bg-amber-50 dark:bg-amber-950/30 space-y-2">
        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Post-submission note</p>
        <p className="text-sm text-slate-700 dark:text-slate-300">{existingComment}</p>
        <button onClick={() => setOpen(true)} className="text-xs text-amber-600 underline">Edit</button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1.5 underline-offset-2 underline"
      >
        <MessageSquarePlus className="size-3.5" />
        Add post-submission comment (salary note)
      </button>
    );
  }

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3 bg-white dark:bg-slate-900">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-white">Post-Submission Comment</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Does not change the rating average. Recorded for salary negotiation purposes.
        </p>
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="E.g. This rating may under-value the employee's salary impact due to..."
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={pending}>
          {pending ? "Saving..." : "Save Comment"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
