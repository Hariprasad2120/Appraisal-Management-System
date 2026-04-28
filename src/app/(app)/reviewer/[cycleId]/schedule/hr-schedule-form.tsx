"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { hrSelectScheduledDateAction } from "@/app/(app)/management/decide/[cycleId]/actions";
import { CalendarDays } from "lucide-react";

export function HrScheduleForm({
  cycleId,
  tentativeDate1,
  tentativeDate2,
  employeeName,
}: {
  cycleId: string;
  tentativeDate1: string;
  tentativeDate2: string;
  employeeName: string;
}) {
  const d1 = new Date(tentativeDate1);
  const d2 = new Date(tentativeDate2);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const defaultMessage = selectedDate
    ? `Your appraisal meeting has been scheduled for ${new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}. Please be available at the scheduled time. — HR`
    : "";

  function submit() {
    if (!selectedDate) {
      toast.error("Select one of the proposed dates");
      return;
    }
    const finalMsg = message.trim() || defaultMessage;
    if (!finalMsg.trim()) {
      toast.error("Notification message is required");
      return;
    }
    startTransition(async () => {
      const res = await hrSelectScheduledDateAction({
        cycleId,
        selectedDate: new Date(selectedDate).toISOString(),
        notificationMessage: finalMsg,
      });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Date confirmed — notifications sent to management, admin and employee");
      router.push(`/reviewer/${cycleId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-500">
        Management proposed 2 dates for <strong>{employeeName}</strong>&apos;s appraisal meeting.
        Select one and compose a notification that will be sent to management, admin, and the employee.
      </p>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide">Select Confirmed Date</Label>
        <div className="space-y-2">
          {[d1, d2].map((d, i) => (
            <label
              key={i}
              className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                selectedDate === d.toISOString()
                  ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30"
                  : "border-slate-200 dark:border-slate-700 hover:border-blue-300"
              }`}
            >
              <input
                type="radio"
                name="selectedDate"
                value={d.toISOString()}
                checked={selectedDate === d.toISOString()}
                onChange={() => {
                  setSelectedDate(d.toISOString());
                  if (!message) setMessage(`Your appraisal meeting has been scheduled for ${fmt(d)}. Please be available at the scheduled time. — HR`);
                  else setMessage(`Your appraisal meeting has been scheduled for ${fmt(d)}. Please be available at the scheduled time. — HR`);
                }}
                className="accent-blue-600 shrink-0"
              />
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-blue-500 shrink-0" />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{fmt(d)}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide">Notification Message</Label>
        <p className="text-[10px] text-slate-400">This message will be sent to management, admin, and the employee.</p>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="e.g. Your appraisal meeting is scheduled for Monday, 5 May 2026 at 10:00 AM in Conference Room 2. Please be prepared with your self-assessment summary. — HR"
          className="resize-none text-sm"
        />
      </div>

      <Button onClick={submit} disabled={pending} className="w-full h-11">
        {pending ? "Confirming..." : "Confirm Date & Send Notification"}
      </Button>
    </div>
  );
}
