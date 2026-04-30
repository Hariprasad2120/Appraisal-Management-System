import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { isManagement } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrearApprovalCard } from "./arrear-approval-card";

export default async function ManagementArrearsPage() {
  const session = await auth();
  if (!session?.user || !isManagement(session.user.role, session.user.secondaryRole)) notFound();

  const arrears = await prisma.arrear.findMany({
    where: { status: "PENDING_APPROVAL" },
    include: {
      user: { select: { name: true, department: true, designation: true } },
      cycle: {
        select: {
          id: true,
          type: true,
          scheduledDate: true,
          self: { select: { submittedAt: true } },
          decision: { select: { finalAmount: true, finalRating: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const recentlyProcessed = await prisma.arrear.findMany({
    where: { status: { in: ["APPROVED", "REJECTED", "PAID"] } },
    include: {
      user: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Arrear Approvals</h1>
          <p className="text-slate-500 text-sm mt-1">
            Review and approve arrear payouts for delayed appraisals.
          </p>
        </div>
      </FadeIn>

      {/* Pending approvals */}
      <FadeIn delay={0.05}>
        {arrears.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <p className="text-sm text-slate-500">No pending arrear approvals.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {arrears.map((arrear) => (
              <ArrearApprovalCard key={arrear.id} arrear={arrear} />
            ))}
          </div>
        )}
      </FadeIn>

      {/* Recently processed */}
      {recentlyProcessed.length > 0 && (
        <FadeIn delay={0.1}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Recently Processed
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentlyProcessed.map((a) => (
                  <div key={a.id} className="px-4 py-3 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{a.user.name}</span>
                      <span className="text-slate-500 ml-2">
                        ₹{Number(a.arrearAmount).toLocaleString("en-IN")} · {a.arrearDays} days
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {a.approvedBy && (
                        <span className="text-xs text-slate-400">by {a.approvedBy.name}</span>
                      )}
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          a.status === "APPROVED"
                            ? "bg-green-100 text-green-700"
                            : a.status === "PAID"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {a.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}
