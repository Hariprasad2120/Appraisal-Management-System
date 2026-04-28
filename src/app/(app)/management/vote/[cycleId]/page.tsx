import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion-div";
import { toTitleCase } from "@/lib/utils";
import { VoteForm } from "./vote-form";
import { CheckCircle } from "lucide-react";

export default async function VotePage({ params }: { params: Promise<{ cycleId: string }> }) {
  const { cycleId } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    include: {
      user: true,
      votes: { include: { voter: { select: { name: true, role: true } } } },
      assignments: { include: { reviewer: { select: { id: true, name: true } } } },
    },
  });
  if (!cycle) notFound();

  const isManagement = session.user.role === "MANAGEMENT" || session.user.role === "ADMIN";
  const isHr = session.user.role === "HR" || session.user.secondaryRole === "HR" || session.user.role === "ADMIN";

  const proposed = cycle.tentativeDate1 && cycle.tentativeDate2;

  return (
    <div className="space-y-5 max-w-xl">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Schedule Appraisal Meeting
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {toTitleCase(cycle.user.name)} — propose and finalize the meeting date
          </p>
        </div>
      </FadeIn>

      {cycle.scheduledDate && (
        <FadeIn delay={0.1}>
          <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-lg p-3 text-sm text-teal-700 dark:text-teal-400 font-medium">
            Final meeting date: {new Date(cycle.scheduledDate).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
        </FadeIn>
      )}

      <FadeIn delay={0.15}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tentative Dates</CardTitle>
          </CardHeader>
          <CardContent>
            {!proposed ? (
              <p className="text-sm text-slate-400">No tentative dates proposed yet.</p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Option 1</span>
                  <span className="font-medium text-slate-900 dark:text-white">{new Date(cycle.tentativeDate1!).toLocaleDateString("en-IN")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Option 2</span>
                  <span className="font-medium text-slate-900 dark:text-white">{new Date(cycle.tentativeDate2!).toLocaleDateString("en-IN")}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.2}>
        {isManagement && !cycle.scheduledDate && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Management: Propose Two Dates</CardTitle>
            </CardHeader>
            <CardContent>
              <VoteForm
                cycleId={cycleId}
                mode="propose"
                initial1={cycle.tentativeDate1 ? new Date(cycle.tentativeDate1).toISOString().split("T")[0] : ""}
                initial2={cycle.tentativeDate2 ? new Date(cycle.tentativeDate2).toISOString().split("T")[0] : ""}
              />
            </CardContent>
          </Card>
        )}

        {isHr && proposed && !cycle.scheduledDate && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">HR: Finalize Meeting Date</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-slate-500">
                Select one of the proposed dates to finalize.
              </div>
              <VoteForm cycleId={cycleId} mode="finalize" />
              <div className="text-[10px] text-slate-400 flex items-center gap-2">
                <CheckCircle className="size-3.5" /> Final date must match one of the proposed options.
              </div>
            </CardContent>
          </Card>
        )}
      </FadeIn>
    </div>
  );
}
