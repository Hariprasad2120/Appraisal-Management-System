"use client";

import { useState, useEffect, useCallback } from "react";
import { FadeIn } from "@/components/motion-div";
import { Users, Check, X, Loader2, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface OtRecord {
  id: string;
  employee: { id: string; name: string; employeeNumber: number | null; department: string | null; reportingManagerId: string | null; reportingManager?: { reportingManagerId: string | null } | null };
  attendanceDate: string;
  dayType: string;
  hoursWorked: number;
  otHours: number;
  otAmount: number;
  compOffDays: number;
  earlyLeavingMins: number;
  regularizedPenaltyMins: number;
  adjustedOtMins: number;
  tlApprovalStatus: string;
  managerApprovalStatus: string;
}

type GroupedOt = {
  employeeId: string;
  employeeName: string;
  department: string | null;
  totalOtMins: number;
  totalOtAmount: number;
  totalCompOffDays: number;
  records: OtRecord[];
}

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function TeamOtApprovalsPage() {
  const { data: session } = useSession();
  const [month, setMonth] = useState(currentMonth());
  const [records, setRecords] = useState<OtRecord[]>([]);
  const [groupedRecords, setGroupedRecords] = useState<GroupedOt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const params = new URLSearchParams({ month });
      const r = await fetch(`/api/ot/team-approvals?${params}`);
      const data: OtRecord[] = await r.json();
      setRecords(data);
      
      const grouped = Object.values(data.reduce((acc, rec) => {
        if (!acc[rec.employee.id]) {
          acc[rec.employee.id] = {
            employeeId: rec.employee.id,
            employeeName: rec.employee.name,
            department: rec.employee.department,
            totalOtMins: 0,
            totalOtAmount: 0,
            totalCompOffDays: 0,
            records: []
          };
        }
        acc[rec.employee.id].totalOtMins += Math.round(Number(rec.otHours || 0) * 60) + Number(rec.adjustedOtMins || 0);
        acc[rec.employee.id].totalOtAmount += Number(rec.otAmount || 0);
        acc[rec.employee.id].totalCompOffDays += Number(rec.compOffDays || 0);
        acc[rec.employee.id].records.push(rec);
        return acc;
      }, {} as Record<string, GroupedOt>));
      
      setGroupedRecords(grouped);
    } finally {
      setLoading(false);
    }
  }, [month]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  function toggleSelectEmployee(empId: string) {
    const empGroup = groupedRecords.find(g => g.employeeId === empId);
    if (!empGroup) return;
    
    // Only select records that are still pending for this user
    const pendingIds = empGroup.records.filter(r => {
      if (r.employee.reportingManagerId === session?.user?.id) return r.tlApprovalStatus === "PENDING";
      if (r.employee.reportingManager?.reportingManagerId === session?.user?.id) return r.managerApprovalStatus === "PENDING";
      return false;
    }).map(r => r.id);

    const allSelected = pendingIds.length > 0 && pendingIds.every(id => selected.has(id));
    
    setSelected(s => {
      const n = new Set(s);
      pendingIds.forEach(id => {
        if (allSelected) n.delete(id);
        else n.add(id);
      });
      return n;
    });
  }

  async function handleAction(ids: string[], action: "APPROVE" | "REJECT") {
    if (ids.length === 0) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/ot/team-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Failed");
      toast.success(`${data.updated} record(s) ${action === "APPROVE" ? "Approved" : "Rejected"}`);
      fetchRecords();
    } catch {
      toast.error("Action failed");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <FadeIn>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
              <Users className="size-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="ds-h1">Team OT Approvals</h1>
              <p className="ds-body mt-0.5">Approve overtime and comp-off for your team</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {selected.size > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction([...selected], "APPROVE")}
                  disabled={processing}
                  className="inline-flex items-center gap-1.5 bg-teal-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-60"
                >
                  {processing ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
                  Approve {selected.size}
                </button>
                <button
                  onClick={() => handleAction([...selected], "REJECT")}
                  disabled={processing}
                  className="inline-flex items-center gap-1.5 bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  <X className="size-4" /> Reject {selected.size}
                </button>
              </div>
            )}
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : groupedRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No pending approvals for your team this month.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {groupedRecords.map(group => {
                const isTL = group.records.some(r => r.employee.reportingManagerId === session?.user?.id);
                const isManager = group.records.some(r => r.employee.reportingManager?.reportingManagerId === session?.user?.id);
                
                const pendingCount = group.records.filter(r => 
                  (isTL && r.tlApprovalStatus === "PENDING") || 
                  (isManager && r.managerApprovalStatus === "PENDING")
                ).length;

                return (
                  <div key={group.employeeId} className="flex flex-col p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="font-semibold text-foreground text-lg">{group.employeeName}</div>
                        <div className="text-sm text-muted-foreground">{group.department ?? "No Department"} • {pendingCount} Pending Request(s)</div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block uppercase font-medium">Total OT</span>
                          <span className="font-mono text-lg font-bold text-primary">{Math.floor(group.totalOtMins / 60)}h {group.totalOtMins % 60}m</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block uppercase font-medium">Comp-Off</span>
                          <span className="font-mono text-lg font-bold">{group.totalCompOffDays.toFixed(2)} days</span>
                          {group.totalCompOffDays > 0 && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block uppercase mt-1">Special TL & HR Approval Req.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {pendingCount > 0 ? (
                      <div className="flex justify-end gap-3 mt-2">
                        <button 
                          onClick={() => toggleSelectEmployee(group.employeeId)}
                          className="text-sm text-muted-foreground hover:text-foreground font-medium px-3 py-1.5 rounded-lg border border-border"
                        >
                          Select All Pending
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end mt-2">
                        <span className="text-sm text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-3 py-1 rounded-full font-medium flex items-center gap-1"><Check className="size-3.5"/> All Approved</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
