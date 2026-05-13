"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCachedSession as auth } from "@/lib/auth";

async function requireHr() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) throw new Error("Forbidden");
  return session;
}

const createSchema = z.object({
  employeeId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  fromDate: z.string().min(1),
  toDate: z.string().min(1),
  days: z.string().transform(Number),
  reason: z.string().optional(),
});

export async function createLeaveRequestAction(formData: FormData) {
  const session = await requireHr();
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  const d = parsed.data;
  await prisma.leaveRequest.create({
    data: {
      organizationId: session.user.activeOrganizationId ?? "default-org",
      employeeId: d.employeeId,
      leaveTypeId: d.leaveTypeId,
      fromDate: new Date(d.fromDate),
      toDate: new Date(d.toDate),
      days: d.days,
      reason: d.reason,
    },
  });
  revalidatePath("/admin/ot/leave-tracker/leaves");
}

export async function approveLeaveAction(id: string) {
  const session = await requireHr();
  const req = await prisma.leaveRequest.findUnique({ where: { id }, include: { leaveType: true } });
  if (!req) throw new Error("Not found");

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id },
      data: { status: "APPROVED", approvedById: session.user.id, approvedAt: new Date() },
    });
    // Deduct from leave balance
    await tx.leaveBalance.upsert({
      where: { employeeId_leaveTypeId_year: { employeeId: req.employeeId, leaveTypeId: req.leaveTypeId, year: req.fromDate.getFullYear() } },
      update: {
        used: { increment: Number(req.days) },
        balance: { decrement: Number(req.days) },
      },
      create: {
        employeeId: req.employeeId,
        leaveTypeId: req.leaveTypeId,
        year: req.fromDate.getFullYear(),
        opening: Number(req.leaveType.defaultQuota),
        accrued: Number(req.leaveType.defaultQuota),
        used: Number(req.days),
        balance: Number(req.leaveType.defaultQuota) - Number(req.days),
      },
    });
  });
  revalidatePath("/admin/ot/leave-tracker/leaves");
}

export async function rejectLeaveAction(id: string) {
  const session = await requireHr();
  await prisma.leaveRequest.update({
    where: { id },
    data: { status: "REJECTED", approvedById: session.user.id, approvedAt: new Date() },
  });
  revalidatePath("/admin/ot/leave-tracker/leaves");
}

export async function createLeaveTypeAction(formData: FormData) {
  const session = await requireHr();
  const code = (formData.get("code") as string)?.trim().toUpperCase();
  const name = (formData.get("name") as string)?.trim();
  const paid = formData.get("paid") === "on";
  const defaultQuota = Number(formData.get("defaultQuota") ?? 0);
  if (!code || !name) throw new Error("Code and name required");
  await prisma.leaveType.create({
    data: {
      organizationId: session.user.activeOrganizationId ?? "default-org",
      code,
      name,
      paid,
      defaultQuota,
    },
  });
  revalidatePath("/admin/ot/leave-tracker/leaves");
}
