"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCachedSession as auth } from "@/lib/auth";
import { sendEmail, assignmentEmail } from "@/lib/email";
import { selfAssessmentDeadline } from "@/lib/business-days";
import { syncCycleStatus } from "@/lib/workflow";
import { autoCycleType } from "@/lib/appraisal-eligibility";
import { canBeAppraised } from "@/lib/rbac";

const schema = z.object({
  employeeId: z.string(),
  hrId: z.string(),
  tlId: z.string().optional(),
  mgrId: z.string().optional(),
  /** Backward-compat (legacy UI): true meant "exclude TL reviewer". */
  isManagerCycle: z.boolean().optional(),
  /** New UI toggles (preferred). If omitted, derived from legacy fields. */
  includeTlReviewer: z.boolean().optional(),
  includeManagerReviewer: z.boolean().optional(),
});

const specialSchema = z.object({
  employeeId: z.string(),
  hrId: z.string(),
  tlId: z.string().optional(),
  mgrId: z.string().optional(),
  /** Backward-compat (legacy UI): true meant "exclude TL reviewer". */
  isManagerCycle: z.boolean().optional(),
  /** New UI toggles (preferred). If omitted, derived from legacy fields. */
  includeTlReviewer: z.boolean().optional(),
  includeManagerReviewer: z.boolean().optional(),
});

type Result = { ok: true } | { ok: false; error: string };

async function createOrReuseAssignments(
  cycleId: string,
  assignments: { role: "HR" | "TL" | "MANAGER"; reviewerId: string }[],
  actorId: string,
  employee: { name: string },
  loginUrl: string,
) {
  // Track which reviewers are new or updated (only they get notified)
  const notifyIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    const desiredRoles = new Set(assignments.map((a) => a.role));
    // Remove stale assignments for roles that are no longer desired,
    // but only if that role hasn't already submitted a rating (to avoid breaking in-progress cycles).
    const [existingAssignments, existingRatings] = await Promise.all([
      tx.cycleAssignment.findMany({ where: { cycleId }, select: { id: true, role: true } }),
      tx.rating.findMany({ where: { cycleId }, select: { role: true } }),
    ]);
    const ratedRoles = new Set(existingRatings.map((r) => r.role));
    const removable = existingAssignments.filter((a) => !desiredRoles.has(a.role) && !ratedRoles.has(a.role));
    if (removable.length > 0) {
      await tx.cycleAssignment.deleteMany({ where: { id: { in: removable.map((r) => r.id) } } });
    }

    for (const a of assignments) {
      const existing = await tx.cycleAssignment.findUnique({
        where: { cycleId_role: { cycleId, role: a.role } },
      });
      if (existing) {
        if (existing.reviewerId !== a.reviewerId) {
          await tx.auditLog.create({
            data: {
              cycleId,
              actorId,
              action: "REASSIGN_REVIEWER",
              before: { role: a.role, reviewerId: existing.reviewerId },
              after: { role: a.role, reviewerId: a.reviewerId },
            },
          });
          await tx.cycleAssignment.update({
            where: { id: existing.id },
            data: {
              reviewerId: a.reviewerId,
              assignedById: actorId,
              assignedAt: new Date(),
              availability: "PENDING",
              availabilitySubmittedAt: null,
            },
          });
          // Only the new reviewer gets notified
          notifyIds.push(a.reviewerId);
        }
        // Unchanged assignments: no notification
      } else {
        await tx.cycleAssignment.create({
          data: {
            cycleId,
            role: a.role,
            reviewerId: a.reviewerId,
            assignedById: actorId,
          },
        });
        // New assignment: notify
        notifyIds.push(a.reviewerId);
      }
    }
  });

  if (notifyIds.length === 0) return;

  const reviewers = await prisma.user.findMany({ where: { id: { in: notifyIds } } });
  const roleByReviewer = new Map(assignments.map((a) => [a.reviewerId, a.role]));

  for (const r of reviewers) {
    const role = roleByReviewer.get(r.id) ?? "Reviewer";
    const mail = assignmentEmail({ reviewerName: r.name, employeeName: employee.name, role, loginUrl });
    await sendEmail({ to: r.email, ...mail }).catch(() => {});
    await prisma.notification.create({
      data: {
        userId: r.id,
        type: "ASSIGNMENT",
        message: `You have been assigned as ${role} reviewer for ${employee.name}'s appraisal. Please confirm your availability.`,
        link: `/reviewer/${cycleId}`,
        persistent: true,
        critical: true,
      },
    });
  }
}

async function notifyEmployee(cycleId: string, employeeId: string) {
  await prisma.notification.create({
    data: {
      userId: employeeId,
      type: "CYCLE_STARTED",
      message: "Your appraisal cycle has been started. Please wait for your reviewers to confirm their availability — self-assessment will open once all reviewers are confirmed.",
      link: `/employee`,
      persistent: true,
      critical: true,
    },
  });
}

/** Standard assign — cycle type auto-determined from joining date. */
export async function assignReviewersAction(input: z.infer<typeof schema>): Promise<Result> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) return { ok: false, error: "Forbidden" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const {
    employeeId,
    hrId,
    tlId,
    mgrId,
    isManagerCycle,
    includeTlReviewer,
    includeManagerReviewer,
  } = parsed.data;

  const employee = await prisma.user.findUnique({ where: { id: employeeId } });
  if (!employee || !canBeAppraised(employee.role)) return { ok: false, error: "Employee not found" };

  // Derive toggles from legacy input when not provided.
  const derivedIncludeTL = includeTlReviewer ?? (!isManagerCycle && Boolean(tlId));
  const derivedIncludeManager = includeManagerReviewer ?? Boolean(mgrId);

  // Role-based rules:
  // - HR appraisee: HR only
  // - MANAGER appraisee: HR only
  // - TL appraisee: HR + MANAGER (no TL reviewer)
  // - Others: HR + optional TL + optional MANAGER (via toggles)
  const appraiseeRole = employee.role;
  const mustExcludeTL = appraiseeRole === "HR" || appraiseeRole === "MANAGER" || appraiseeRole === "TL";
  const mustExcludeManager = appraiseeRole === "HR" || appraiseeRole === "MANAGER";

  const effectiveIncludeTL = mustExcludeTL ? false : derivedIncludeTL;
  const effectiveIncludeManager = mustExcludeManager ? false : derivedIncludeManager;

  if (!hrId) return { ok: false, error: "HR reviewer required" };
  if (appraiseeRole === "TL" && !mgrId) return { ok: false, error: "Manager reviewer required for TL appraisee" };
  if (effectiveIncludeTL && !tlId) return { ok: false, error: "TL reviewer required (toggle enabled)" };
  if (effectiveIncludeManager && !mgrId) return { ok: false, error: "Manager reviewer required (toggle enabled)" };

  // Auto-determine cycle type from joining date
  const cycleType = autoCycleType(employee.joiningDate);

  let cycle = await prisma.appraisalCycle.findFirst({
    where: { userId: employeeId, status: { notIn: ["CLOSED", "DECIDED"] } },
    orderBy: { createdAt: "desc" },
  });

  let isNewCycle = false;
  if (!cycle) {
    cycle = await prisma.appraisalCycle.create({
      data: {
        userId: employeeId,
        type: cycleType,
        startDate: new Date(),
        status: "PENDING_SELF",
        // Legacy field: treated as "no TL reviewer included"
        isManagerCycle: !effectiveIncludeTL,
        self: {
          create: { answers: {}, editableUntil: selfAssessmentDeadline(new Date()) },
        },
      },
    });
    isNewCycle = true;
  } else if (isManagerCycle !== undefined || includeTlReviewer !== undefined) {
    await prisma.appraisalCycle.update({
      where: { id: cycle.id },
      data: { isManagerCycle: !effectiveIncludeTL },
    });
  }

  const assignments: { role: "HR" | "TL" | "MANAGER"; reviewerId: string }[] = [{ role: "HR", reviewerId: hrId }];
  if (appraiseeRole === "TL") {
    assignments.push({ role: "MANAGER", reviewerId: mgrId! });
  } else {
    if (effectiveIncludeTL && tlId) assignments.push({ role: "TL", reviewerId: tlId });
    if (effectiveIncludeManager && mgrId) assignments.push({ role: "MANAGER", reviewerId: mgrId });
  }

  const loginUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/login`;
  await createOrReuseAssignments(cycle.id, assignments, session.user.id, employee, loginUrl);
  if (isNewCycle) await notifyEmployee(cycle.id, employeeId);
  await syncCycleStatus(cycle.id);

  revalidatePath(`/workspace/hrms/employees/${employeeId}/assign`);
  revalidatePath("/workspace/hrms");
  return { ok: true };
}

/** Special appraisal — admin-initiated only, outside normal milestone schedule. */
export async function startSpecialAppraisalAction(input: z.infer<typeof specialSchema>): Promise<Result> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) return { ok: false, error: "Forbidden" };

  const parsed = specialSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const {
    employeeId,
    hrId,
    tlId,
    mgrId,
    isManagerCycle,
    includeTlReviewer,
    includeManagerReviewer,
  } = parsed.data;

  const employee = await prisma.user.findUnique({ where: { id: employeeId } });
  if (!employee || !canBeAppraised(employee.role)) return { ok: false, error: "Employee not found" };

  // Derive toggles from legacy input when not provided.
  const derivedIncludeTL = includeTlReviewer ?? (!isManagerCycle && Boolean(tlId));
  const derivedIncludeManager = includeManagerReviewer ?? Boolean(mgrId);

  const appraiseeRole = employee.role;
  const mustExcludeTL = appraiseeRole === "HR" || appraiseeRole === "MANAGER" || appraiseeRole === "TL";
  const mustExcludeManager = appraiseeRole === "HR" || appraiseeRole === "MANAGER";

  const effectiveIncludeTL = mustExcludeTL ? false : derivedIncludeTL;
  const effectiveIncludeManager = mustExcludeManager ? false : derivedIncludeManager;

  if (!hrId) return { ok: false, error: "HR reviewer required" };
  if (appraiseeRole === "TL" && !mgrId) return { ok: false, error: "Manager reviewer required for TL appraisee" };
  if (effectiveIncludeTL && !tlId) return { ok: false, error: "TL reviewer required (toggle enabled)" };
  if (effectiveIncludeManager && !mgrId) return { ok: false, error: "Manager reviewer required (toggle enabled)" };

  const activeCycle = await prisma.appraisalCycle.findFirst({
    where: { userId: employeeId, status: { notIn: ["CLOSED", "DECIDED"] } },
  });
  if (activeCycle) return { ok: false, error: "Employee already has an active cycle" };

  const cycle = await prisma.appraisalCycle.create({
    data: {
      userId: employeeId,
      type: "SPECIAL",
      startDate: new Date(),
      status: "PENDING_SELF",
      // Legacy field: treated as "no TL reviewer included"
      isManagerCycle: !effectiveIncludeTL,
      self: {
        create: { answers: {}, editableUntil: selfAssessmentDeadline(new Date()) },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      cycleId: cycle.id,
      actorId: session.user.id,
      action: "SPECIAL_APPRAISAL_CREATED",
      after: { initiatedBy: session.user.id },
    },
  });

  const assignments: { role: "HR" | "TL" | "MANAGER"; reviewerId: string }[] = [{ role: "HR", reviewerId: hrId }];
  if (appraiseeRole === "TL") {
    assignments.push({ role: "MANAGER", reviewerId: mgrId! });
  } else {
    if (effectiveIncludeTL && tlId) assignments.push({ role: "TL", reviewerId: tlId });
    if (effectiveIncludeManager && mgrId) assignments.push({ role: "MANAGER", reviewerId: mgrId });
  }

  const loginUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/login`;
  await createOrReuseAssignments(cycle.id, assignments, session.user.id, employee, loginUrl);
  await notifyEmployee(cycle.id, employeeId);
  await syncCycleStatus(cycle.id);

  revalidatePath(`/workspace/hrms/employees/${employeeId}/assign`);
  revalidatePath("/workspace/hrms");
  return { ok: true };
}

export async function forceMarkAvailableAction(assignmentId: string): Promise<Result> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) return { ok: false, error: "Forbidden" };

  const assignment = await prisma.cycleAssignment.findUnique({
    where: { id: assignmentId },
    include: { reviewer: { select: { name: true } }, cycle: { include: { user: { select: { name: true } } } } },
  });
  if (!assignment) return { ok: false, error: "Assignment not found" };

  await prisma.$transaction(async (tx) => {
    await tx.cycleAssignment.update({
      where: { id: assignmentId },
      data: { availability: "AVAILABLE", availabilitySubmittedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        cycleId: assignment.cycleId,
        actorId: session.user.id,
        action: "FORCE_MARK_AVAILABLE",
        after: { assignmentId, reviewerId: assignment.reviewerId, role: assignment.role },
      },
    });
    await tx.notification.create({
      data: {
        userId: assignment.reviewerId,
        type: "FORCE_MARKED_AVAILABLE",
        message: `You have been force-marked as AVAILABLE for ${assignment.cycle.user.name}'s appraisal by admin. Please proceed to rate.`,
        link: `/reviewer/${assignment.cycleId}`,
        persistent: true,
        critical: true,
      },
    });
  });

  await syncCycleStatus(assignment.cycleId);
  revalidatePath(`/workspace/hrms/employees/${assignment.cycle.userId}/assign`);
  revalidatePath(`/reviewer/${assignment.cycleId}`);
  return { ok: true };
}

export async function fastForwardSelfAssessmentAction(cycleId: string): Promise<Result> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) return { ok: false, error: "Forbidden" };

  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    include: { self: true },
  });
  if (!cycle?.self) return { ok: false, error: "Cycle not found" };

  await prisma.selfAssessment.update({
    where: { cycleId },
    data: { editableUntil: new Date(Date.now() - 60_000), locked: true },
  });

  await syncCycleStatus(cycleId);
  revalidatePath(`/workspace/hrms/employees/${cycle.userId}/assign`);
  revalidatePath(`/reviewer/${cycleId}`);
  revalidatePath("/ams/reviewer");
  revalidatePath("/ams/employee");
  return { ok: true };
}
