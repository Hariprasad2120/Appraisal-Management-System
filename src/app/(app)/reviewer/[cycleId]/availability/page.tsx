import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvailabilityButtons } from "./buttons";
import { toTitleCase } from "@/lib/utils";
import { FadeIn } from "@/components/motion-div";
import { AlertCircle } from "lucide-react";

export default async function AvailabilityPage({
  params,
}: {
  params: Promise<{ cycleId: string }>;
}) {
  const { cycleId } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const assignment = await prisma.cycleAssignment.findFirst({
    where: { cycleId, reviewerId: session.user.id },
    include: { cycle: { include: { user: true } } },
  });
  if (!assignment) notFound();
  if (assignment.availability !== "PENDING") redirect(`/reviewer/${cycleId}`);

  return (
    <div className="max-w-md">
      <FadeIn>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Confirm Availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {toTitleCase(assignment.cycle.user.name)}
              </p>
              <p className="text-xs text-slate-500">
                {assignment.cycle.user.department ?? "—"} · {assignment.cycle.type} Appraisal
              </p>
              <p className="text-xs text-slate-500">
                Your role: <span className="font-medium text-slate-700 dark:text-slate-300">{assignment.role}</span>
              </p>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400">
              Are you available to review this employee&apos;s appraisal? This answer is{" "}
              <span className="font-medium text-slate-900 dark:text-white">final</span> — only admin
              can change it after submission.
            </p>

            <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
              <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
              If you select &quot;Not Available&quot;, admin will be notified to reassign.
            </div>

            <AvailabilityButtons assignmentId={assignment.id} />
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
