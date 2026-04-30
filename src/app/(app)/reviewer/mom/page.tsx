import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { FadeIn, StaggerList, StaggerItem } from "@/components/motion-div";
import { toTitleCase } from "@/lib/utils";
import { ClipboardList, ChevronRight, CheckCircle, Clock } from "lucide-react";
import { getSystemDate } from "@/lib/system-date";

export default async function HrMomListPage() {
  const session = await auth();
  const role = session?.user?.role;
  const secondary = session?.user?.secondaryRole;
  const isHr = role === "HR" || secondary === "HR";
  if (!session?.user || !isHr) return null;

  const now = await getSystemDate();

  const assignments = await prisma.cycleAssignment.findMany({
    where: {
      reviewerId: session.user.id,
      role: "HR",
    },
    include: {
      cycle: {
        include: {
          user: { select: { name: true, department: true } },
          decision: { select: { finalAmount: true, finalRating: true } },
          moms: { where: { role: "HR" }, select: { id: true, createdAt: true } },
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  const withMom = assignments.filter((a) => a.cycle.moms.length > 0);
  const withoutMom = assignments.filter(
    (a) => a.cycle.moms.length === 0 && a.cycle.scheduledDate && now >= a.cycle.scheduledDate
  );
  const upcoming = assignments.filter(
    (a) => a.cycle.moms.length === 0 && a.cycle.scheduledDate && now < a.cycle.scheduledDate
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Minutes of Meeting</h1>
          <p className="text-slate-500 text-sm mt-1">
            MOM for employees you reviewed — {withMom.length} recorded
          </p>
        </div>
      </FadeIn>

      {withoutMom.length > 0 && (
        <FadeIn delay={0.05}>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-3 flex items-center gap-2">
              <Clock className="size-3.5" /> Awaiting MOM ({withoutMom.length})
            </h2>
            <StaggerList className="space-y-2">
              {withoutMom.map((a) => (
                <StaggerItem key={a.id}>
                  <Link href={`/reviewer/mom/${a.cycle.id}`}>
                    <Card className="border-0 shadow-sm border-l-4 border-l-amber-400 hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {toTitleCase(a.cycle.user.name)}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {a.cycle.user.department ?? "—"} ·{" "}
                            {a.cycle.scheduledDate
                              ? new Date(a.cycle.scheduledDate).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                            Record MOM
                          </span>
                          <ChevronRight className="size-4 text-slate-400" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerList>
          </div>
        </FadeIn>
      )}

      {withMom.length > 0 && (
        <FadeIn delay={0.1}>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-green-600 mb-3 flex items-center gap-2">
              <CheckCircle className="size-3.5" /> Recorded MOMs ({withMom.length})
            </h2>
            <StaggerList className="space-y-2">
              {withMom.map((a) => (
                <StaggerItem key={a.id}>
                  <Link href={`/reviewer/mom/${a.cycle.id}`}>
                    <Card className="border-0 shadow-sm border-l-4 border-l-green-400 hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {toTitleCase(a.cycle.user.name)}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {a.cycle.user.department ?? "—"} ·{" "}
                            {a.cycle.scheduledDate
                              ? new Date(a.cycle.scheduledDate).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {a.cycle.decision && (
                            <span className="text-xs font-semibold text-green-600">
                              ₹{Number(a.cycle.decision.finalAmount).toLocaleString("en-IN")}/yr
                            </span>
                          )}
                          <span className="text-[10px] bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <CheckCircle className="size-3" /> Recorded
                          </span>
                          <ChevronRight className="size-4 text-slate-400" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerList>
          </div>
        </FadeIn>
      )}

      {upcoming.length > 0 && (
        <FadeIn delay={0.15}>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-3 flex items-center gap-2">
              <ClipboardList className="size-3.5" /> Upcoming ({upcoming.length})
            </h2>
            <StaggerList className="space-y-2">
              {upcoming.map((a) => (
                <StaggerItem key={a.id}>
                  <Card className="border-0 shadow-sm border-l-4 border-l-blue-400">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {toTitleCase(a.cycle.user.name)}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {a.cycle.user.department ?? "—"} ·{" "}
                          {a.cycle.scheduledDate
                            ? new Date(a.cycle.scheduledDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </div>
                      </div>
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium shrink-0">
                        Scheduled
                      </span>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerList>
          </div>
        </FadeIn>
      )}

      {assignments.length === 0 && (
        <FadeIn delay={0.05}>
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center text-slate-400 text-sm">
              No appraisal assignments found.
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}
