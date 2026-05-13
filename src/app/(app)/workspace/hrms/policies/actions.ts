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
  category: z.string().min(1),
  body: z.string().min(1),
  effectiveFrom: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
});

export async function createPolicyAction(formData: FormData) {
  const session = await requireHr();
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  const d = parsed.data;
  const created = await prisma.policy.create({
    data: {
      organizationId: session.user.activeOrganizationId ?? "default-org",
      title: d.title,
      category: d.category,
      body: d.body,
      effectiveFrom: d.effectiveFrom,
      status: d.status,
      createdById: session.user.id,
    },
  });
  revalidatePath("/workspace/hrms/policies");
  redirect(`/workspace/hrms/policies/${created.id}`);
}

export async function updatePolicyAction(id: string, formData: FormData) {
  await requireHr();
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  const d = parsed.data;
  const existing = await prisma.policy.findUnique({ where: { id }, select: { version: true } });
  await prisma.policy.update({
    where: { id },
    data: {
      title: d.title,
      category: d.category,
      body: d.body,
      effectiveFrom: d.effectiveFrom,
      status: d.status,
      version: (existing?.version ?? 1) + 1,
    },
  });
  revalidatePath("/workspace/hrms/policies");
  redirect(`/workspace/hrms/policies/${id}`);
}

export async function archivePolicyAction(id: string) {
  await requireHr();
  await prisma.policy.update({ where: { id }, data: { status: "ARCHIVED", archivedAt: new Date() } });
  revalidatePath("/workspace/hrms/policies");
}
