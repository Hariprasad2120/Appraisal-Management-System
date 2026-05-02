import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { FadeIn } from "@/components/motion-div";
import { toTitleCase } from "@/lib/utils";
import { Clock } from "lucide-react";
import { getSystemDate } from "@/lib/system-date";
import { isAdmin } from "@/lib/rbac";
import { MomContentEditor } from "@/components/mom-content-editor";
import { saveAdminMomAction } from "./actions";

function isMeetingDay(now: Date, scheduledDate: Date): boolean {
  return (
    now.getFullYear() === scheduledDate.getFullYear() &&
    now.getMonth() === scheduledDate.getMonth() &&
    now.getDate() === scheduledDate.getDate()
  );
}

export default async function AdminMomDetailPage({ params }: { params: Promise<{ cycleId: string }> }) {
  const { cycleId } = await params;
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role, session.user.secondaryRole)) return null;

  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    include: {
      user: true,
      ratings: { include: { reviewer: { select: { name: true, role: true } } } },
      decision: { include: { slab: true } },
      moms: { where: { role: "ADMIN" } },
    },
  });
  if (!cycle) notFound();
  if (!cycle.scheduledDate) notFound();

  const now = await getSystemDate();
  const canRecord = now >= cycle.scheduledDate || isMeetingDay(now, cycle.scheduledDate);

  const adminMom = cycle.moms[0] ?? null;

  const autoContent = `Minutes of Meeting — Appraisal Review (Admin Notes)
Employee: ${toTitleCase(cycle.user.name)}
Department: ${cycle.user.department ?? "—"}
Date: ${new Date(cycle.scheduledDate).toLocaleDateString("en-IN")}

Ratings Summary:
${cycle.ratings.map((r) => `  ${r.role}: ${r.averageScore.toFixed(2)} — ${toTitleCase(r.reviewer.name)}`).join("\n")}

Final Decision:
  Rating: ${cycle.decision?.finalRating.toFixed(2) ?? "Pending"}
  Slab: ${cycle.decision?.slab?.label ?? "—"}
  Proposed Increment: ₹${cycle.decision ? Number(cycle.decision.finalAmount).toLocaleString() : "—"}

Admin Observations:
  [Record administrative notes here]

Comments:
${cycle.ratings.map((r) => r.postComment ? `  ${r.role}: ${r.postComment}` : "").filter(Boolean).join("\n") || "  None"}
`;

  return (
    <div className="w-full max-w-3xl space-y-5">
      <FadeIn>
        <div>
          <h1 className="ds-h1">
            Minutes of Meeting
          </h1>
          <p className="ds-body mt-1">
            {toTitleCase(cycle.user.name)} — {cycle.type} Appraisal ·{" "}
            {new Date(cycle.scheduledDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </FadeIn>

      {!canRecord ? (
        <FadeIn delay={0.05}>
          <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
            <CardContent className="p-4 flex items-start gap-3">
              <Clock className="size-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-300">Meeting not yet held</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  Scheduled for{" "}
                  <strong>{new Date(cycle.scheduledDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      ) : (
        <FadeIn delay={0.1}>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <MomContentEditor
                cycleId={cycleId}
                existingContent={adminMom?.content ?? autoContent}
                isNew={!adminMom}
                saveAction={saveAdminMomAction}
                successMessage={!adminMom ? "MOM recorded" : "MOM updated"}
              />
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}
