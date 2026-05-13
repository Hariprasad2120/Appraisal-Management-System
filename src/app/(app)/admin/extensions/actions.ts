"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCachedSession as auth } from "@/lib/auth";
import { addBusinessDays } from "@/lib/business-days";

type Result = { ok: true } | { ok: false; error: string };

export async function decideExtensionAction(
  extensionId: string,
  decision: "APPROVED" | "REJECTED",
): Promise<Result> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) return { ok: false, error: "Forbidden" };

  const ext = await prisma.extensionRequest.findUnique({
    where: { id: extensionId },
    include: { cycle: { include: { assignments: true } } },
  });
  if (!ext) return { ok: false, error: "Not found" };
  if (ext.status !== "PENDING") return { ok: false, error: "Already decided" };

  const extendedUntil = decision === "APPROVED" ? addBusinessDays(new Date(), 2) : null;

  await prisma.$transaction(async (tx) => {
    await tx.extensionRequest.update({
      where: { id: extensionId },
      data: {
        status: decision,
        extendedUntil,
        decidedById: session.user.id,
        updatedAt: new Date(),
      },
    });

    if (extendedUntil) {
      await tx.appraisalCycle.update({
        where: { id: ext.cycleId },
        data: { ratingDeadline: extendedUntil },
      });
    }

    await tx.auditLog.create({
      data: {
        cycleId: ext.cycleId,
        actorId: session.user.id,
        action: `EXTENSION_${decision}`,
        before: {
          extensionId,
          status: ext.status,
          extendedUntil: ext.extendedUntil?.toISOString() ?? null,
        },
        after: {
          extensionId,
          status: decision,
          extendedUntil: extendedUntil?.toISOString() ?? null,
          requesterId: ext.requesterId,
        },
      },
    });
  });

  await prisma.notification.create({
    data: {
      userId: ext.requesterId,
      type: "EXTENSION_DECISION",
      message: decision === "APPROVED"
        ? `Your extension request has been APPROVED. You have 2 additional business days to submit your rating.`
        : `Your extension request has been REJECTED. Please submit your rating immediately.`,
      link: `/reviewer/${ext.cycleId}/rate`,
      persistent: true,
      critical: true,
    },
  });

  revalidatePath("/admin/extensions");
  revalidatePath("/management");
  return { ok: true };
}
