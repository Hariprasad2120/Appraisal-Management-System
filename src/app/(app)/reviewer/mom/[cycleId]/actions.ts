"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getSystemDate } from "@/lib/system-date";

const schema = z.object({
  cycleId: z.string(),
  content: z.string().min(1),
});
type Result = { ok: true } | { ok: false; error: string };

function isMeetingDay(now: Date, scheduledDate: Date): boolean {
  return (
    now.getFullYear() === scheduledDate.getFullYear() &&
    now.getMonth() === scheduledDate.getMonth() &&
    now.getDate() === scheduledDate.getDate()
  );
}

export async function saveHrMomAction(input: z.infer<typeof schema>): Promise<Result> {
  const session = await auth();
  const role = session?.user?.role;
  const secondary = session?.user?.secondaryRole;
  const isHr = role === "HR" || secondary === "HR";
  if (!session?.user || !isHr) return { ok: false, error: "Forbidden: HR only" };

  const { cycleId, content } = schema.parse(input);

  // HR must be assigned to this cycle
  const assignment = await prisma.cycleAssignment.findFirst({
    where: { cycleId, reviewerId: session.user.id, role: "HR" },
  });
  if (!assignment) return { ok: false, error: "Not assigned to this cycle" };

  const cycle = await prisma.appraisalCycle.findUnique({ where: { id: cycleId } });
  if (!cycle) return { ok: false, error: "Cycle not found" };
  if (!cycle.scheduledDate) return { ok: false, error: "Meeting date not set" };

  const now = await getSystemDate();
  if (now < cycle.scheduledDate && !isMeetingDay(now, cycle.scheduledDate)) {
    return { ok: false, error: "Cannot record MOM before the scheduled meeting date" };
  }

  await prisma.mOM.upsert({
    where: { cycleId_role: { cycleId, role: "HR" } },
    create: { cycleId, role: "HR", content, authorId: session.user.id },
    update: { content },
  });

  await prisma.auditLog.create({
    data: {
      cycleId,
      actorId: session.user.id,
      action: "MOM_SAVED",
      after: { role: "HR" },
    },
  });

  revalidatePath(`/reviewer/mom/${cycleId}`);
  revalidatePath(`/reviewer/mom`);
  return { ok: true };
}
