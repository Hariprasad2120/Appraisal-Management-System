"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCachedSession as auth } from "@/lib/auth";

async function requireHr() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) throw new Error("Forbidden");
  return session;
}

const schema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  audience: z.enum(["ORG", "DEPARTMENT", "DIVISION"]),
  targetId: z.string().optional().transform((v) => v || undefined),
  publishedAt: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  expiresAt: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
});

export async function createAnnouncementAction(formData: FormData) {
  const session = await requireHr();
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  const d = parsed.data;
  await prisma.announcement.create({
    data: {
      organizationId: session.user.activeOrganizationId ?? "default-org",
      title: d.title,
      body: d.body,
      audience: d.audience,
      targetId: d.targetId,
      publishedAt: d.publishedAt,
      expiresAt: d.expiresAt,
      createdById: session.user.id,
    },
  });
  revalidatePath("/workspace/hrms/announcements");
  redirect("/workspace/hrms/announcements");
}

export async function deleteAnnouncementAction(id: string) {
  await requireHr();
  await prisma.announcement.delete({ where: { id } });
  revalidatePath("/workspace/hrms/announcements");
}
