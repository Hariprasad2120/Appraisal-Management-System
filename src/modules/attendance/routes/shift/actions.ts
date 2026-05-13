"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCachedSession as auth } from "@/lib/auth";

async function requireAdminOrHr() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) throw new Error("Forbidden");
  return session;
}

const shiftSchema = z.object({
  name: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  weeklyOff: z.string().transform((v) => {
    try { return JSON.parse(v); } catch { return []; }
  }),
});

export async function createShiftAction(formData: FormData) {
  const session = await requireAdminOrHr();
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = shiftSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  const d = parsed.data;
  await prisma.shift.create({
    data: {
      organizationId: session.user.activeOrganizationId ?? "default-org",
      name: d.name,
      startTime: d.startTime,
      endTime: d.endTime,
      weeklyOff: d.weeklyOff,
    },
  });
  revalidatePath("/admin/ot/shift");
}

const assignSchema = z.object({
  employeeId: z.string().min(1),
  shiftId: z.string().min(1),
  effectiveFrom: z.string().min(1),
});

export async function assignShiftAction(formData: FormData) {
  const session = await requireAdminOrHr();
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = assignSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  const d = parsed.data;
  await prisma.employeeShift.create({
    data: {
      employeeId: d.employeeId,
      shiftId: d.shiftId,
      effectiveFrom: new Date(d.effectiveFrom),
      assignedById: session.user.id,
    },
  });
  revalidatePath("/admin/ot/shift");
}
