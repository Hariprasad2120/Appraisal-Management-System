import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion-div";
import { toTitleCase } from "@/lib/utils";
import { MomEditor } from "./mom-editor";

export default async function MomPage({ params }: { params: Promise<{ cycleId: string }> }) {
  const { cycleId } = await params;
  const session = await auth();
  const allowed = ["ADMIN", "MANAGEMENT", "HR"];
  if (!session?.user || (!allowed.includes(session.user.role) && !(session.user.secondaryRole && allowed.includes(session.user.secondaryRole)))) return null;

  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    include: {
      user: true,
      ratings: { include: { reviewer: { select: { name: true, role: true } } } },
      decision: { include: { slab: true } },
      mom: true,
    },
  });
  if (!cycle) notFound();

  const autoContent = `Minutes of Meeting — Appraisal Review
Employee: ${toTitleCase(cycle.user.name)}
Department: ${cycle.user.department ?? "—"}
Date: ${cycle.scheduledDate ? new Date(cycle.scheduledDate).toLocaleDateString() : new Date().toLocaleDateString()}

Ratings Summary:
${cycle.ratings.map((r) => `  ${r.role}: ${r.averageScore.toFixed(2)} — ${toTitleCase(r.reviewer.name)}`).join("\n")}

Final Decision:
  Rating: ${cycle.decision?.finalRating.toFixed(2) ?? "Pending"}
  Slab: ${cycle.decision?.slab?.label ?? "—"}
  Increment: ₹${cycle.decision ? Number(cycle.decision.finalAmount).toLocaleString() : "—"}

Comments:
${cycle.ratings.map((r) => r.postComment ? `  ${r.role}: ${r.postComment}` : "").filter(Boolean).join("\n") || "  None"}
`;

  return (
    <div className="space-y-5 max-w-3xl">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Minutes of Meeting
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {toTitleCase(cycle.user.name)} — {cycle.type} Appraisal
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <MomEditor
              cycleId={cycleId}
              existingContent={cycle.mom?.content ?? autoContent}
              isNew={!cycle.mom}
            />
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
