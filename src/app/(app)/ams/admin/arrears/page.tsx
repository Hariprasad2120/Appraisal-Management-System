import { notFound } from "next/navigation";
import { getCachedSession as auth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion-div";
import { CalendarDays, IndianRupee, User } from "lucide-react";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  PENDING_APPROVAL: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  PAID: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
};

export default async function AdminArrearsPage() {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role, session.user.secondaryRole)) notFound();

  const arrears = await prisma.arrear.findMany({
    include: {
      user: { select: { id: true, name: true, department: true, designation: true } },
      cycle: { select: { id: true, type: true, scheduledDate: true } },
      approvedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const summary = {
    total: arrears.length,
    pending: arrears.filter((a) => a.status === "PENDING_APPROVAL").length,
    approved: arrears.filter((a) => a.status === "APPROVED").length,
    paid: arrears.filter((a) => a.status === "PAID").length,
    totalAmount: arrears
      .filter((a) => a.status !== "REJECTED")
      .reduce((s, a) => s + Number(a.arrearAmount), 0),
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="ds-h1">Arrear Management</h1>
          <p className="ds-body mt-1">
            Full audit trail of all arrear records across appraisal cycles.
          </p>
        </div>
      </FadeIn>

      {/* Summary Cards */}
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">Total Arrears</p>
              <p className="ds-h1">{summary.total}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-amber-600">Pending Approval</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{summary.pending}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-green-600">Approved</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{summary.approved}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-blue-600">Total Amount</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                ₹{summary.totalAmount.toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>
        </div>
      </FadeIn>

      {/* Arrear List */}
      <FadeIn delay={0.1}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">All Arrear Records</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {arrears.length === 0 ? (
              <p className="text-sm text-slate-500 p-6">No arrear records found.</p>
            ) : (
              <div className="divide-y divide-border">
                {arrears.map((arrear) => (
                  <div key={arrear.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <User className="size-3.5 text-slate-400 shrink-0" />
                          <Link
                            href={`/workspace/hrms/employees/${arrear.user.id}/assign`}
                            className="text-sm font-medium text-slate-900 transition-colors hover:text-primary hover:underline dark:text-white"
                          >
                            {arrear.user.name}
                          </Link>
                          {arrear.user.department && (
                            <span className="text-xs text-slate-500">· {arrear.user.department}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="size-3" />
                            {new Date(arrear.periodFrom).toLocaleDateString("en-IN")} —{" "}
                            {new Date(arrear.periodTo).toLocaleDateString("en-IN")}
                            <span className="ml-1 font-medium text-slate-700 dark:text-slate-300">
                              ({arrear.arrearDays} days)
                            </span>
                          </span>
                          <span className="flex items-center gap-1">
                            <IndianRupee className="size-3" />
                            {Number(arrear.arrearAmount).toLocaleString("en-IN")} arrear
                          </span>
                        </div>
                        {arrear.payoutMonth && (
                          <p className="text-xs text-slate-500">
                            Payout:{" "}
                            {new Date(arrear.payoutMonth).toLocaleDateString("en-IN", {
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        )}
                        {arrear.rejectedReason && (
                          <p className="text-xs text-red-500">Reason: {arrear.rejectedReason}</p>
                        )}
                        {arrear.approvedBy && (
                          <p className="text-xs text-slate-400">
                            {arrear.status === "REJECTED" ? "Reviewed" : "Approved"} by {arrear.approvedBy.name}
                            {arrear.approvedAt &&
                              ` on ${new Date(arrear.approvedAt).toLocaleDateString("en-IN")}`}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[arrear.status] ?? ""}`}
                        >
                          {STATUS_LABELS[arrear.status] ?? arrear.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
