"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCachedSession as auth } from "@/lib/auth";
import { syncCycleStatus } from "@/lib/workflow";
import { getSystemDate } from "@/lib/system-date";

const schema = z.object({
  cycleId: z.string(),
  answers: z.record(z.string(), z.any()),
});

type Result = { ok: true; editableUntil: string } | { ok: false; error: string };

export async function submitSelfAction(input: z.infer<typeof schema>): Promise<Result> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id: parsed.data.cycleId },
    include: {
      self: true,
      assignments: { include: { reviewer: { select: { id: true, name: true } } } },
      user: { select: { name: true } },
    },
  });
  if (!cycle || cycle.userId !== session.user.id) return { ok: false, error: "Forbidden" };
  if (!cycle.self) return { ok: false, error: "No self-assessment record" };
  if (cycle.self.locked) return { ok: false, error: "Locked" };

  const now = await getSystemDate();
  if (now > cycle.self.editableUntil) return { ok: false, error: "Edit window closed — deadline has passed" };

  const isFirstSubmission = !cycle.self.submittedAt;
  const newEditCount = cycle.self.editCount + (isFirstSubmission ? 0 : 1);
  const newStatus = isFirstSubmission ? "SUBMITTED" : "REOPENED";

  const beforeSnapshot = {
    status: cycle.self.status,
    editCount: cycle.self.editCount,
    submittedAt: cycle.self.submittedAt,
  };

  await prisma.$transaction(async (tx) => {
    await tx.selfAssessment.update({
      where: { cycleId: parsed.data.cycleId },
      data: {
        answers: parsed.data.answers,
        submittedAt: new Date(),
        lastModifiedAt: new Date(),
        editCount: newEditCount,
        status: newStatus,
      },
    });
    await tx.appraisalCycle.update({
      where: { id: parsed.data.cycleId },
      data: { status: "SELF_SUBMITTED" },
    });
    await tx.auditLog.create({
      data: {
        cycleId: parsed.data.cycleId,
        actorId: session.user.id,
        action: isFirstSubmission ? "SELF_ASSESSMENT_SUBMITTED" : "SELF_ASSESSMENT_RESUBMITTED",
        before: beforeSnapshot,
        after: {
          status: newStatus,
          editCount: newEditCount,
          submittedAt: new Date().toISOString(),
        },
      },
    });
  });

  // Only notify on first submission — reviewers must NOT be notified on edits
  if (isFirstSubmission) {
    const adminUsers = await prisma.user.findMany({
      where: { role: "ADMIN", active: true },
      select: { id: true },
    });
    const reviewerIds = cycle.assignments.map((a) => a.reviewer.id);
    const adminIds = new Set(adminUsers.map((u) => u.id));
    const employeeName = cycle.user.name;

    // Reviewers: actionable — they need to rate
    const reviewerNotifyIds = reviewerIds.filter((id) => !adminIds.has(id));
    await Promise.all(
      reviewerNotifyIds.map((userId) =>
        prisma.notification.create({
          data: {
            userId,
            type: "SELF_ASSESSMENT_SUBMITTED",
            message: `${employeeName} has submitted their self-assessment. Please review and submit your rating once the edit window closes.`,
            link: `/reviewer/${parsed.data.cycleId}`,
            persistent: true,
            critical: true,
          },
        })
      )
    );

    // Admins: FYI only — no action needed
    await Promise.all(
      adminUsers.map((u) =>
        prisma.notification.create({
          data: {
            userId: u.id,
            type: "SELF_ASSESSMENT_SUBMITTED",
            message: `${employeeName} has submitted their self-assessment.`,
            link: null,
            persistent: true,
            critical: false,
          },
        })
      )
    );
  }

  await syncCycleStatus(parsed.data.cycleId);
  revalidatePath("/employee");
  return { ok: true, editableUntil: cycle.self.editableUntil.toISOString() };
}
