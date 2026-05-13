"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) {
    throw new Error("Forbidden");
  }
  return session;
}

const decisionSchema = z.object({
  requestId: z.string(),
  decision: z.enum(["APPROVED", "REJECTED"]),
});

export async function decidePasskeyResetAction(formData: FormData) {
  const session = await requireAdmin();
  const parsed = decisionSchema.parse({
    requestId: formData.get("requestId"),
    decision: formData.get("decision"),
  });

  const request = await prisma.passkeyResetRequest.update({
    where: { id: parsed.requestId },
    data: {
      status: parsed.decision,
      decidedAt: new Date(),
      decidedById: session.user.id,
    },
    include: { user: true },
  });

  if (parsed.decision === "APPROVED") {
    await prisma.user.update({
      where: { id: request.userId },
      data: { passkeySetupRequired: true },
    });
  }

  await prisma.securityEvent.create({
    data: {
      userId: request.userId,
      email: request.user.email,
      event: "PASSKEY_RESET_ADMIN_DECISION",
      outcome: parsed.decision,
      details: { requestId: request.id, actorId: session.user.id },
    },
  });

  revalidatePath("/account/passkeys");
}

export async function forcePasskeyResetAction(formData: FormData) {
  const session = await requireAdmin();
  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId) throw new Error("Missing user");

  const user = await prisma.user.update({
    where: { id: userId },
    data: { passkeySetupRequired: true },
  });
  await prisma.passkeyResetRequest.create({
    data: {
      userId,
      status: "APPROVED",
      decidedAt: new Date(),
      decidedById: session.user.id,
      reason: "Forced by admin",
    },
  });
  await prisma.securityEvent.create({
    data: {
      userId,
      email: user.email,
      event: "PASSKEY_RESET_FORCED",
      outcome: "SUCCESS",
      details: { actorId: session.user.id },
    },
  });
  revalidatePath("/account/passkeys");
}
