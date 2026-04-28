"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const schema = z.object({ cycleId: z.string(), content: z.string().min(1) });
type Result = { ok: true } | { ok: false; error: string };

export async function saveMomAction(input: z.infer<typeof schema>): Promise<Result> {
  const session = await auth();
  const allowed = ["ADMIN", "MANAGEMENT", "HR"];
  if (!session?.user || (!allowed.includes(session.user.role) && !(session.user.secondaryRole && allowed.includes(session.user.secondaryRole)))) return { ok: false, error: "Forbidden" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid" };

  const { cycleId, content } = parsed.data;
  await prisma.mOM.upsert({
    where: { cycleId },
    create: { cycleId, content, authorId: session.user.id },
    update: { content },
  });

  await prisma.appraisalCycle.update({ where: { id: cycleId }, data: { status: "SCHEDULED" } });
  revalidatePath(`/admin/mom/${cycleId}`);
  revalidatePath(`/admin/cycles`);
  return { ok: true };
}
