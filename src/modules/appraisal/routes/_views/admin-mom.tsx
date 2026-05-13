import Link from "next/link";
import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { FadeIn, StaggerList, StaggerItem } from "@/components/motion-div";
import { toTitleCase } from "@/lib/utils";
import { ClipboardList, ChevronRight, Clock } from "lucide-react";
import { isAdmin } from "@/lib/rbac";

export default async function AdminMomListPage() {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role, session.user.secondaryRole)) return null;

  // Admin's own MOM records (role = "ADMIN")
  const moms = await prisma.mOM.findMany({
    where: { role: "ADMIN" },
    include: {
      cycle: {
        include: {
          user: { select: { id: true, name: true, department: true } },
          decision: { include: { slab: true } },
        },
      },
      author: { select: { name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Cycles where admin hasn't recorded their MOM yet
  const recordedCycleIds = moms.map((m) => m.cycleId);
  const pending = await prisma.appraisalCycle.findMany({
    where: {
      scheduledDate: { not: null },
      id: { notIn: recordedCycleIds },
      status: { in: ["SCHEDULED", "DECIDED", "DATE_VOTING", "CLOSED"] },
    },
    include: {
      user: { select: { id: true, name: true, department: true } },
      decision: true,
    },
    orderBy: { scheduledDate: "asc" },
  });

  return (
    <div className="w-full max-w-4xl space-y-6">
      <FadeIn>
        <div>
          <h1 className="ds-h1">Minutes of Meeting</h1>
          <p className="ds-body mt-1">
            {moms.length} recorded · {pending.length} pending
          </p>
        </div>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {pending.length > 0 && (
          <FadeIn delay={0.05}>
            <div>
            <h2 className="text-xs font-semibold text-amber-600 mb-3 flex items-center gap-2">
              <Clock className="size-3.5" /> Pending MOM ({pending.length})
            </h2>
            <StaggerList className="space-y-2">
              {pending.map((cycle) => (
                <StaggerItem key={cycle.id}>
                  <Card className="border-0 shadow-sm border-l-4 border-l-amber-400 hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            <Link
                              href={`/workspace/hrms/employees/${cycle.user.id}/assign`}
                              className="transition-colors hover:text-primary hover:underline"
                            >
                              {toTitleCase(cycle.user.name)}
                            </Link>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {cycle.user.department ?? "—"} ·{" "}
                            {cycle.scheduledDate
                              ? new Date(cycle.scheduledDate).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "No date"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            href={`/admin/mom/${cycle.id}`}
                            className="text-[10px] bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium transition-colors hover:bg-amber-200 dark:hover:bg-amber-900/50"
                          >
                            MOM Pending
                          </Link>
                          <ChevronRight className="size-4 text-slate-400" />
                        </div>
                      </CardContent>
                    </Card>
                </StaggerItem>
              ))}
            </StaggerList>
            </div>
          </FadeIn>
        )}

        <FadeIn delay={0.1}>
          <div>
          <h2 className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-2">
            <ClipboardList className="size-3.5" /> Recorded MOMs ({moms.length})
          </h2>
          {moms.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-10 text-center text-muted-foreground/50 text-sm">
                No MOMs recorded yet.
              </CardContent>
            </Card>
          ) : (
            <StaggerList className="space-y-2">
              {moms.map((mom) => (
                <StaggerItem key={mom.id}>
                  <Card className="border-0 shadow-sm border-l-4 border-l-purple-400 hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            <Link
                              href={`/workspace/hrms/employees/${mom.cycle.user.id}/assign`}
                              className="transition-colors hover:text-primary hover:underline"
                            >
                              {toTitleCase(mom.cycle.user.name)}
                            </Link>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {mom.cycle.user.department ?? "—"} ·{" "}
                            {mom.cycle.scheduledDate
                              ? new Date(mom.cycle.scheduledDate).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"}
                          </div>
                        </div>
                        <div className="text-right shrink-0 space-y-0.5">
                          {mom.cycle.decision && (
                            <div className="text-xs font-semibold text-green-600">
                              ₹{Number(mom.cycle.decision.finalAmount).toLocaleString("en-IN")}/yr
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400">
                            by {toTitleCase(mom.author.name)}
                          </div>
                        </div>
                        <Link href={`/admin/mom/${mom.cycle.id}`} aria-label="Open MOM">
                          <ChevronRight className="size-4 text-slate-400 shrink-0 transition-colors hover:text-primary" />
                        </Link>
                      </CardContent>
                    </Card>
                </StaggerItem>
              ))}
            </StaggerList>
          )}
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
