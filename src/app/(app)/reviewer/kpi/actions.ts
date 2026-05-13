"use server";

import { revalidatePath, refresh } from "next/cache";
import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  DEFAULT_KPI_MONTHLY_TARGET,
  KPI_MONTHLY_TARGET_SETTING,
  calculateAverageRating,
  calculateCriterionPoints,
  getKpiPerformanceCategory,
} from "@/lib/kpi";
import { buildKpiPointsExplanation, buildKpiRatingExplanation } from "@/lib/kpi-audit";
import { calculateAssignedDayMonthlyRating, calculateTaskRating, type RuleConfig } from "@/lib/kpi-rules";
import { calendarFromDb, countWorkingMinutes } from "@/lib/working-hours";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function requireTlDepartment() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "TL" && session.user.secondaryRole !== "TL")) throw new Error("Forbidden");
  return { session };
}

async function ensureTaskForTlEmployee(itemId: string, tlId: string) {
  const item = await prisma.kpiReviewItem.findUnique({
    where: { id: itemId },
    include: {
      review: {
        select: {
          id: true,
          departmentId: true,
          status: true,
          user: { select: { reportingManagerId: true } },
        },
      },
    },
  });
  if (!item || item.itemKind !== "TASK" || item.review.user.reportingManagerId !== tlId) throw new Error("Forbidden");
  if (item.review.status === "FINALIZED") throw new Error("Finalized KPI reviews cannot be changed");
  return item;
}

async function recalculateReview(reviewId: string) {
  const [monthlyTargetSetting, items] = await Promise.all([
    prisma.systemSetting.findFirst({ where: { key: KPI_MONTHLY_TARGET_SETTING } }),
    prisma.kpiReviewItem.findMany({ where: { reviewId, itemKind: "TASK", assignedToEmployee: true } }),
  ]);
  const monthlyTarget = Number(monthlyTargetSetting?.value ?? DEFAULT_KPI_MONTHLY_TARGET);
  // weightedAchievement stores per-task criterion points
  const totalPoints = items.reduce((sum, item) => sum + item.weightedAchievement, 0);
  const monthlyPointScore = Math.round(totalPoints);
  const totalAchievementPercent = monthlyTarget > 0 ? (totalPoints / monthlyTarget) * 100 : 0;
  await prisma.kpiReview.update({
    where: { id: reviewId },
    data: {
      totalAchievementPercent,
      monthlyPointScore,
      averageRating: calculateAverageRating(items.map((item) => item.rating)),
      performanceCategory: getKpiPerformanceCategory(monthlyPointScore),
    },
  });
}

async function recalculateTaskReview(reviewId: string) {
  const [monthlyTargetSetting, workingCalendar, tasks] = await Promise.all([
    prisma.systemSetting.findFirst({ where: { key: KPI_MONTHLY_TARGET_SETTING } }),
    prisma.workingCalendar.findUnique({ where: { id: "default" } }),
    prisma.kpiTask.findMany({
      where: { reviewId, status: "CLOSED", finalRating: { not: null } },
      include: { criterion: { select: { id: true, weightage: true } } },
    }),
  ]);
  const monthlyTarget = Number(monthlyTargetSetting?.value ?? DEFAULT_KPI_MONTHLY_TARGET);
  const timezone = workingCalendar?.timezone ?? "Asia/Kolkata";
  const byCriterion = new Map<string, { weightage: number; tasks: Array<{ assignedDate: Date; finalRating: number | null }> }>();
  for (const task of tasks) {
    if (task.finalRating === null) continue;
    const row = byCriterion.get(task.criterionId) ?? {
      weightage: task.criterion.weightage,
      tasks: [],
    };
    row.tasks.push({ assignedDate: task.assignedDate, finalRating: task.finalRating });
    byCriterion.set(task.criterionId, row);
  }

  let totalPoints = 0;
  const criterionRatings: number[] = [];
  for (const row of byCriterion.values()) {
    const rating = calculateAssignedDayMonthlyRating(row.tasks, timezone) ?? 0;
    criterionRatings.push(rating);
    totalPoints += calculateCriterionPoints(row.weightage, rating, monthlyTarget);
  }

  const monthlyPointScore = Math.round(totalPoints);
  await prisma.kpiReview.update({
    where: { id: reviewId },
    data: {
      totalAchievementPercent: monthlyTarget > 0 ? (totalPoints / monthlyTarget) * 100 : 0,
      monthlyPointScore,
      averageRating: calculateAverageRating(criterionRatings),
      performanceCategory: getKpiPerformanceCategory(monthlyPointScore),
    },
  });
}

async function ensureKpiTaskForTl(taskId: string, tlId: string) {
  const task = await prisma.kpiTask.findUnique({
    where: { id: taskId },
    include: {
      criterion: true,
      review: {
        select: {
          id: true,
          status: true,
          user: { select: { reportingManagerId: true } },
        },
      },
      events: {
        orderBy: { timestamp: "desc" },
        take: 10,
      },
    },
  });
  if (!task || task.review.user.reportingManagerId !== tlId) throw new Error("Forbidden");
  if (task.review.status === "FINALIZED") throw new Error("Review already finalized");
  return task;
}

export async function approveKpiTaskAction(formData: FormData): Promise<void> {
  const { session } = await requireTlDepartment();
  const itemId = text(formData, "itemId");
  const approvalStatus = text(formData, "approvalStatus");
  if (!["APPROVED", "DISAPPROVED"].includes(approvalStatus)) throw new Error("Invalid approval status");
  const item = await ensureTaskForTlEmployee(itemId, session.user.id);
  await prisma.kpiReviewItem.update({
    where: { id: item.id },
    data: {
      approvalStatus: approvalStatus as "APPROVED" | "DISAPPROVED",
      approvalRemarks: text(formData, "approvalRemarks") || null,
      approvedById: session.user.id,
      approvedAt: new Date(),
      ...(approvalStatus === "DISAPPROVED"
        ? {
            assignedToEmployee: false,
            rating: null,
            achievementPercent: 0,
            weightedAchievement: 0,
          }
        : {}),
    },
  });
  await recalculateReview(item.reviewId);
  revalidatePath("/reviewer/kpi");
  refresh();
}

export async function assignKpiTaskToEmployeeAction(formData: FormData): Promise<void> {
  const { session } = await requireTlDepartment();
  const itemId = text(formData, "itemId");
  const assigned = text(formData, "assignedToEmployee") === "true";
  const item = await ensureTaskForTlEmployee(itemId, session.user.id);
  if (assigned && item.approvalStatus !== "APPROVED") {
    throw new Error("Only approved KPI tasks can be assigned to employees");
  }
  await prisma.kpiReviewItem.update({
    where: { id: item.id },
    data: assigned
      ? { assignedToEmployee: true }
      : {
          assignedToEmployee: false,
          rating: null,
          achievementPercent: 0,
          weightedAchievement: 0,
        },
  });
  await recalculateReview(item.reviewId);
  revalidatePath("/reviewer/kpi");
  revalidatePath("/employee");
  refresh();
}

export async function rateKpiTaskAction(formData: FormData): Promise<void> {
  const { session } = await requireTlDepartment();
  const itemId = text(formData, "itemId");
  const rating = Number(text(formData, "rating"));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw new Error("Rating must be between 1 and 5");
  const item = await ensureTaskForTlEmployee(itemId, session.user.id);
  if (item.approvalStatus !== "APPROVED") throw new Error("Approve the task before rating");
  if (!item.assignedToEmployee) throw new Error("Assign the task to the employee before rating");
  const monthlyTargetSetting = await prisma.systemSetting.findFirst({ where: { key: KPI_MONTHLY_TARGET_SETTING } });
  const monthlyTarget = Number(monthlyTargetSetting?.value ?? DEFAULT_KPI_MONTHLY_TARGET);
  // weightedAchievement stores criterion points for this task
  const criterionPoints = calculateCriterionPoints(item.weightage, rating, monthlyTarget);
  await prisma.kpiReviewItem.update({
    where: { id: item.id },
    data: {
      rating,
      achievementPercent: (rating / 4) * 100,
      weightedAchievement: criterionPoints,
      remarks: text(formData, "remarks") || null,
    },
  });
  await recalculateReview(item.reviewId);
  revalidatePath("/reviewer/kpi");
  revalidatePath("/admin/kpi");
  revalidatePath("/employee");
  refresh();
}

export async function approveCriterionAction(formData: FormData): Promise<void> {
  const { session } = await requireTlDepartment();
  const criterionId = text(formData, "criterionId");
  const decision = text(formData, "decision");
  if (!criterionId) throw new Error("Missing criterion");
  if (decision !== "APPROVED" && decision !== "DISAPPROVED") throw new Error("Invalid decision");

  const criterion = await prisma.kpiCriterion.findUnique({
    where: { id: criterionId },
    select: { departmentId: true, divisionId: true },
  });
  if (!criterion) throw new Error("Criterion not found");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { kpiDepartmentId: true },
  });
  if (!me?.kpiDepartmentId) throw new Error("You are not assigned to a KPI department");

  const myDeptId = me.kpiDepartmentId;
  if (criterion.departmentId !== myDeptId && criterion.divisionId !== myDeptId) {
    throw new Error("This criterion does not belong to your department");
  }

  await prisma.kpiCriterion.update({
    where: { id: criterionId },
    data: {
      approvalStatus: decision as "APPROVED" | "DISAPPROVED",
      approvedById: session.user.id,
      approvedAt: new Date(),
    },
  });

  revalidatePath("/reviewer/kpi");
  revalidatePath("/admin/kpi");
  refresh();
}

export async function createKpiTaskAction(formData: FormData): Promise<void> {
  const { session } = await requireTlDepartment();
  const criterionId = text(formData, "criterionId");
  const reviewId = text(formData, "reviewId");
  const assignedToId = text(formData, "assignedToId");
  const name = text(formData, "name");
  const description = text(formData, "description") || null;
  const taskType = text(formData, "taskType") || "ONE_TIME";
  const assignedDate = text(formData, "assignedDate") || null;
  const dueDate = text(formData, "dueDate") || null;
  const requiresFileUploadRaw = text(formData, "requiresFileUpload");
  const tlRemarks = text(formData, "tlRemarks") || null;
  const bulkCountRaw = Number(text(formData, "bulkCount") || "1");
  const bulkCount = Number.isFinite(bulkCountRaw) ? Math.min(25, Math.max(1, Math.floor(bulkCountRaw))) : 1;

  if (!criterionId || !reviewId || !name) {
    throw new Error("Criterion, review, employee, and name are required");
  }

  const criterion = await prisma.kpiCriterion.findUnique({
    where: { id: criterionId },
    select: { approvalStatus: true, departmentId: true, divisionId: true, ruleConfig: true },
  });
  if (!criterion || criterion.approvalStatus !== "APPROVED") {
    throw new Error("Criterion must be approved before creating tasks");
  }

  const review = await prisma.kpiReview.findUnique({
    where: { id: reviewId },
    select: {
      userId: true,
      departmentId: true,
      status: true,
      user: { select: { reportingManagerId: true, kpiDepartmentId: true } },
    },
  });
  if (!review) throw new Error("Review not found");
  if (review.status === "FINALIZED") throw new Error("Review is already finalized");
  if (review.user.reportingManagerId !== session.user.id) {
    throw new Error("This employee does not report to you");
  }
  if (assignedToId && assignedToId !== review.userId) {
    throw new Error("Selected employee does not match the KPI review");
  }
  if (criterion.departmentId !== review.departmentId && criterion.divisionId !== review.user.kpiDepartmentId) {
    throw new Error("Criterion does not match this employee's KPI department");
  }

  const criterionRequiresFileUpload =
    typeof criterion.ruleConfig === "object" &&
    criterion.ruleConfig !== null &&
    !Array.isArray(criterion.ruleConfig) &&
    "requiresFileUpload" in criterion.ruleConfig
      ? Boolean((criterion.ruleConfig as Record<string, unknown>).requiresFileUpload)
      : false;
  const requiresFileUpload =
    requiresFileUploadRaw === "on" || requiresFileUploadRaw === "true" || criterionRequiresFileUpload;

  for (let index = 0; index < bulkCount; index += 1) {
    const task = await prisma.kpiTask.create({
      data: {
        name: bulkCount > 1 ? `${name} ${index + 1}` : name,
        description,
        criterionId,
        reviewId,
        assignedToId: review.userId,
        assignedById: session.user.id,
        taskType: taskType as "ONE_TIME" | "DAILY" | "WEEKLY" | "MONTHLY" | "RECURRING" | "DUE_DATE_BASED",
        assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        requiresFileUpload,
        tlRemarks,
      },
    });

    await prisma.kpiTaskEvent.create({
      data: {
        taskId: task.id,
        actorId: session.user.id,
        actorRole: "TL",
        eventType: "ASSIGNED",
        newStatus: "ASSIGNED",
        reason: tlRemarks,
      },
    });
  }

  revalidatePath("/reviewer/kpi");
  revalidatePath("/employee");
  refresh();
}

/**
 * TL closes a KpiTask: runs the rule engine to compute systemRating,
 * applies partial-completion halving, stores finalRating + explanation.
 * For MANUAL tasks, TL provides the rating directly via formData.
 */
export async function closeKpiTaskAction(formData: FormData): Promise<void> {
  const { session } = await requireTlDepartment();
  const taskId = text(formData, "taskId");
  const manualRatingRaw = text(formData, "manualRating");
  const tlRemarks = text(formData, "tlRemarks") || null;

  if (!taskId) throw new Error("Missing task id");

  const task = await ensureKpiTaskForTl(taskId, session.user.id);
  if (task.status !== "WAITING_REVIEW") throw new Error("Only tasks waiting for review can be closed");

  const completedAt = task.events.find((event) => event.eventType === "SUBMITTED")?.timestamp ?? null;
  const manualRating = manualRatingRaw ? parseFloat(manualRatingRaw) : null;
  if ((task.criterion.ruleType === "MANUAL" || task.criterion.ruleType === "HYBRID") && manualRating === null) {
    throw new Error("Manual rating is required for this task rule");
  }

  const systemRating = calculateTaskRating(
    {
      timerElapsedMinutes: task.timerElapsedMinutes,
      dueDate: task.dueDate,
      assignedDate: task.assignedDate,
      isPartialCompletion: task.isPartialCompletion,
      completedAt,
      manualRating,
    },
    task.criterion.ruleType,
    task.criterion.ruleConfig as RuleConfig,
    false,
  );

  const finalRating = task.isPartialCompletion ? systemRating / 2 : systemRating;
  const ratingExplanation = buildKpiRatingExplanation(
    {
      ...task,
      systemRating,
      finalRating,
      ratingExplanation: null,
    },
    systemRating,
    finalRating,
  );
  const monthlyTargetSetting = await prisma.systemSetting.findFirst({ where: { key: KPI_MONTHLY_TARGET_SETTING } });
  const monthlyTarget = Number(monthlyTargetSetting?.value ?? DEFAULT_KPI_MONTHLY_TARGET);
  const points = calculateCriterionPoints(task.criterion.weightage, finalRating, monthlyTarget);
  const pointsExplanation = buildKpiPointsExplanation(task.criterion.weightage, finalRating, monthlyTarget);

  await prisma.kpiTask.update({
    where: { id: taskId },
    data: {
      status: "CLOSED",
      systemRating,
      finalRating,
      ratingExplanation,
      tlRemarks,
    },
  });

  await prisma.kpiTaskEvent.create({
    data: {
      taskId,
      actorId: session.user.id,
      actorRole: "TL",
      eventType: "CLOSED_BY_TL",
      oldStatus: task.status,
      newStatus: "CLOSED",
      metadata: { systemRating, finalRating },
    },
  });
  await prisma.kpiTaskEvent.create({
    data: {
      taskId,
      actorId: session.user.id,
      actorRole: "SYSTEM",
      eventType: "RATING_CALCULATED",
      metadata: { systemRating, finalRating, ratingExplanation },
    },
  });
  await prisma.kpiTaskEvent.create({
    data: {
      taskId,
      actorId: session.user.id,
      actorRole: "SYSTEM",
      eventType: "POINTS_CALCULATED",
      reason: pointsExplanation,
      metadata: { points, weightage: task.criterion.weightage, finalRating, monthlyTarget },
    },
  });

  await recalculateTaskReview(task.reviewId);
  revalidatePath("/admin/kpi");
  revalidatePath("/reviewer/kpi");
  revalidatePath("/employee");
  refresh();
}

export async function reopenKpiTaskAction(formData: FormData): Promise<void> {
  const { session } = await requireTlDepartment();
  const taskId = text(formData, "taskId");
  const reason = text(formData, "reason");
  if (!taskId) throw new Error("Missing task id");
  if (!reason) throw new Error("Reopen reason is required");

  const task = await ensureKpiTaskForTl(taskId, session.user.id);
  if (task.status !== "WAITING_REVIEW" && task.status !== "PAUSED") {
    throw new Error("Only waiting or paused tasks can be reopened by TL");
  }

  await prisma.kpiTask.update({
    where: { id: taskId },
    data: {
      status: "REOPENED",
      tlRemarks: reason,
      systemRating: null,
      finalRating: null,
      ratingExplanation: null,
    },
  });
  await prisma.kpiTaskEvent.create({
    data: {
      taskId,
      actorId: session.user.id,
      actorRole: "TL",
      eventType: "REOPENED",
      oldStatus: task.status,
      newStatus: "REOPENED",
      reason,
    },
  });

  await recalculateTaskReview(task.reviewId);
  revalidatePath("/reviewer/kpi");
  revalidatePath("/employee");
  refresh();
}

export async function pauseKpiTaskByTlAction(formData: FormData): Promise<void> {
  const { session } = await requireTlDepartment();
  const taskId = text(formData, "taskId");
  const reason = text(formData, "reason");
  if (!taskId) throw new Error("Missing task id");
  if (!reason) throw new Error("Pause reason is required");

  const task = await ensureKpiTaskForTl(taskId, session.user.id);
  if (task.status === "CLOSED") throw new Error("Closed tasks cannot be paused by TL");

  let elapsedToAdd = 0;
  if (task.status === "IN_PROGRESS") {
    const rec = await prisma.workingCalendar.findUnique({ where: { id: "default" } });
    const calendar = calendarFromDb(rec);
    const startedEvent = task.events.find((event) => event.eventType === "STARTED" || event.eventType === "RESUMED");
    if (startedEvent) {
      elapsedToAdd = countWorkingMinutes(startedEvent.timestamp, new Date(), calendar);
    }
  }

  await prisma.kpiTask.update({
    where: { id: taskId },
    data: {
      status: "PAUSED",
      tlRemarks: reason,
      ...(elapsedToAdd > 0 ? { timerElapsedMinutes: { increment: elapsedToAdd } } : {}),
    },
  });
  await prisma.kpiTaskEvent.create({
    data: {
      taskId,
      actorId: session.user.id,
      actorRole: "TL",
      eventType: task.status === "PAUSED" ? "PAUSE_APPROVED" : "PAUSED_BY_TL",
      oldStatus: task.status,
      newStatus: "PAUSED",
      reason,
      metadata: elapsedToAdd > 0 ? { elapsedMinutesAdded: elapsedToAdd } : undefined,
    },
  });

  revalidatePath("/reviewer/kpi");
  revalidatePath("/employee");
  refresh();
}

export async function rejectPauseKpiTaskAction(formData: FormData): Promise<void> {
  const { session } = await requireTlDepartment();
  const taskId = text(formData, "taskId");
  const reason = text(formData, "reason");
  if (!taskId) throw new Error("Missing task id");
  if (!reason) throw new Error("Rejection reason is required");

  const task = await ensureKpiTaskForTl(taskId, session.user.id);
  if (task.status !== "PAUSED") throw new Error("Only paused tasks can have a pause request rejected");

  await prisma.kpiTask.update({
    where: { id: taskId },
    data: {
      status: "REOPENED",
      tlRemarks: reason,
    },
  });
  await prisma.kpiTaskEvent.create({
    data: {
      taskId,
      actorId: session.user.id,
      actorRole: "TL",
      eventType: "PAUSE_REJECTED",
      oldStatus: task.status,
      newStatus: "REOPENED",
      reason,
    },
  });

  revalidatePath("/reviewer/kpi");
  revalidatePath("/employee");
  refresh();
}
