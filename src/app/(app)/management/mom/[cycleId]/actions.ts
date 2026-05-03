"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getSystemDate } from "@/lib/system-date";
import { isArrearEligible, computeArrearPeriod, computeArrearAmount } from "@/lib/arrears";

const schema = z.object({
  cycleId: z.string(),
  content: z.string().min(1),
  negotiatedAmount: z.number().min(0).optional(),
});
type Result = { ok: true } | { ok: false; error: string };

function isMeetingDay(now: Date, scheduledDate: Date): boolean {
  return (
    now.getFullYear() === scheduledDate.getFullYear() &&
    now.getMonth() === scheduledDate.getMonth() &&
    now.getDate() === scheduledDate.getDate()
  );
}

export async function saveMomManagementAction(input: z.infer<typeof schema>): Promise<Result> {
  const session = await auth();
  const role = session?.user?.role;
  const secondary = session?.user?.secondaryRole;
  const isManagement = role === "MANAGEMENT" || secondary === "MANAGEMENT";
  if (!session?.user || !isManagement) return { ok: false, error: "Forbidden: Management only" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid" };

  const { cycleId, content, negotiatedAmount } = parsed.data;

  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    include: {
      decision: true,
      user: { include: { salary: true } },
      self: { select: { submittedAt: true } },
    },
  });
  if (!cycle) return { ok: false, error: "Cycle not found" };
  if (!cycle.scheduledDate) return { ok: false, error: "Meeting date not set" };

  const now = await getSystemDate();
  // Allow recording on the meeting day itself or after
  if (now < cycle.scheduledDate && !isMeetingDay(now, cycle.scheduledDate)) {
    return { ok: false, error: "Cannot record MOM before the scheduled meeting date" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.mOM.upsert({
      where: { cycleId_role: { cycleId, role: "MANAGEMENT" } },
      create: { cycleId, role: "MANAGEMENT", content, authorId: session.user.id },
      update: { content },
    });

    if (negotiatedAmount !== undefined && negotiatedAmount > 0 && cycle.decision) {
      const currentGross = cycle.user.salary ? Number(cycle.user.salary.grossAnnum) : 0;
      const newGross = currentGross + negotiatedAmount;
      const hikePercent = currentGross > 0 ? (negotiatedAmount / currentGross) * 100 : 0;

      await tx.appraisalDecision.update({
        where: { cycleId },
        data: { finalAmount: negotiatedAmount },
      });

      if (cycle.user.salary) {
        const sal = cycle.user.salary;
        await tx.salaryRevision.create({
          data: {
            userId: cycle.userId,
            status: "Approved",
            grossAnnum: newGross,
            ctcAnnum: Number(sal.ctcAnnum) + negotiatedAmount,
            revisedCtc: Number(sal.ctcAnnum) + negotiatedAmount,
            isCTCChangedByPerc: false,
            revisionPercentage: parseFloat(hikePercent.toFixed(2)),
            effectiveFrom: new Date(),
            payoutMonth: new Date(),
            basic: Number(sal.basic),
            hra: Number(sal.hra),
            conveyance: Number(sal.conveyance),
            transport: Number(sal.transport),
            travelling: Number(sal.travelling),
            fixedAllowance: Number(sal.fixedAllowance),
            stipend: Number(sal.stipend),
          },
        });

        await tx.employeeSalary.update({
          where: { userId: cycle.userId },
          data: {
            grossAnnum: newGross,
            ctcAnnum: Number(sal.ctcAnnum) + negotiatedAmount,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          cycleId,
          actorId: session.user.id,
          action: "MOM_NEGOTIATED_AMOUNT",
          before: { finalAmount: cycle.decision ? Number(cycle.decision.finalAmount) : 0 },
          after: { negotiatedAmount, newGross: currentGross + negotiatedAmount },
        },
      });
    } else if (cycle.decision && cycle.user.salary) {
      const originalAmount = Number(cycle.decision.finalAmount);
      if (originalAmount > 0) {
        const sal = cycle.user.salary;
        const currentGross = Number(sal.grossAnnum);
        const newGross = currentGross + originalAmount;
        const hikePercent = currentGross > 0 ? (originalAmount / currentGross) * 100 : 0;

        await tx.salaryRevision.create({
          data: {
            userId: cycle.userId,
            status: "Approved",
            grossAnnum: newGross,
            ctcAnnum: Number(sal.ctcAnnum) + originalAmount,
            revisedCtc: Number(sal.ctcAnnum) + originalAmount,
            isCTCChangedByPerc: false,
            revisionPercentage: parseFloat(hikePercent.toFixed(2)),
            effectiveFrom: new Date(),
            payoutMonth: new Date(),
            basic: Number(sal.basic),
            hra: Number(sal.hra),
            conveyance: Number(sal.conveyance),
            transport: Number(sal.transport),
            travelling: Number(sal.travelling),
            fixedAllowance: Number(sal.fixedAllowance),
            stipend: Number(sal.stipend),
          },
        });

        await tx.employeeSalary.update({
          where: { userId: cycle.userId },
          data: {
            grossAnnum: newGross,
            ctcAnnum: Number(sal.ctcAnnum) + originalAmount,
          },
        });
      }
    }

    const finalAmount = negotiatedAmount && negotiatedAmount > 0
      ? negotiatedAmount
      : cycle.decision ? Number(cycle.decision.finalAmount) : 0;

    // Compute arrears if eligible (meeting delayed > 7 days after self-assessment submission)
    let arrearCreated = false;
    if (cycle.self?.submittedAt && cycle.scheduledDate && finalAmount > 0) {
      const period = computeArrearPeriod(cycle.self.submittedAt, cycle.scheduledDate);
      if (period && isArrearEligible(cycle.self.submittedAt, cycle.scheduledDate)) {
        const { dailyRate, arrearAmount } = computeArrearAmount(finalAmount, period.arrearDays);
        await tx.arrear.upsert({
          where: { cycleId },
          create: {
            cycleId,
            userId: cycle.userId,
            arrearDays: period.arrearDays,
            dailyRate,
            arrearAmount,
            periodFrom: period.periodFrom,
            periodTo: period.periodTo,
            status: "PENDING_APPROVAL",
          },
          update: {
            arrearDays: period.arrearDays,
            dailyRate,
            arrearAmount,
            periodFrom: period.periodFrom,
            periodTo: period.periodTo,
            status: "PENDING_APPROVAL",
          },
        });

        await tx.auditLog.create({
          data: {
            cycleId,
            actorId: session.user.id,
            action: "ARREAR_COMPUTED",
            after: {
              arrearDays: period.arrearDays,
              dailyRate,
              arrearAmount,
              periodFrom: period.periodFrom.toISOString(),
              periodTo: period.periodTo.toISOString(),
            },
          },
        });

        // Notify management + admin that arrear needs approval
        const [adminUsers, managementUsers] = await Promise.all([
          tx.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } }),
          tx.user.findMany({ where: { role: "MANAGEMENT", active: true }, select: { id: true } }),
        ]);
        const arrearNotifyIds = new Set([
          ...adminUsers.map((u) => u.id),
          ...managementUsers.map((u) => u.id),
        ]);
        await Promise.all(
          [...arrearNotifyIds].map((uid) =>
            tx.notification.create({
              data: {
                userId: uid,
                type: "ARREAR_PENDING",
                message: `Arrear computed for ${cycle.user.name}: ₹${arrearAmount.toLocaleString("en-IN")} for ${period.arrearDays} days. Pending management approval.`,
                link: `/management/arrears`,
                persistent: true,
                critical: true,
              },
            })
          )
        );
        arrearCreated = true;
      }
    }

    await tx.appraisalCycle.update({
      where: { id: cycleId },
      data: { status: arrearCreated ? "SCHEDULED" : "CLOSED" },
    });

    await tx.notification.create({
      data: {
        userId: cycle.userId,
        type: "MOM_RECORDED",
        message: `Your appraisal meeting has been concluded. Final increment: ₹${finalAmount.toLocaleString("en-IN")}/yr. Your salary has been updated.${arrearCreated ? " Arrear details will be shared after management review." : ""}`,
        link: "/employee",
        persistent: true,
        critical: true,
      },
    });

    await tx.auditLog.create({
      data: {
        cycleId,
        actorId: session.user.id,
        action: "MOM_SAVED",
        after: { role: "MANAGEMENT", hasNegotiation: !!negotiatedAmount },
      },
    });
  });

  revalidatePath(`/management/mom/${cycleId}`);
  revalidatePath(`/management/mom`);
  revalidatePath(`/management/decide/${cycleId}`);
  revalidatePath(`/admin/mom/${cycleId}`);
  revalidatePath(`/admin/mom`);
  revalidatePath(`/employee`);
  revalidatePath(`/reviewer`);
  revalidatePath(`/assignments`);
  return { ok: true };
}
