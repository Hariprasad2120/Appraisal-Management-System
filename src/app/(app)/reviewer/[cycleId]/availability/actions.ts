"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { syncCycleStatus } from "@/lib/workflow";

export async function forceMarkAvailableAction(assignmentId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) {
    return { ok: false, error: "Forbidden" };
  }

  const assignment = await prisma.cycleAssignment.findUnique({
    where: { id: assignmentId },
  });
  if (!assignment) return { ok: false, error: "Assignment not found" };

  await prisma.cycleAssignment.update({
    where: { id: assignmentId },
    data: { availability: "AVAILABLE", availabilitySubmittedAt: new Date() },
  });

  await prisma.notification.create({
    data: {
      userId: assignment.reviewerId,
      type: "FORCE_AVAILABLE",
      message: "Admin has marked you as AVAILABLE for an appraisal cycle. Please proceed to rate the employee.",
      link: `/reviewer/${assignment.cycleId}`,
      persistent: true,
    },
  });

  await syncCycleStatus(assignment.cycleId);
  revalidatePath(`/admin/employees`);
  revalidatePath(`/reviewer/${assignment.cycleId}`);
  return { ok: true };
}

const schema = z.object({
  assignmentId: z.string(),
  choice: z.enum(["AVAILABLE", "NOT_AVAILABLE"]),
});

type Result = { ok: true } | { ok: false; error: string };

export async function submitAvailabilityAction(input: z.infer<typeof schema>): Promise<Result> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const assignment = await prisma.cycleAssignment.findUnique({
    where: { id: parsed.data.assignmentId },
  });
  if (!assignment || assignment.reviewerId !== session.user.id) {
    return { ok: false, error: "Forbidden" };
  }
  if (assignment.availability !== "PENDING") {
    return { ok: false, error: "Already submitted" };
  }

  await prisma.cycleAssignment.update({
    where: { id: assignment.id },
    data: {
      availability: parsed.data.choice,
      availabilitySubmittedAt: new Date(),
    },
  });

  // Notify the appraisee about reviewer availability update
  {
    const cycle = await prisma.appraisalCycle.findUnique({
      where: { id: assignment.cycleId },
      select: { userId: true },
    });
    const reviewer = await prisma.user.findUnique({
      where: { id: assignment.reviewerId },
      select: { name: true },
    });
    if (cycle && reviewer) {
      const statusLabel = parsed.data.choice === "AVAILABLE" ? "available" : "not available";
      await prisma.notification.create({
        data: {
          userId: cycle.userId,
          type: "REVIEWER_AVAILABILITY",
          message: `${reviewer.name} (${assignment.role}) has marked themselves as ${statusLabel} for your appraisal.`,
          link: "/employee",
          persistent: false,
        },
      });
    }
  }

  if (parsed.data.choice === "NOT_AVAILABLE") {
    // Fetch reviewer name and cycle employee for context
    const reviewer = await prisma.user.findUnique({
      where: { id: assignment.reviewerId },
      select: { name: true },
    });
    const cycle = await prisma.appraisalCycle.findUnique({
      where: { id: assignment.cycleId },
      include: { user: { select: { name: true } } },
    });

    const admins = await prisma.user.findMany({ where: { role: "ADMIN", active: true } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: "NOT_AVAILABLE_ALERT",
          message: `${reviewer?.name ?? "A reviewer"} marked NOT AVAILABLE for ${cycle?.user.name ?? "an employee"}'s appraisal. Action required: reassign or force-mark available.`,
          link: `/admin/employees/${cycle?.userId}/assign`,
          persistent: true,
        },
      });
    }
  }

  await syncCycleStatus(assignment.cycleId);
  revalidatePath(`/reviewer/${assignment.cycleId}`);
  revalidatePath("/reviewer");
  return { ok: true };
}
