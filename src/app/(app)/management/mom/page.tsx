import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { FadeIn, StaggerList, StaggerItem } from "@/components/motion-div";
import { toTitleCase } from "@/lib/utils";
import { ClipboardList, ChevronRight, Clock, CheckCircle } from "lucide-react";
import { getSystemDate } from "@/lib/system-date";

export default async function ManagementMomListPage() {
  const session = await auth();
  const role = session?.user?.role;
  const secondary = session?.user?.secondaryRole;
  const isManagement = role === "MANAGEMENT" || secondary === "MANAGEMENT";
  if (!session?.user || !isManagement) return null;

  const now = await getSystemDate();

  const scheduledCycles = await prisma.appraisalCycle.findMany({
    where: {
      scheduledDate: { not: null },
      decision: { isNot: null },
    },
    include: {
      user: { select: { name: true, department: true } },
      decision: { include: { slab: true } },
      moms: { where: { role: "MANAGEMENT" }, select: { id: true, createdAt: true } },
      claimedBy: { select: { name: true } },
    },
    orderBy: { scheduledDate: "desc" },
  });

  const meetingPassed = scheduledCycles.filter(
    (c) => c.scheduledDate && now >= c.scheduledDate
  );
  const upcoming = scheduledCycles.filter(
    (c) => c.scheduledDate && now < c.scheduledDate
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Minutes of Meeting</h1>
          <p className="text-slate-500 text-sm mt-1">
            All appraisal meetings — record MOM after the meeting to finalize salary
          </p>
        </div>
      </FadeIn>

      {meetingPassed.length > 0 && (
        <FadeIn delay={0.05}>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-purple-600 mb-3 flex items-center gap-2">
              <ClipboardList className="size-3.5" /> Meetings Held ({meetingPassed.length})
            </h2>
            <StaggerList className="space-y-2">
              {meetingPassed.map((cycle) => {
                const hasMom = cycle.moms.length > 0;
                return (
                  <StaggerItem key={cycle.id}>
                    <Link href={`/management/mom/${cycle.id}`}>
                      <Card className={`border-0 shadow-sm border-l-4 hover:shadow-md transition-shadow cursor-pointer ${hasMom ? "border-l-green-400" : "border-l-amber-400"}`}>
                        <CardContent className="p-4 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {toTitleCase(cycle.user.name)}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {cycle.user.department ?? "—"} ·{" "}
                              {cycle.scheduledDate
                                ? new Date(cycle.scheduledDate).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"}
                              {cycle.claimedBy && (
                                <> · Decided by {toTitleCase(cycle.claimedBy.name)}</>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {cycle.decision && (
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                ₹{Number(cycle.decision.finalAmount).toLocaleString("en-IN")}/yr
                              </span>
                            )}
                            {hasMom ? (
                              <span className="text-[10px] bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                <CheckCircle className="size-3" /> MOM Done
                              </span>
                            ) : (
                              <span className="text-[10px] bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                                Record MOM
                              </span>
                            )}
                            <ChevronRight className="size-4 text-slate-400" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerList>
          </div>
        </FadeIn>
      )}

      {upcoming.length > 0 && (
        <FadeIn delay={0.1}>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-3 flex items-center gap-2">
              <Clock className="size-3.5" /> Upcoming Meetings ({upcoming.length})
            </h2>
            <StaggerList className="space-y-2">
              {upcoming.map((cycle) => (
                <StaggerItem key={cycle.id}>
                  <Link href={`/management/decide/${cycle.id}`}>
                    <Card className="border-0 shadow-sm border-l-4 border-l-blue-400 hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {toTitleCase(cycle.user.name)}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {cycle.user.department ?? "—"} ·{" "}
                            {cycle.scheduledDate
                              ? new Date(cycle.scheduledDate).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                            Scheduled
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

      {scheduledCycles.length === 0 && (
        <FadeIn delay={0.05}>
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center text-slate-400 text-sm">
              No scheduled meetings yet.
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}
