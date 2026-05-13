import { prisma } from "@/lib/db";
import { addBusinessDays } from "@/lib/business-days";
import type { ArrearStatus, CycleStatus, ReviewerAvailability } from "@/generated/prisma/enums";

type WorkflowAssignment = {
  availability: ReviewerAvailability;
};

type WorkflowRating = {
  averageScore: number;
  reviewerId: string;
};

type WorkflowMom = {
  role: string;
};

type WorkflowArrear = {
  status: ArrearStatus;
} | null;

type WorkflowDecision = object | null;

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
  decision?: WorkflowDecision;
  moms?: WorkflowMom[];
  arrear?: WorkflowArrear;
};

export type CycleStageKind = "active" | "post_review" | "completed";

export type CycleStageInfo = {
  kind: CycleStageKind;
  label: string;
  detail: string;
  actionLabel: string;
  actionHref: string;
  tone: "amber" | "primary" | "green" | "slate" | "blue" | "purple";
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
  if (isCycleOperationallyClosed(cycle)) {
    return "CLOSED";
  }

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

export function isCycleOperationallyClosed(
  cycle: Pick<WorkflowCycle, "status"> & Partial<Pick<WorkflowCycle, "moms" | "arrear">>,
): boolean {
  if (cycle.status === "CLOSED") return true;

  const meetingRecorded = cycle.moms?.some((mom) => mom.role === "MANAGEMENT") ?? false;
  if (!meetingRecorded) return false;

  if (!("arrear" in cycle) || !cycle.arrear) return true;
  return cycle.arrear.status === "PAID" || cycle.arrear.status === "REJECTED";
}

export function getCycleStageInfo(
  cycle: Pick<
    WorkflowCycle,
    "id" | "status" | "self" | "assignments" | "ratings" | "ratingDeadline"
  > &
    Partial<Pick<WorkflowCycle, "decision" | "moms" | "arrear">> & {
      scheduledDate?: Date | null;
      tentativeDate1?: Date | null;
      tentativeDate2?: Date | null;
    },
  reviewerId: string,
  assignment?: WorkflowAssignment & { role?: string },
  now = new Date(),
): CycleStageInfo {
  const status = computeCycleStatus(cycle as WorkflowCycle, now);
  const reviewerRated = cycle.ratings.some((rating) => rating.reviewerId === reviewerId);
  const ratingOpen = isRatingOpen(cycle, now);
  const managementMomRecorded = cycle.moms?.some((mom) => mom.role === "MANAGEMENT") ?? false;
  const hrMomRecorded = cycle.moms?.some((mom) => mom.role === "HR") ?? false;
  const isHrAssignment = assignment?.role === "HR";

  if (status === "CLOSED") {
    return {
      kind: "completed",
      label: "Cycle Closed",
      detail: cycle.arrear?.status === "PAID" ? "Meeting recorded and arrear completed" : "Meeting recorded",
      actionLabel: "View History",
      actionHref: `/ams/reviewer/${cycle.id}`,
      tone: "green",
    };
  }

  if (assignment?.availability === "PENDING") {
    return {
      kind: "active",
      label: "Set Availability",
      detail: "Reviewer action required",
      actionLabel: "Set Availability",
      actionHref: `/ams/reviewer/${cycle.id}/availability`,
      tone: "amber",
    };
  }

  if (assignment?.availability === "NOT_AVAILABLE") {
    return {
      kind: "completed",
      label: "Not Available",
      detail: "No reviewer action needed",
      actionLabel: "View Details",
      actionHref: `/ams/reviewer/${cycle.id}`,
      tone: "slate",
    };
  }

  if (assignment?.availability === "AVAILABLE" && ratingOpen && !reviewerRated) {
    return {
      kind: "active",
      label: "Rating Open",
      detail: "Reviewer rating pending",
      actionLabel: "Rate Now",
      actionHref: `/ams/reviewer/${cycle.id}/rate`,
      tone: "primary",
    };
  }

  if (cycle.arrear?.status === "PENDING_APPROVAL") {
    return {
      kind: "post_review",
      label: "Arrear Pending",
      detail: "Meeting recorded; arrear approval pending",
      actionLabel: "View Status",
      actionHref: `/ams/reviewer/${cycle.id}`,
      tone: "amber",
    };
  }

  if (cycle.arrear?.status === "APPROVED") {
    return {
      kind: "post_review",
      label: "Arrear Approved",
      detail: "Awaiting arrear payout completion",
      actionLabel: "View Status",
      actionHref: `/ams/reviewer/${cycle.id}`,
      tone: "blue",
    };
  }

  if (managementMomRecorded) {
    return {
      kind: "post_review",
      label: "Meeting Recorded",
      detail: "Post-meeting records available",
      actionLabel: "View Status",
      actionHref: `/ams/reviewer/${cycle.id}`,
      tone: "green",
    };
  }

  if (cycle.scheduledDate) {
    return {
      kind: "post_review",
      label: hrMomRecorded ? "HR MoM Recorded" : "Meeting Scheduled",
      detail: hrMomRecorded ? "Awaiting management MoM" : "Awaiting meeting record",
      actionLabel: isHrAssignment && !hrMomRecorded ? "Record MoM" : "Meeting Status",
      actionHref: isHrAssignment && !hrMomRecorded ? `/ams/reviewer/mom/${cycle.id}` : `/ams/reviewer/${cycle.id}`,
      tone: "purple",
    };
  }

  if (isHrAssignment && (cycle.tentativeDate1 || cycle.tentativeDate2)) {
    return {
      kind: "post_review",
      label: "Confirm Meeting",
      detail: "Management proposed meeting dates",
      actionLabel: "Confirm Date",
      actionHref: `/ams/reviewer/${cycle.id}/schedule`,
      tone: "primary",
    };
  }

  if (cycle.decision || status === "DECIDED" || status === "DATE_VOTING") {
    return {
      kind: "post_review",
      label: status === "DATE_VOTING" ? "Scheduling Meeting" : "Salary Discussion",
      detail: "Rating completed; meeting flow in progress",
      actionLabel: "View Status",
      actionHref: `/ams/reviewer/${cycle.id}`,
      tone: "blue",
    };
  }

  if (reviewerRated) {
    return {
      kind: "post_review",
      label: "Rating Submitted",
      detail: "Waiting for cycle to move forward",
      actionLabel: "View Status",
      actionHref: `/ams/reviewer/${cycle.id}`,
      tone: "green",
    };
  }

  return {
    kind: "active",
    label: "Waiting",
    detail: "No reviewer action right now",
    actionLabel: "View Details",
    actionHref: `/ams/reviewer/${cycle.id}`,
    tone: "slate",
  };
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
      decision: { select: { id: true } },
      moms: { select: { role: true } },
      arrear: { select: { status: true } },
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
      // Appraisee: actionable — self-assessment is now open
      await prisma.notification.create({
        data: {
          userId: cycle.userId,
          type: "ALL_REVIEWERS_AVAILABLE",
          message: "All your reviewers have confirmed availability. You can now start your self-assessment.",
          link: "/ams/employee",
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
              link: `/ams/management/decide/${cycleId}`,
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
            link: "/ams/employee",
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
