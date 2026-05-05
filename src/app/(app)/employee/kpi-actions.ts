"use server";

import { revalidatePath, refresh } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { monthStart } from "@/lib/kpi";

const ALLOWED_STATUSES = new Set(["NOT_COMPLETED", "PARTIALLY_COMPLETED", "FULLY_COMPLETED"]);

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function updateEmployeeKpiTaskStatusAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const itemId = text(formData, "itemId");
  const completionStatus = text(formData, "completionStatus");
  if (!itemId || !ALLOWED_STATUSES.has(completionStatus)) throw new Error("Invalid task status");

  const item = await prisma.kpiReviewItem.findUnique({
    where: { id: itemId },
    include: { review: { select: { userId: true, status: true, month: true } } },
  });
  if (!item || item.itemKind !== "TASK" || item.review.userId !== session.user.id || !item.assignedToEmployee) {
    throw new Error("Forbidden");
  }
  if (item.review.month.getTime() !== monthStart(new Date()).getTime()) {
    throw new Error("Only current month KPI task status can be updated");
  }
  await prisma.kpiReviewItem.update({
    where: { id: itemId },
    data: { completionStatus: completionStatus as "NOT_COMPLETED" | "PARTIALLY_COMPLETED" | "FULLY_COMPLETED" },
  });
  revalidatePath("/employee");
  refresh();
}
