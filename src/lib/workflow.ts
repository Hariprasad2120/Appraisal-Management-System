import { prisma } from "@/lib/db";
import { addBusinessDays } from "@/lib/business-days";
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
  ratingDeadline?: Date | null;
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

/** Rating window opens once the self-assessment deadline has passed */
export function isReviewWindowOpen(cycle: Pick<WorkflowCycle, "self" | "assignments">, now = new Date()): boolean {
  if (!allReviewersAvailable(cycle.assignments)) return false;
  if (!cycle.self) return false;
  return now >= cycle.self.editableUntil;
}

export function isRatingOpen(
  cycle: Pick<WorkflowCycle, "self" | "assignments">,
  now = new Date(),
): boolean {
  return isReviewWindowOpen(cycle, now);
}

export function getRatingDeadline(cycle: Pick<WorkflowCycle, "self" | "ratingDeadline">): Date | null {
  if (cycle.ratingDeadline) return cycle.ratingDeadline;
  if (!cycle.self) return null;
  return addBusinessDays(cycle.self.editableUntil, 3);
}

export function isManagementReviewOpen(
  cycle: Pick<WorkflowCycle, "self" | "ratingDeadline" | "assignments" | "ratings">,
  now = new Date(),
): boolean {
  const availableAssignments = cycle.assignments.filter(
    (assignment) => assignment.availability === "AVAILABLE",
  );
  if (availableAssignments.length === 0 || cycle.ratings.length < availableAssignments.length) {
    return false;
  }

  const ratingDeadline = getRatingDeadline(cycle);
  return Boolean(ratingDeadline && now >= ratingDeadline);
}

export function getVisibleAverageForReviewer(
  ratings: WorkflowRating[],
  reviewerId: string,
): number | null {
  const reviewerHasRated = ratings.some((rating) => rating.reviewerId === reviewerId);
  if (!reviewerHasRated || ratings.length === 0) return null;
  return ratings.reduce((sum, rating) => sum + rating.averageScore, 0) / ratings.length;
}

export function computeCycleStatus(cycle: WorkflowCycle, now = new Date()): CycleStatus {
  if (
    cycle.status === "DECIDED" ||
    cycle.status === "CLOSED" ||
    cycle.status === "SCHEDULED" ||
    cycle.status === "DATE_VOTING"
  ) {
    return cycle.status;
  }

  if (isManagementReviewOpen(cycle, now)) {
    // Management review opens only after all assigned reviewers submit and the reviewer rating window closes.
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

    // All reviewers confirmed available → notify admin (FYI) + appraisee (actionable)
    if (nextStatus === "PENDING_SELF") {
      const adminUsers = await prisma.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } });
      const empName = cycle.user?.name ?? "an employee";
      const adminIds = new Set(adminUsers.map((u) => u.id));

      // Appraisee: actionable — self-assessment is now open
      await prisma.notification.create({
        data: {
          userId: cycle.userId,
          type: "ALL_REVIEWERS_AVAILABLE",
          message: "All your reviewers have confirmed availability. You can now start your self-assessment.",
          link: "/employee",
          persistent: true,
          critical: true,
        },
      });

      // Admins: FYI only — no action needed, no link
      const adminNotifyIds = adminUsers.map((u) => u.id).filter((id) => id !== cycle.userId);
      await Promise.all(
        adminNotifyIds.map((userId) =>
          prisma.notification.create({
            data: {
              userId,
              type: "ALL_REVIEWERS_AVAILABLE",
              message: `All reviewers for ${empName}'s appraisal confirmed availability. Self-assessment window is now open.`,
              link: null,
              persistent: true,
              critical: false,
            },
          })
        )
      );
    }

    // When all reviewers done → notify management (actionable), appraisee (FYI), reviewers (FYI), admin (FYI)
    if (nextStatus === "MANAGEMENT_REVIEW") {
      const [adminUsers, managementUsers] = await Promise.all([
        prisma.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } }),
        prisma.user.findMany({ where: { role: "MANAGEMENT", active: true }, select: { id: true } }),
      ]);
      const adminIds = new Set(adminUsers.map((u) => u.id));
      const reviewerIds = cycle.assignments.map((a) => a.reviewerId);
      const empName = cycle.user?.name ?? "an employee";

      // Management: actionable — they need to claim and decide
      await Promise.all(
        managementUsers.map((u) =>
          prisma.notification.create({
            data: {
              userId: u.id,
              type: "RATINGS_COMPLETE",
              message: `All reviewers have rated ${empName}'s appraisal. Management review is now open — please claim and finalise the decision.`,
              link: `/management/decide/${cycleId}`,
              persistent: true,
              critical: true,
            },
          })
        )
      );

      // Appraisee: FYI — appraisal moved to management review
      if (!adminIds.has(cycle.userId)) {
        await prisma.notification.create({
          data: {
            userId: cycle.userId,
            type: "RATINGS_COMPLETE",
            message: "All your reviewer ratings are complete. Your appraisal has moved to management review.",
            link: "/employee",
            persistent: true,
            critical: true,
          },
        });
      }

      // Reviewers: FYI — their job is done
      const reviewerNotifyIds = reviewerIds.filter((id) => id !== cycle.userId && !adminIds.has(id));
      await Promise.all(
        reviewerNotifyIds.map((userId) =>
          prisma.notification.create({
            data: {
              userId,
              type: "RATINGS_COMPLETE",
              message: `All ratings for ${empName}'s appraisal are complete. The appraisal has moved to management review.`,
              link: null,
              persistent: false,
              critical: false,
            },
          })
        )
      );

      // Admins: FYI only — no action needed
      const adminNotifyIds = adminUsers.map((u) => u.id).filter((id) => id !== cycle.userId);
      await Promise.all(
        adminNotifyIds.map((userId) =>
          prisma.notification.create({
            data: {
              userId,
              type: "RATINGS_COMPLETE",
              message: `All reviewer ratings for ${empName}'s appraisal are complete. Appraisal is now in management review.`,
              link: null,
              persistent: true,
              critical: false,
            },
          })
        )
      );
    }
  }

  return nextStatus;
}
