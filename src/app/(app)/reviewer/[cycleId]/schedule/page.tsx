import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion-div";
import { toTitleCase } from "@/lib/utils";
import { HrScheduleForm } from "./hr-schedule-form";
import { Calendar, CheckCircle } from "lucide-react";

export default async function HrSchedulePage({
  params,
}: {
  params: Promise<{ cycleId: string }>;
}) {
  const { cycleId } = await params;
  const session = await auth();
  if (!session?.user) return null;

  if (!["HR", "ADMIN"].includes(session.user.role)) {
    redirect(`/reviewer/${cycleId}`);
  }

  const assignment = await prisma.cycleAssignment.findFirst({
    where: { cycleId, reviewerId: session.user.id, role: "HR" },
  });
  if (!assignment && session.user.role !== "ADMIN") notFound();

  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    include: { user: true, decision: true },
  });
  if (!cycle) notFound();

  if (!cycle.tentativeDate1 || !cycle.tentativeDate2) {
    redirect(`/reviewer/${cycleId}`);
  }

  return (
    <div className="max-w-lg space-y-5">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Schedule Meeting</h1>
          <p className="text-slate-500 text-sm mt-1">
            {toTitleCase(cycle.user.name)} · {cycle.type} Appraisal
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.06}>
        {cycle.scheduledDate ? (
          <Card className="border-0 shadow-sm border-l-4 border-l-green-400">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                <CheckCircle className="size-4" /> Meeting Confirmed
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-700 dark:text-slate-300">
              {new Date(cycle.scheduledDate).toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="size-4 text-blue-500" /> Confirm Appraisal Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HrScheduleForm
                cycleId={cycleId}
                tentativeDate1={cycle.tentativeDate1.toISOString()}
                tentativeDate2={cycle.tentativeDate2.toISOString()}
                employeeName={toTitleCase(cycle.user.name)}
              />
            </CardContent>
          </Card>
        )}
      </FadeIn>
    </div>
  );
}
