"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTicketAction } from "./actions";
import { Plus, ChevronDown } from "lucide-react";

const CATEGORIES = [
  "Self-Assessment Form",
  "Reviewer / Rating",
  "Availability Confirmation",
  "Extension Request",
  "Notifications",
  "Login / Access",
  "Salary / Increment",
  "Technical Issue",
  "Other",
];

const PRIORITIES = [
  { value: "LOW", label: "Low", color: "text-slate-500" },
  { value: "MEDIUM", label: "Medium", color: "text-amber-600" },
  { value: "HIGH", label: "High", color: "text-orange-600" },
  { value: "URGENT", label: "Urgent", color: "text-red-600" },
] as const;

export function TicketForm() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (title.trim().length < 5) { toast.error("Title too short (min 5 chars)"); return; }
    if (!description.trim() || description.trim().length < 10) { toast.error("Description too short (min 10 chars)"); return; }
    if (!category) { toast.error("Select a category"); return; }

    startTransition(async () => {
      const res = await createTicketAction({ title: title.trim(), description: description.trim(), category, priority });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Ticket submitted", {
        description: "The admin team has been notified.",
      });
      setTitle(""); setDescription(""); setCategory(""); setPriority("MEDIUM");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm font-medium text-[#00cec4] hover:text-[#008993] transition-colors"
      >
        <Plus className="size-4" /> Raise a new support ticket
      </button>
    );
  }

  return (
    <Card className="border-0 shadow-sm border-l-4 border-l-[#00cec4]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">New Support Ticket</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief summary of the issue..."
            maxLength={200}
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00cec4]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <span className={p.color}>{p.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe the issue in detail — what happened, what you expected, steps to reproduce..."
            className="resize-none"
          />
        </div>

        <div className="flex gap-3">
          <Button onClick={submit} disabled={pending} className="flex-1">
            {pending ? "Submitting..." : "Submit Ticket"}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
