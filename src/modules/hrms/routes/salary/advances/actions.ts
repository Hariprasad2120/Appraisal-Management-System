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
  amount: z.string().transform(Number),
  reason: z.string().optional(),
  repayFromMonth: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
});

export async function createAdvanceAction(formData: FormData) {
  const session = await requireHr();
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  const d = parsed.data;
  await prisma.advance.create({
    data: {
      employeeId: d.employeeId,
      organizationId: session.user.activeOrganizationId ?? "default-org",
      amount: d.amount,
      reason: d.reason,
      repayFromMonth: d.repayFromMonth,
    },
  });
  revalidatePath("/hrms/salary/advances");
}

export async function approveAdvanceAction(id: string) {
  const session = await requireHr();
  await prisma.advance.update({
    where: { id },
    data: { status: "APPROVED", approvedById: session.user.id },
  });
  revalidatePath("/hrms/salary/advances");
}

export async function rejectAdvanceAction(id: string) {
  const session = await requireHr();
  await prisma.advance.update({
    where: { id },
    data: { status: "REJECTED", approvedById: session.user.id },
  });
  revalidatePath("/hrms/salary/advances");
}

