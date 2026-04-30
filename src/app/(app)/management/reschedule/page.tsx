import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { isManagement } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RescheduleForm } from "./reschedule-form";
import { CalendarX, History } from "lucide-react";

export default async function ManagementReschedulePage({
  searchParams,
}: {
  searchParams: Promise<{ cycleId?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !isManagement(session.user.role, session.user.secondaryRole)) notFound();

  const { cycleId } = await searchParams;

  // Missed meetings: SCHEDULED status, scheduledDate past, no management MOM
  const now = new Date();
  const missedCycles = await prisma.appraisalCycle.findMany({
    where: {
      status: "SCHEDULED",
      scheduledDate: { lt: now },
      moms: { none: { role: "MANAGEMENT" } },
    },
    include: {
      user: { select: { name: true, department: true } },
    },
    orderBy: { scheduledDate: "asc" },
  });

  // Selected cycle for reschedule form
  const selectedCycle = cycleId
    ? await prisma.appraisalCycle.findUnique({
        where: { id: cycleId },
        include: { user: { select: { name: true } } },
      })
    : null;

  // Recent reschedules
  const recentReschedules = await prisma.meetingReschedule.findMany({
    include: {
      cycle: { include: { user: { select: { name: true } } } },
      rescheduledBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Meeting Reschedule</h1>
          <p className="text-slate-500 text-sm mt-1">
            Reschedule missed or upcoming appraisal meetings.
          </p>
        </div>
      </FadeIn>

      {/* Missed meetings alert */}
      {missedCycles.length > 0 && (
        <FadeIn delay={0.05}>
          <Card className="border-0 shadow-sm border-l-4 border-l-red-400">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                <CalendarX className="size-4" />
                {missedCycles.length} Missed Meeting{missedCycles.length > 1 ? "s" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {missedCycles.map((c) => (
                  <div key={c.id} className="px-4 py-3 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{c.user.name}</span>
                      {c.user.department && (
                        <span className="text-slate-500 ml-2 text-xs">· {c.user.department}</span>
                      )}
                      <p className="text-xs text-red-500 mt-0.5">
                        Scheduled:{" "}
                        {c.scheduledDate!.toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <a
                      href={`/management/reschedule?cycleId=${c.id}`}
                      className="text-xs bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-3 py-1.5 font-medium transition-colors"
                    >
                      Reschedule
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Reschedule form */}
      {selectedCycle && (
        <FadeIn delay={0.1}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Reschedule: {selectedCycle.user.name}
              </CardTitle>
              {selectedCycle.scheduledDate && (
                <p className="text-xs text-slate-500">
                  Current date:{" "}
                  {selectedCycle.scheduledDate.toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <RescheduleForm cycleId={selectedCycle.id} employeeName={selectedCycle.user.name} />
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Reschedule history */}
      {recentReschedules.length > 0 && (
        <FadeIn delay={0.15}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <History className="size-4" /> Reschedule History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentReschedules.map((r) => (
                  <div key={r.id} className="px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-medium">{r.cycle.user.name}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(r.originalDate).toLocaleDateString("en-IN")} →{" "}
                          <strong className="text-slate-700 dark:text-slate-300">
                            {new Date(r.newDate).toLocaleDateString("en-IN")}
                          </strong>
                        </p>
                        <p className="text-xs text-slate-500 truncate max-w-xs">
                          Reason: {r.reason}
                        </p>
                        <p className="text-xs text-slate-400">
                          By {r.rescheduledBy.name} ·{" "}
                          {new Date(r.createdAt).toLocaleDateString("en-IN")}
                        </p>
                      </div>
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
