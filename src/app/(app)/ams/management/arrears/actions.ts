"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCachedSession as auth } from "@/lib/auth";
import { isManagement } from "@/lib/rbac";

type Result = { ok: true } | { ok: false; error: string };

const approveSchema = z.object({
  cycleId: z.string(),
  payoutMonth: z.string().datetime(),
});

export async function approveArrearAction(input: z.infer<typeof approveSchema>): Promise<Result> {
  const session = await auth();
  if (!session?.user || !isManagement(session.user.role, session.user.secondaryRole)) {
    return { ok: false, error: "Forbidden" };
  }

  const parsed = approveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { cycleId, payoutMonth } = parsed.data;

  const arrear = await prisma.arrear.findUnique({
    where: { cycleId },
    include: { cycle: { include: { user: true } } },
  });
  if (!arrear) return { ok: false, error: "Arrear not found" };
  if (arrear.status !== "PENDING_APPROVAL") {
    return { ok: false, error: "Arrear already processed" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.arrear.update({
      where: { cycleId },
      data: {
        status: "APPROVED",
        approvedById: session.user.id,
        approvedAt: new Date(),
        payoutMonth: new Date(payoutMonth),
      },
    });

    await tx.auditLog.create({
      data: {
        cycleId,
        actorId: session.user.id,
        action: "ARREAR_APPROVED",
        before: { status: "PENDING_APPROVAL" },
        after: {
          status: "APPROVED",
          arrearDays: arrear.arrearDays,
          arrearAmount: Number(arrear.arrearAmount),
          payoutMonth,
        },
      },
    });

    // Notify employee
    const payoutStr = new Date(payoutMonth).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
    await tx.notification.create({
      data: {
        userId: arrear.userId,
        type: "ARREAR_APPROVED",
        message: `Your arrear of ₹${Number(arrear.arrearAmount).toLocaleString("en-IN")} for ${arrear.arrearDays} days has been approved. It will be credited in ${payoutStr}.`,
        link: "/ams/employee",
        persistent: true,
        critical: true,
      },
    });

    // Notify admin
    const adminUsers = await tx.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } });
    await Promise.all(
      adminUsers.map((u) =>
        tx.notification.create({
          data: {
            userId: u.id,
            type: "ARREAR_APPROVED",
            message: `Arrear for ${arrear.cycle.user.name} approved. ₹${Number(arrear.arrearAmount).toLocaleString("en-IN")} for ${arrear.arrearDays} days — payout: ${payoutStr}.`,
            link: `/admin/arrears`,
            persistent: false,
          },
        })
      )
    );
  });

  revalidatePath("/ams/management/arrears");
  revalidatePath("/ams/admin/arrears");
  revalidatePath("/ams/employee");
  return { ok: true };
}

const rejectSchema = z.object({
  cycleId: z.string(),
  reason: z.string().min(1).max(500),
});

export async function rejectArrearAction(input: z.infer<typeof rejectSchema>): Promise<Result> {
  const session = await auth();
  if (!session?.user || !isManagement(session.user.role, session.user.secondaryRole)) {
    return { ok: false, error: "Forbidden" };
  }

  const parsed = rejectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { cycleId, reason } = parsed.data;

  const arrear = await prisma.arrear.findUnique({
    where: { cycleId },
    include: { cycle: { include: { user: true } } },
  });
  if (!arrear) return { ok: false, error: "Arrear not found" };
  if (arrear.status !== "PENDING_APPROVAL") {
    return { ok: false, error: "Arrear already processed" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.arrear.update({
      where: { cycleId },
      data: {
        status: "REJECTED",
        approvedById: session.user.id,
        approvedAt: new Date(),
        rejectedReason: reason,
      },
    });

    await tx.appraisalCycle.update({
      where: { id: cycleId },
      data: { status: "CLOSED" },
    });

    await tx.auditLog.create({
      data: {
        cycleId,
        actorId: session.user.id,
        action: "ARREAR_REJECTED",
        before: { status: "PENDING_APPROVAL" },
        after: { status: "REJECTED", reason },
      },
    });

    await tx.notification.create({
      data: {
        userId: arrear.userId,
        type: "ARREAR_REJECTED",
        message: `Your arrear request has been reviewed. The arrear payout was not approved at this time.`,
        link: "/ams/employee",
        persistent: true,
        critical: false,
      },
    });
  });

  revalidatePath("/ams/management/arrears");
  revalidatePath("/ams/admin/arrears");
  revalidatePath("/ams/employee");
  revalidatePath("/ams/reviewer");
  revalidatePath("/assignments");
  return { ok: true };
}

const markPaidSchema = z.object({
  cycleId: z.string(),
});

export async function markArrearPaidAction(input: z.infer<typeof markPaidSchema>): Promise<Result> {
  const session = await auth();
  if (!session?.user || !isManagement(session.user.role, session.user.secondaryRole)) {
    return { ok: false, error: "Forbidden" };
  }

  const parsed = markPaidSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { cycleId } = parsed.data;

  const arrear = await prisma.arrear.findUnique({
    where: { cycleId },
    include: { cycle: { include: { user: true } } },
  });
  if (!arrear) return { ok: false, error: "Arrear not found" };
  if (arrear.status !== "APPROVED") return { ok: false, error: "Arrear must be approved before marking paid" };

  await prisma.$transaction(async (tx) => {
    await tx.arrear.update({
      where: { cycleId },
      data: { status: "PAID" },
    });

    await tx.appraisalCycle.update({
      where: { id: cycleId },
      data: { status: "CLOSED" },
    });

    await tx.auditLog.create({
      data: {
        cycleId,
        actorId: session.user.id,
        action: "ARREAR_PAID",
        before: { status: "APPROVED" },
        after: { status: "PAID" },
      },
    });

    await tx.notification.create({
      data: {
        userId: arrear.userId,
        type: "ARREAR_PAID",
        message: `Your arrear of ₹${Number(arrear.arrearAmount).toLocaleString("en-IN")} has been processed and credited.`,
        link: "/ams/employee",
        persistent: true,
        critical: true,
      },
    });
  });

  revalidatePath("/ams/management/arrears");
  revalidatePath("/ams/admin/arrears");
  revalidatePath("/ams/employee");
  revalidatePath("/ams/reviewer");
  revalidatePath("/assignments");
  return { ok: true };
}
