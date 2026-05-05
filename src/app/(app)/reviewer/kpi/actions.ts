"use server";

import { revalidatePath, refresh } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  DEFAULT_KPI_MONTHLY_TARGET,
  KPI_MONTHLY_TARGET_SETTING,
  achievementForRating,
  calculateAverageRating,
  calculateMonthlyPointScore,
  calculateWeightedAchievement,
  getKpiPerformanceCategory,
} from "@/lib/kpi";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function requireTlDepartment() {
  const session = await auth();
  if (!session?.user || session.user.role !== "TL") throw new Error("Forbidden");
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
    prisma.systemSetting.findUnique({ where: { key: KPI_MONTHLY_TARGET_SETTING } }),
    prisma.kpiReviewItem.findMany({ where: { reviewId, itemKind: "TASK", assignedToEmployee: true } }),
  ]);
  const monthlyTarget = Number(monthlyTargetSetting?.value ?? DEFAULT_KPI_MONTHLY_TARGET);
  const totalWeightage = items.reduce((sum, item) => sum + item.weightage, 0);
  const rawWeightedAchievement = items.reduce((sum, item) => sum + item.weightedAchievement, 0);
  const totalAchievementPercent = totalWeightage > 0 ? (rawWeightedAchievement * 100) / totalWeightage : 0;
  const monthlyPointScore = calculateMonthlyPointScore(totalAchievementPercent, monthlyTarget);
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
  const achievementPercent = achievementForRating(rating);
  await prisma.kpiReviewItem.update({
    where: { id: item.id },
    data: {
      rating,
      achievementPercent,
      weightedAchievement: calculateWeightedAchievement(item.weightage, achievementPercent),
      remarks: text(formData, "remarks") || null,
    },
  });
  await recalculateReview(item.reviewId);
  revalidatePath("/reviewer/kpi");
  revalidatePath("/admin/kpi");
  revalidatePath("/employee");
  refresh();
}
