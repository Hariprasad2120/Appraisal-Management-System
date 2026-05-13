"use client";

import { useState, useEffect, useCallback } from "react";
import { FadeIn } from "@/components/motion-div";
import { Layers, Check, X, Loader2, CheckCheck, Edit2, ChevronDown, ChevronRight, FastForward } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = ["", "PENDING", "APPROVED", "REJECTED"] as const;
const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

interface OtRecord {
  id: string;
  employee: { id: string; name: string; employeeNumber: number | null; department: string | null };
  attendanceDate: string;
  dayType: string;
  dayLabel: string;
  holidayName: string | null;
  hoursWorked: number;
  otHours: number;
  otAmount: number;
  compOffDays: number;
  earlyLeavingMins: number;
  regularizedPenaltyMins: number;
  adjustedOtMins: number;
  approvalStatus: string;
  hrApprovalStatus: string;
  rejectionRemarks: string | null;
  checkIn: string | null;
  checkOut: string | null;
  hasAttendance: boolean;
}

type GroupedOt = {
  employeeId: string;
  employeeName: string;
  department: string | null;
  totalOtMins: number;
  totalOtAmount: number;
  totalCompOffDays: number;
  totalEarlyLeaveMins: number;
  totalPenaltyMins: number;
  records: OtRecord[];
}

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

function getDayName(date: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    timeZone: "Asia/Kolkata",
  }).format(new Date(date));
}

function formatAttendanceDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(date));
}

function isSecondOrFourthSaturday(date: Date | string) {
  const d = new Date(date);
  if (d.getDay() !== 6) return false;
  const dayOfMonth = d.getDate();
  const week = Math.ceil(dayOfMonth / 7);
  return week === 2 || week === 4;
}

export default function OtRecordsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [records, setRecords] = useState<OtRecord[]>([]);
  const [groupedRecords, setGroupedRecords] = useState<GroupedOt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [approvingBulk, setApprovingBulk] = useState(false);
  const [forceApprovingBulk, setForceApprovingBulk] = useState(false);
  
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editModal, setEditModal] = useState<OtRecord | null>(null);
  const [editValues, setEditValues] = useState({ adjustedOtMins: 0, earlyLeavingMins: 0, compOffDays: 0 });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const params = new URLSearchParams({ month });
      if (statusFilter) params.set("status", statusFilter);
      const r = await fetch(`/api/ot/records?${params}`);
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
            totalEarlyLeaveMins: 0,
            totalPenaltyMins: 0,
            records: []
          };
        }
        // otHours is stored in decimal hours, so we convert back to mins roughly, 
        // but wait, we have otAmount which is accurate.
        acc[rec.employee.id].totalOtMins += Math.round(Number(rec.otHours || 0) * 60) + Number(rec.adjustedOtMins || 0);
        acc[rec.employee.id].totalOtAmount += Number(rec.otAmount || 0);
        acc[rec.employee.id].totalCompOffDays += Number(rec.compOffDays || 0);
        acc[rec.employee.id].totalEarlyLeaveMins += Number(rec.earlyLeavingMins || 0);
        acc[rec.employee.id].totalPenaltyMins += Number(rec.regularizedPenaltyMins || 0);
        acc[rec.employee.id].records.push(rec);
        return acc;
      }, {} as Record<string, GroupedOt>));
      
      setGroupedRecords(grouped);
    } finally {
      setLoading(false);
    }
  }, [month, statusFilter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  function toggleRow(empId: string) {
    setExpandedRows(s => {
      const n = new Set(s);
      if (n.has(empId)) n.delete(empId);
      else n.add(empId);
      return n;
    });
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleSelectEmployee(empId: string) {
    const empGroup = groupedRecords.find(g => g.employeeId === empId);
    if (!empGroup) return;
    
    const recIds = empGroup.records.map(r => r.id);
    const allSelected = recIds.every(id => selected.has(id));
    
    setSelected(s => {
      const n = new Set(s);
      recIds.forEach(id => {
        if (allSelected) n.delete(id);
        else n.add(id);
      });
      return n;
    });
  }

  async function handleApprove(ids: string[], forceApprove: boolean) {
    if (ids.length === 0) return;
    if (forceApprove) setForceApprovingBulk(true);
    else setApprovingBulk(true);
    
    try {
      const res = await fetch("/api/ot/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, forceApprove }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Failed");
      toast.success(`${data.updated} record(s) ${forceApprove ? 'Force Approved' : 'Forwarded to Team'}`);
      fetchRecords();
    } catch {
      toast.error("Action failed");
    } finally {
      setApprovingBulk(false);
      setForceApprovingBulk(false);
    }
  }

  async function handleReset() {
    if (!confirm("DANGER: Are you sure you want to delete ALL OT and Attendance records? This is for demo reset purposes only!")) return;
    try {
      const res = await fetch("/api/ot/records", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("All OT records have been reset.");
      fetchRecords();
    } catch {
      toast.error("Failed to reset records");
    }
  }

  async function handleSaveEdit() {
    if (!editModal) return;
    try {
      const res = await fetch("/api/ot/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editModal.id,
          adjustedOtMins: editValues.adjustedOtMins,
          earlyLeavingMins: editValues.earlyLeavingMins,
          compOffDays: editValues.compOffDays,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Record adjusted successfully");
      setEditModal(null);
      fetchRecords();
    } catch {
      toast.error("Failed to adjust record");
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <FadeIn>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
              <Layers className="size-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="ds-h1">OT & Comp-Off Records</h1>
              <p className="ds-body mt-0.5">Adjust and approve employee overtime</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              Reset All Records (Demo)
            </button>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s ? STATUS_LABELS[s] : "All Statuses"}</option>
              ))}
            </select>
            {selected.size > 0 && (
              <div className="flex gap-2 ml-2">
                <button
                  onClick={() => handleApprove([...selected], false)}
                  disabled={approvingBulk || forceApprovingBulk}
                  className="inline-flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {approvingBulk ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
                  Forward to Team
                </button>
                <button
                  onClick={() => handleApprove([...selected], true)}
                  disabled={approvingBulk || forceApprovingBulk}
                  className="inline-flex items-center gap-1.5 bg-teal-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-60"
                >
                  {forceApprovingBulk ? <Loader2 className="size-4 animate-spin" /> : <FastForward className="size-4" />}
                  Force Approve
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
              No records found for selected filters.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {groupedRecords.map(group => {
                const isExpanded = expandedRows.has(group.employeeId);
                const allSelected = group.records.every(r => selected.has(r.id));
                const someSelected = group.records.some(r => selected.has(r.id)) && !allSelected;

                return (
                  <div key={group.employeeId} className="flex flex-col">
                    <div 
                      className={`flex items-center gap-4 px-5 py-3 hover:bg-muted/40 transition-colors cursor-pointer ${isExpanded ? "bg-muted/20" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={el => { if (el) el.indeterminate = someSelected; }}
                        onChange={() => toggleSelectEmployee(group.employeeId)}
                        className="rounded"
                        onClick={e => e.stopPropagation()}
                      />
                      <div className="flex-1" onClick={() => toggleRow(group.employeeId)}>
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                          <span className="font-semibold text-foreground">{group.employeeName}</span>
                          <span className="text-xs text-muted-foreground">({group.records.length} records)</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm" onClick={() => toggleRow(group.employeeId)}>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block">Total OT</span>
                          <span className="font-mono font-medium text-primary">{Math.floor(group.totalOtMins / 60)}h {group.totalOtMins % 60}m</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block">Comp-Off</span>
                          <span className="font-mono font-medium">{group.totalCompOffDays.toFixed(2)} days</span>
                          {group.totalCompOffDays > 0 && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block uppercase mt-1">Special TL & HR Approval Req.</span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block">Early Leave</span>
                          <span className="font-mono font-medium text-red-500">{Math.floor(group.totalEarlyLeaveMins / 60)}h {group.totalEarlyLeaveMins % 60}m</span>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="bg-muted/10 border-t border-border px-12 py-3 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-muted-foreground border-b border-border/50">
                              <th className="pb-2 font-medium w-8"></th>
                              <th className="pb-2 font-medium">Date</th>
                              <th className="pb-2 font-medium">Type</th>
                              <th className="pb-2 font-medium">Check-in/out</th>
                              <th className="pb-2 font-medium">Worked</th>
                              <th className="pb-2 font-medium">OT Mins</th>
                              <th className="pb-2 font-medium">Early Mins</th>
                              <th className="pb-2 font-medium">Comp Off</th>
                              <th className="pb-2 font-medium">Status</th>
                              <th className="pb-2 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {group.records.sort((a, b) => new Date(a.attendanceDate).getTime() - new Date(b.attendanceDate).getTime()).map(rec => {
                              const dateObj = new Date(rec.attendanceDate);
                              const isSunday = rec.dayType === "SUNDAY";
                              const isHoliday = rec.dayType === "HOLIDAY";
                              const isOffSat = rec.dayType === "WEEKEND";
                              const isSpecialDay = isSunday || isHoliday || isOffSat;
                              const isCompOffEligible = Number(rec.compOffDays) > 0;
                              
                              const typeLabel = rec.dayLabel || "Working Day";
                              let typeColor = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
                              
                              if (isHoliday) {
                                typeColor = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
                              } else if (isSunday) {
                                typeColor = "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
                              } else if (isOffSat) {
                                typeColor = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
                              } else if (dateObj.getDay() === 6) {
                                typeColor = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
                              }

                              return (
                                <tr 
                                  key={rec.id} 
                                  className={`transition-colors border-b border-border/40 ${
                                    isCompOffEligible 
                                      ? "bg-teal-50/40 dark:bg-teal-900/10 hover:bg-teal-100/40 dark:hover:bg-teal-900/20" 
                                      : isSpecialDay 
                                        ? "bg-amber-50/30 dark:bg-amber-900/5 hover:bg-amber-100/30 dark:hover:bg-amber-900/10" 
                                        : "hover:bg-muted/30"
                                  }`}
                                >
                                  <td className="py-2.5">
                                    {!rec.id.startsWith("temp-") && (
                                      <input type="checkbox" checked={selected.has(rec.id)} onChange={() => toggleSelect(rec.id)} className="rounded" />
                                    )}
                                  </td>
                                  <td className="py-2.5">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-foreground">
                                        {formatAttendanceDate(rec.attendanceDate)}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground font-medium uppercase">
                                        {getDayName(rec.attendanceDate)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${typeColor}`}>
                                      {typeLabel}
                                    </span>
                                  </td>
                                  <td className="py-2.5 font-mono text-xs">
                                    {rec.hasAttendance ? (
                                      <div className="flex flex-col">
                                        <span>In: {rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "---"}</span>
                                        <span>Out: {rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "---"}</span>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground italic">No Attendance</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 font-mono text-xs">
                                    {rec.hasAttendance ? `${Number(rec.hoursWorked).toFixed(2)}h` : "---"}
                                  </td>
                                  <td className="py-2.5 font-mono text-xs text-primary">
                                    {rec.hasAttendance && !isSpecialDay ? (
                                      <>{Math.round(Number(rec.otHours || 0)*60)} + {rec.adjustedOtMins || 0} (adj)</>
                                    ) : "---"}
                                  </td>
                                  <td className="py-2.5 font-mono text-xs text-red-500">
                                    {rec.hasAttendance && !isSpecialDay ? (rec.earlyLeavingMins || 0) : "---"}
                                  </td>
                                  <td className="py-2.5">
                                    {isCompOffEligible ? (
                                      <span className="text-[10px] font-bold bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400 px-2 py-1 rounded">
                                        {rec.compOffDays} Day Eligible
                                      </span>
                                    ) : isSpecialDay && rec.hasAttendance ? (
                                      <span className="text-[10px] text-muted-foreground italic">Not Eligible</span>
                                    ) : "---"}
                                  </td>
                                  <td className="py-2.5">
                                    {!rec.id.startsWith("temp-") ? (
                                      <span className="text-[10px] rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">
                                        {rec.hrApprovalStatus === "APPROVED" ? "HR APPROVED" : rec.approvalStatus}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground">---</span>
                                    )}
                                  </td>
                                  <td className="py-2.5">
                                    {!rec.id.startsWith("temp-") && (
                                      <button onClick={() => {
                                        setEditModal(rec);
                                        setEditValues({ 
                                          adjustedOtMins: rec.adjustedOtMins, 
                                          earlyLeavingMins: rec.earlyLeavingMins,
                                          compOffDays: Number(rec.compOffDays || 0)
                                        });
                                      }} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                                        <Edit2 className="size-3.5" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </FadeIn>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-base font-semibold text-foreground mb-4">Adjust OT Record</h2>
            <div className="space-y-4">
              <div>
                <label className="ds-label">Adjusted OT Minutes</label>
                <input
                  type="number"
                  value={editValues.adjustedOtMins}
                  onChange={(e) => setEditValues(s => ({ ...s, adjustedOtMins: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40"
                />
                <p className="text-xs text-muted-foreground mt-1">Add or subtract minutes manually.</p>
              </div>
              <div>
                <label className="ds-label">Early Leaving Minutes</label>
                <input
                  type="number"
                  value={editValues.earlyLeavingMins}
                  onChange={(e) => setEditValues(s => ({ ...s, earlyLeavingMins: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40"
                />
                <p className="text-xs text-muted-foreground mt-1">Adjust deficit (e.g., set to 0 if excused).</p>
              </div>
              <div>
                <label className="ds-label">Comp-Off Days</label>
                <input
                  type="number"
                  step="0.5"
                  value={editValues.compOffDays}
                  onChange={(e) => setEditValues(s => ({ ...s, compOffDays: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/40"
                />
                <p className="text-xs text-muted-foreground mt-1">Override calculated comp-off (e.g. 0.5, 1.0).</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-6 justify-end">
              <button
                onClick={() => setEditModal(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
