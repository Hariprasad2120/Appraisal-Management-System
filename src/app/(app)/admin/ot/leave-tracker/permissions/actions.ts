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
  date: z.string().min(1),
  fromTime: z.string().min(1),
  toTime: z.string().min(1),
  minutes: z.string().transform(Number),
  reason: z.string().optional(),
});

export async function createPermissionAction(formData: FormData) {
  const session = await requireHr();
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  const d = parsed.data;
  await prisma.permissionRequest.create({
    data: {
      organizationId: session.user.activeOrganizationId ?? "default-org",
      employeeId: d.employeeId,
      date: new Date(d.date),
      fromTime: d.fromTime,
      toTime: d.toTime,
      minutes: d.minutes,
      reason: d.reason,
    },
  });
  revalidatePath("/admin/ot/leave-tracker/permissions");
}

export async function approvePermissionAction(id: string) {
  const session = await requireHr();
  await prisma.permissionRequest.update({
    where: { id },
    data: { status: "APPROVED", approvedById: session.user.id, approvedAt: new Date() },
  });
  revalidatePath("/admin/ot/leave-tracker/permissions");
}

export async function rejectPermissionAction(id: string) {
  const session = await requireHr();
  await prisma.permissionRequest.update({
    where: { id },
    data: { status: "REJECTED", approvedById: session.user.id, approvedAt: new Date() },
  });
  revalidatePath("/admin/ot/leave-tracker/permissions");
}
