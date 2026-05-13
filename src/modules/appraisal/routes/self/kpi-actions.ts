"use server";

import { revalidatePath, refresh } from "next/cache";
import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { monthStart } from "@/lib/kpi";
import { countWorkingMinutes, calendarFromDb } from "@/lib/working-hours";

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
  revalidatePath("/appraisal");
  refresh();
}

async function requireTaskEmployee(taskId: string, employeeId: string) {
  const task = await prisma.kpiTask.findUnique({
    where: { id: taskId },
    include: {
      review: { select: { status: true } },
      events: { orderBy: { timestamp: "desc" }, take: 5 },
    },
  });
  if (!task) throw new Error("Task not found");
  if (task.assignedToId !== employeeId) throw new Error("Forbidden");
  if (task.review.status === "FINALIZED") throw new Error("Review already finalized");
  return task;
}

async function getCalendar() {
  const rec = await prisma.workingCalendar.findUnique({ where: { id: "default" } });
  return calendarFromDb(rec);
}

export async function startKpiTaskAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const taskId = (formData.get("taskId") as string | null)?.trim() ?? "";

  const task = await requireTaskEmployee(taskId, session.user.id);
  if (task.status !== "ASSIGNED" && task.status !== "REOPENED") {
    throw new Error("Task cannot be started from its current status");
  }

  await prisma.kpiTask.update({
    where: { id: taskId },
    data: { status: "IN_PROGRESS" },
  });
  await prisma.kpiTaskEvent.create({
    data: {
      taskId,
      actorId: session.user.id,
      actorRole: "EMPLOYEE",
      eventType: task.status === "REOPENED" ? "RESUMED" : "STARTED",
      oldStatus: task.status,
      newStatus: "IN_PROGRESS",
    },
  });

  revalidatePath("/appraisal");
  refresh();
}

export async function submitKpiTaskAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const taskId = (formData.get("taskId") as string | null)?.trim() ?? "";
  const remarks = (formData.get("remarks") as string | null)?.trim() || null;
  const fileUrl = (formData.get("fileUrl") as string | null)?.trim() || null;
  const isPartialRaw = formData.get("isPartial");
  const isPartialCompletion = isPartialRaw === "true";

  const task = await requireTaskEmployee(taskId, session.user.id);
  if (task.status !== "IN_PROGRESS" && task.status !== "REOPENED") {
    throw new Error("Task must be in progress before submitting");
  }
  if (task.requiresFileUpload && !fileUrl && !task.fileUrl) {
    throw new Error("Upload proof is required before completing this task");
  }
  if (isPartialCompletion && !remarks) {
    throw new Error("Partial completion requires a reason");
  }

  // Compute elapsed working minutes from STARTED/RESUMED to now, excluding pauses
  const calendar = await getCalendar();
  let elapsedToAdd = 0;
  const startedEvent = task.events.find(
    (e) => e.eventType === "STARTED" || e.eventType === "RESUMED",
  );
  if (startedEvent) {
    elapsedToAdd = countWorkingMinutes(startedEvent.timestamp, new Date(), calendar);
  }

  await prisma.kpiTask.update({
    where: { id: taskId },
    data: {
      status: "WAITING_REVIEW",
      isPartialCompletion,
      employeeRemarks: remarks,
      fileUrl: fileUrl ?? task.fileUrl,
      timerElapsedMinutes: { increment: elapsedToAdd },
    },
  });
  if (isPartialCompletion) {
    await prisma.kpiTaskEvent.create({
      data: {
        taskId,
        actorId: session.user.id,
        actorRole: "EMPLOYEE",
        eventType: "PARTIALLY_COMPLETED",
        oldStatus: task.status,
        newStatus: "WAITING_REVIEW",
        reason: remarks,
        metadata: { elapsedMinutesAdded: elapsedToAdd, fileUrl: fileUrl ?? task.fileUrl },
      },
    });
  }
  await prisma.kpiTaskEvent.create({
    data: {
      taskId,
      actorId: session.user.id,
      actorRole: "EMPLOYEE",
      eventType: "SUBMITTED",
      oldStatus: task.status,
      newStatus: "WAITING_REVIEW",
      reason: isPartialCompletion ? remarks : null,
      metadata: { isPartialCompletion, elapsedMinutesAdded: elapsedToAdd, fileUrl: fileUrl ?? task.fileUrl },
    },
  });

  revalidatePath("/appraisal");
  refresh();
}

export async function requestPauseKpiTaskAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const taskId = (formData.get("taskId") as string | null)?.trim() ?? "";
  const reason = (formData.get("reason") as string | null)?.trim() || null;

  const task = await requireTaskEmployee(taskId, session.user.id);
  if (task.status !== "IN_PROGRESS") throw new Error("Task is not in progress");
  if (!reason) throw new Error("Pause request requires a reason");

  // Accumulate working minutes up to now before pausing
  const calendar = await getCalendar();
  let elapsedToAdd = 0;
  const startedEvent = task.events.find(
    (e) => e.eventType === "STARTED" || e.eventType === "RESUMED",
  );
  if (startedEvent) {
    elapsedToAdd = countWorkingMinutes(startedEvent.timestamp, new Date(), calendar);
  }

  await prisma.kpiTask.update({
    where: { id: taskId },
    data: {
      status: "PAUSED",
      timerElapsedMinutes: { increment: elapsedToAdd },
    },
  });
  await prisma.kpiTaskEvent.create({
    data: {
      taskId,
      actorId: session.user.id,
      actorRole: "EMPLOYEE",
      eventType: "PAUSE_REQUESTED",
      oldStatus: task.status,
      newStatus: "PAUSED",
      reason,
      metadata: { elapsedMinutesAdded: elapsedToAdd },
    },
  });

  revalidatePath("/appraisal");
  refresh();
}

