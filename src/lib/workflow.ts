import { prisma } from "@/lib/db";
import type { CycleStatus, ReviewerAvailability } from "@/generated/prisma/enums";

type WorkflowAssignment = {
  availability: ReviewerAvailability;
};

type WorkflowRating = {
  averageScore: number;
  reviewerId: string;
};

type WorkflowSelf = {
  editableUntil: Date;
  submittedAt: Date | null;
  locked: boolean;
} | null;

type WorkflowCycle = {
  id: string;
  status: CycleStatus;
  self: WorkflowSelf;
  assignments: WorkflowAssignment[];
  ratings: WorkflowRating[];
};

export function isSelfAssessmentSubmitted(self: WorkflowSelf): boolean {
  return Boolean(self?.submittedAt);
}

export function isSelfAssessmentWindowExpired(self: WorkflowSelf, now = new Date()): boolean {
  if (!self) return false;
  return now > self.editableUntil;
}

export function allReviewersAvailable(assignments: WorkflowAssignment[]): boolean {
  if (assignments.length === 0) return false;
  return assignments.every((a) => a.availability === "AVAILABLE");
}

export function hasPendingAvailability(assignments: WorkflowAssignment[] = []): boolean {
  return assignments.some((assignment) => assignment.availability === "PENDING");
}

/** Self-assessment is open to the employee only after all reviewers confirmed AVAILABLE */
export function isSelfAssessmentOpen(
  cycle: Pick<WorkflowCycle, "self" | "assignments">,
): boolean {
  return allReviewersAvailable(cycle.assignments);
}

/** Rating window opens after employee submits self-assessment (or deadline passed) */
export function isReviewWindowOpen(cycle: Pick<WorkflowCycle, "self" | "assignments">, now = new Date()): boolean {
  if (!allReviewersAvailable(cycle.assignments)) return false;
  return isSelfAssessmentSubmitted(cycle.self) || isSelfAssessmentWindowExpired(cycle.self, now);
}

export function isRatingOpen(
  cycle: Pick<WorkflowCycle, "self" | "assignments">,
  now = new Date(),
): boolean {
  return isReviewWindowOpen(cycle, now);
}

export function getVisibleAverageForReviewer(
  ratings: WorkflowRating[],
  reviewerId: string,
): number | null {
  const reviewerHasRated = ratings.some((rating) => rating.reviewerId === reviewerId);
  if (!reviewerHasRated || ratings.length === 0) return null;
  return ratings.reduce((sum, rating) => sum + rating.averageScore, 0) / ratings.length;
}

export function computeCycleStatus(cycle: WorkflowCycle): CycleStatus {
  if (
    cycle.status === "DECIDED" ||
    cycle.status === "CLOSED" ||
    cycle.status === "SCHEDULED" ||
    cycle.status === "MANAGEMENT_REVIEW"
  ) {
    return cycle.status;
  }

  const availableAssignments = cycle.assignments.filter(
    (assignment) => assignment.availability === "AVAILABLE",
  );

  if (availableAssignments.length > 0 && cycle.ratings.length >= availableAssignments.length) {
    // New explicit final stage: management reviews once all assigned reviewers submitted.
    // Backward-compat: older cycles may already be RATINGS_COMPLETE; callers should treat both as equivalent.
    return "MANAGEMENT_REVIEW";
  }

  if (cycle.ratings.length > 0) {
    return "RATING_IN_PROGRESS";
  }

  // All reviewers available → self-assessment phase
  if (allReviewersAvailable(cycle.assignments)) {
    if (isSelfAssessmentSubmitted(cycle.self)) return "SELF_SUBMITTED";
    return "PENDING_SELF";
  }

  // Some reviewers still pending/not-available → awaiting availability
  return "AWAITING_AVAILABILITY";
}

export async function syncCycleStatus(cycleId: string): Promise<CycleStatus | null> {
  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    include: {
      self: {
        select: {
          editableUntil: true,
          submittedAt: true,
          locked: true,
        },
      },
      assignments: {
        select: {
          availability: true,
          reviewerId: true,
        },
      },
      ratings: {
        select: {
          averageScore: true,
          reviewerId: true,
        },
      },
      user: { select: { name: true } },
    },
  });

  if (!cycle) return null;

  const prevStatus = cycle.status;
  const nextStatus = computeCycleStatus(cycle);
  if (prevStatus !== nextStatus) {
    await prisma.appraisalCycle.update({
      where: { id: cycleId },
      data: { status: nextStatus },
    });

    // When all reviewers done → notify management + admin that it's ready for review
    if (nextStatus === "MANAGEMENT_REVIEW") {
      const [adminUsers, managementUsers] = await Promise.all([
        prisma.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } }),
        prisma.user.findMany({ where: { role: "MANAGEMENT", active: true }, select: { id: true } }),
      ]);
      const notifyIds = [...new Set([...adminUsers.map((u) => u.id), ...managementUsers.map((u) => u.id)])];
      const empName = cycle.user?.name ?? "an employee";
      await Promise.all(
        notifyIds.map((userId) =>
          prisma.notification.create({
            data: {
              userId,
              type: "RATINGS_COMPLETE",
              message: `All reviewers have submitted ratings for ${empName}. Appraisal is ready for management review.`,
              link: `/management/decide/${cycleId}`,
              persistent: true,
            },
          })
        )
      );
    }
  }

  return nextStatus;
}
