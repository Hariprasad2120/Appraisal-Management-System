"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Save } from "lucide-react";

interface Props {
  cycleId: string;
  existingContent: string;
  isNew: boolean;
  saveAction: (input: { cycleId: string; content: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
  successMessage?: string;
}

export function MomContentEditor({ cycleId, existingContent, isNew, saveAction, successMessage }: Props) {
  const [content, setContent] = useState(existingContent);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await saveAction({ cycleId, content });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(successMessage ?? (isNew ? "MOM recorded" : "MOM updated"));
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <FileText className="size-4" />
        <span>{isNew ? "Record MOM" : "Edit MOM"}</span>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={16}
        className="font-mono text-sm resize-y"
        placeholder="Record the minutes of the appraisal meeting..."
      />

      <Button onClick={save} disabled={pending} className="flex items-center gap-2 w-full h-11">
        <Save className="size-4" />
        {pending ? "Saving..." : isNew ? "Save MOM" : "Update MOM"}
      </Button>
    </div>
  );
}
