"use client";

import { useState, useEffect } from "react";
import { FadeIn } from "@/components/motion-div";
import { 
  ClipboardCheck, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Timer, 
  AlertTriangle,
  History
} from "lucide-react";
import { Loader2 } from "lucide-react";

interface OtRecord {
  id: string;
  attendanceDate: string;
  dayType: string;
  hoursWorked: number;
  otHours: number;
  otAmount: number;
  compOffDays: number;
  earlyLeavingMins: number;
  regularizedPenaltyMins: number;
  adjustedOtMins: number;
  approvalStatus: string;
  tlApprovalStatus: string;
  hrApprovalStatus: string;
  attendanceLog: {
    checkIn: string;
    checkOut: string;
    totalHours: number;
    regularizationStatus: string | null;
  }
}

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function EmployeeOtPage() {
  const [month, setMonth] = useState(currentMonth());
  const [records, setRecords] = useState<OtRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/ot/my-records?month=${month}`)
      .then((r) => r.json())
      .then((d) => setRecords(d))
      .finally(() => setLoading(false));
  }, [month]);

  const totalOt = records.reduce((s, r) => s + (Number(r.otHours) + (r.adjustedOtMins/60)), 0);
  const totalComp = records.reduce((s, r) => s + Number(r.compOffDays), 0);
  const totalPayout = records.reduce((s, r) => s + Number(r.otAmount), 0);

  return (
    <div className="space-y-8 max-w-5xl">
      <FadeIn>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-brand-teal/10 flex items-center justify-center">
              <Clock className="size-5 text-brand-teal" />
            </div>
            <div>
              <h1 className="ds-h1">My OT & Comp-Off</h1>
              <p className="ds-body mt-0.5">Track your extra hours, compensation, and approval status</p>
            </div>
          </div>
          <input
            type="month"
            value={month}
            onChange={(e) => {
              setLoading(true);
              setMonth(e.target.value);
            }}
            className="rounded-xl border border-border bg-background px-4 py-2 text-sm focus:ring-2 focus:ring-primary/40 outline-none"
          />
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FadeIn delay={0.1}>
          <div className="ds-card p-5 text-center bg-brand-teal/5 border-brand-teal/20">
            <div className="text-[10px] font-bold text-brand-teal uppercase tracking-widest mb-1">OT Hours</div>
            <div className="text-2xl font-black text-brand-teal">{totalOt.toFixed(1)}h</div>
          </div>
        </FadeIn>
        <FadeIn delay={0.15}>
          <div className="ds-card p-5 text-center bg-brand-amber/5 border-brand-amber/20">
            <div className="text-[10px] font-bold text-brand-amber uppercase tracking-widest mb-1">Comp-Off</div>
            <div className="text-2xl font-black text-brand-amber">{totalComp.toFixed(1)} Days</div>
          </div>
        </FadeIn>
        <FadeIn delay={0.2}>
          <div className="ds-card p-5 text-center bg-brand-cyan/5 border-brand-cyan/20">
            <div className="text-[10px] font-bold text-brand-cyan uppercase tracking-widest mb-1">Est. Payout</div>
            <div className="text-2xl font-black text-brand-cyan">₹{totalPayout.toLocaleString()}</div>
          </div>
        </FadeIn>
      </div>

      <FadeIn delay={0.3}>
        <div className="ds-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            <h2 className="text-xs font-bold uppercase tracking-wider">Attendance & OT History</h2>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-20">
              <Calendar className="size-10 text-muted/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No records found for {month}.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {records.map((rec) => (
                <div key={rec.id} className="p-6 hover:bg-muted/5 transition-colors group">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center justify-center size-12 rounded-xl bg-muted/10 border border-border font-mono">
                        <span className="text-[10px] text-muted-foreground leading-none">
                          {new Date(rec.attendanceDate).toLocaleDateString("en-IN", { month: "short" }).toUpperCase()}
                        </span>
                        <span className="text-lg font-bold text-foreground">
                          {new Date(rec.attendanceDate).getDate()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">
                            {rec.dayType === "WORKING_DAY" ? "Working Day" : rec.dayType}
                          </span>
                          {rec.attendanceLog.regularizationStatus && (
                            <span className="flex items-center gap-1 text-[9px] font-bold bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded uppercase">
                              <AlertTriangle className="size-3" /> Regularized (-75% Penalty)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground font-medium">
                          <span className="flex items-center gap-1"><Timer className="size-3" /> {rec.attendanceLog.totalHours}h Worked</span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span>{rec.attendanceLog.checkIn ? new Date(rec.attendanceLog.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'} to {rec.attendanceLog.checkOut ? new Date(rec.attendanceLog.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-6 items-center">
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Net OT</div>
                        <div className="text-sm font-bold text-brand-teal">{(Number(rec.otHours) + (rec.adjustedOtMins/60)).toFixed(1)}h</div>
                      </div>
                      {rec.compOffDays > 0 && (
                        <div className="text-right">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Comp-Off</div>
                          <div className="text-sm font-bold text-brand-amber">{Number(rec.compOffDays).toFixed(1)}d</div>
                        </div>
                      )}
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Status</div>
                        {rec.approvalStatus === "APPROVED" ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded-full uppercase">
                            <CheckCircle2 className="size-3" /> Approved
                          </span>
                        ) : rec.approvalStatus === "REJECTED" ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full uppercase">
                            <XCircle className="size-3" /> Rejected
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full uppercase">
                            <Timer className="size-3" /> Pending Review
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </FadeIn>

      <FadeIn delay={0.4}>
        <div className="p-4 bg-muted/10 border border-border border-dashed rounded-xl flex items-start gap-3">
          <AlertTriangle className="size-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Policy Note:</strong> Overtime is calculated based on hours worked beyond the 8-hour standard shift plus a 15-minute grace period. Regularized entries are subject to a 75% penalty as per company policy. Comp-off days earned for holidays/weekends are subject to final approval by your Team Lead and HR.
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
