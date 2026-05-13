import { getCachedSession as auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";
import { CalendarDays, CheckCircle, Clock, XCircle, Ban } from "lucide-react";
import { createLeaveRequestAction, cancelLeaveRequestAction } from "./actions";
import { format } from "date-fns";

const STATUS_STYLES: Record<string, { label: string; cls: string; icon: typeof CheckCircle }> = {
  PENDING:   { label: "Pending",   cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",   icon: Clock },
  APPROVED:  { label: "Approved",  cls: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",   icon: CheckCircle },
  REJECTED:  { label: "Rejected",  cls: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",           icon: XCircle },
  CANCELLED: { label: "Cancelled", cls: "bg-muted text-muted-foreground",                                          icon: Ban },
};

export default async function LeavePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;
  const userId = session.user.id;
  const sp = await searchParams;
  const tab = sp.tab ?? "balance";

  const currentYear = new Date().getFullYear();

  const [leaveTypes, balances, requests] = await Promise.all([
    prisma.leaveType.findMany({ where: { organizationId, active: true }, orderBy: { name: "asc" } }),
    tab === "balance"
      ? prisma.leaveBalance.findMany({
          where: { employeeId: userId, year: currentYear },
          include: { leaveType: { select: { name: true, code: true, paid: true } } },
          orderBy: { leaveType: { name: "asc" } },
        })
      : Promise.resolve([]),
    tab !== "apply"
      ? prisma.leaveRequest.findMany({
          where: { employeeId: userId },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { leaveType: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  const tabs = [
    { id: "balance", label: "Balance" },
    { id: "requests", label: "My Requests" },
    { id: "apply", label: "Apply" },
  ];

  return (
    <FadeIn>
      <div className="p-6 space-y-6 max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Breadcrumbs items={[{ label: "Leave" }]} />
            <h1 className="text-2xl font-bold text-foreground mt-1">Leave</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your leave balance and requests</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={`/leave?tab=${t.id}`}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* Balance tab */}
        {tab === "balance" && (
          <div className="space-y-3">
            {balances.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No leave balance data for {currentYear}.
                </CardContent>
              </Card>
            ) : (
              balances.map((b) => (
                <div key={b.id} className="rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{b.leaveType.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.leaveType.code} · {b.leaveType.paid ? "Paid" : "Unpaid"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">{Number(b.balance).toFixed(1)}</p>
                      <p className="text-[11px] text-muted-foreground">days remaining</p>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                    <span>Opening: <strong className="text-foreground">{Number(b.opening).toFixed(1)}</strong></span>
                    <span>Accrued: <strong className="text-foreground">{Number(b.accrued).toFixed(1)}</strong></span>
                    <span>Used: <strong className="text-foreground">{Number(b.used).toFixed(1)}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Requests tab */}
        {tab === "requests" && (
          <div className="space-y-3">
            {requests.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No leave requests yet.
                  <Link href="/leave?tab=apply" className="ml-2 text-primary underline underline-offset-2">Apply now</Link>
                </CardContent>
              </Card>
            ) : (
              requests.map((req) => {
                const s = STATUS_STYLES[req.status] ?? STATUS_STYLES.PENDING;
                const Icon = s.icon;
                return (
                  <div key={req.id} className="rounded-xl border border-border bg-card px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{req.leaveType.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <CalendarDays className="inline size-3 mr-1" />
                          {format(req.fromDate, "dd MMM yyyy")} – {format(req.toDate, "dd MMM yyyy")} ({Number(req.days)} day{Number(req.days) !== 1 ? "s" : ""})
                        </p>
                        {req.reason && <p className="text-xs text-muted-foreground mt-1">{req.reason}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>
                          <Icon className="size-3" /> {s.label}
                        </span>
                        {req.status === "PENDING" && (
                          <form action={cancelLeaveRequestAction}>
                            <input type="hidden" name="id" value={req.id} />
                            <Button type="submit" size="sm" variant="ghost" className="text-xs h-6 px-2 text-destructive hover:text-destructive">
                              Cancel
                            </Button>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Apply tab */}
        {tab === "apply" && (
          <Card>
            <CardContent className="py-6">
              {leaveTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">No leave types configured. Contact HR.</p>
              ) : (
                <form action={createLeaveRequestAction} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Leave Type *</label>
                    <select name="leaveTypeId" required className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                      <option value="">Select leave type</option>
                      {leaveTypes.map((lt) => (
                        <option key={lt.id} value={lt.id}>{lt.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">From *</label>
                      <input type="date" name="fromDate" required className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">To *</label>
                      <input type="date" name="toDate" required className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Reason</label>
                    <textarea name="reason" rows={3} placeholder="Reason for leave (optional)" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <Button type="submit" size="sm">Submit Request</Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </FadeIn>
  );
}
