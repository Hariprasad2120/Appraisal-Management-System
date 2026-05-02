"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { approveArrearAction, rejectArrearAction } from "./actions";
import { CalendarDays, User, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

type ArrearCardProps = {
  arrear: {
    id: string;
    cycleId: string;
    arrearDays: number;
    arrearAmount: number;
    dailyRate: number;
    periodFrom: string;
    periodTo: string;
    user: { id: string; name: string; department: string | null; designation: string | null };
    cycle: {
      id: string;
      type: string;
      scheduledDate: string | null;
      self: { submittedAt: string | null } | null;
      decision: { finalAmount: number; finalRating: number } | null;
    };
  };
};

export function ArrearApprovalCard({ arrear }: ArrearCardProps) {
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [payoutMonth, setPayoutMonth] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [pending, startTransition] = useTransition();

  function handleApprove() {
    if (!payoutMonth) {
      toast.error("Select payout month");
      return;
    }
    const payoutDate = new Date(payoutMonth + "-01");
    payoutDate.setUTCHours(0, 0, 0, 0);
    startTransition(async () => {
      const res = await approveArrearAction({
        cycleId: arrear.cycleId,
        payoutMonth: payoutDate.toISOString(),
      });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Arrear approved");
    });
  }

  function handleReject() {
    if (!rejectReason.trim() || rejectReason.length < 10) {
      toast.error("Provide a reason (min 10 chars)");
      return;
    }
    startTransition(async () => {
      const res = await rejectArrearAction({ cycleId: arrear.cycleId, reason: rejectReason });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Arrear rejected");
    });
  }

  const arrearAmt = arrear.arrearAmount;
  const dailyRateNum = arrear.dailyRate;
  const finalAmt = arrear.cycle.decision?.finalAmount ?? 0;

  return (
    <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <User className="size-4 text-slate-400" />
              <Link
                href={`/admin/employees/${arrear.user.id}/assign`}
                className="font-semibold text-slate-900 transition-colors hover:text-primary hover:underline dark:text-white"
              >
                {arrear.user.name}
              </Link>
              {arrear.user.department && (
                <span className="text-xs text-slate-500">· {arrear.user.department}</span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {arrear.cycle.type} Appraisal ·{" "}
              {arrear.cycle.scheduledDate
                ? new Date(arrear.cycle.scheduledDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 shrink-0">
            Pending Approval
          </span>
        </div>

        {/* Arrear details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
            <p className="text-xs text-slate-500">Arrear Days</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{arrear.arrearDays}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
            <p className="text-xs text-slate-500">Arrear Amount</p>
            <p className="text-lg font-bold text-teal-700 dark:text-teal-400">
              ₹{arrearAmt.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
            <p className="text-xs text-slate-500">Daily Rate</p>
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
              ₹{dailyRateNum.toFixed(2)}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
            <p className="text-xs text-slate-500">Annual Increment</p>
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
              ₹{finalAmt.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CalendarDays className="size-3.5" />
          <span>
            Period:{" "}
            <strong className="text-slate-700 dark:text-slate-300">
              {new Date(arrear.periodFrom).toLocaleDateString("en-IN")}
            </strong>{" "}
            to{" "}
            <strong className="text-slate-700 dark:text-slate-300">
              {new Date(arrear.periodTo).toLocaleDateString("en-IN")}
            </strong>
          </span>
        </div>

        {/* Action buttons */}
        {!action && (
          <div className="flex gap-3 pt-1">
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => setAction("approve")}
              disabled={pending}
            >
              <CheckCircle2 className="size-3.5 mr-1.5" />
              Approve Arrear
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
              onClick={() => setAction("reject")}
              disabled={pending}
            >
              <XCircle className="size-3.5 mr-1.5" />
              Reject
            </Button>
          </div>
        )}

        {/* Approve form */}
        {action === "approve" && (
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              Approve ₹{arrearAmt.toLocaleString("en-IN")} arrear for {arrear.arrearDays} days
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Payout Month</Label>
              <input
                type="month"
                value={payoutMonth}
                onChange={(e) => setPayoutMonth(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-xs text-slate-500">Month in which arrear will be credited to employee.</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleApprove} disabled={pending}>
                {pending ? "Approving…" : "Confirm Approval"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAction(null)} disabled={pending}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Reject form */}
        {action === "reject" && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">Provide rejection reason</p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Explain why the arrear is not approved…"
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleReject}
                disabled={pending}
              >
                {pending ? "Rejecting…" : "Confirm Rejection"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAction(null)} disabled={pending}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
