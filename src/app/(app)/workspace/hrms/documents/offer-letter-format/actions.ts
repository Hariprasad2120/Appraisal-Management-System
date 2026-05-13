"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCachedSession as auth } from "@/lib/auth";

async function requireHr() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) throw new Error("Forbidden");
  return session;
}

export async function saveTemplateAction(formData: FormData) {
  const session = await requireHr();
  const id = formData.get("id") as string | null;
  const name = (formData.get("name") as string | null)?.trim();
  const bodyHtml = (formData.get("bodyHtml") as string | null) ?? "";
  const variablesRaw = (formData.get("variables") as string | null) ?? "[]";

  if (!name) throw new Error("Template name is required");

  let variables: string[];
  try {
    variables = JSON.parse(variablesRaw);
  } catch {
    variables = [];
  }

  const orgId = session.user.activeOrganizationId ?? "default-org";

  if (id) {
    await prisma.offerLetterTemplate.update({
      where: { id },
      data: { name, bodyHtml, variables, createdById: session.user.id },
    });
  } else {
    await prisma.offerLetterTemplate.create({
      data: { name, bodyHtml, variables, organizationId: orgId, createdById: session.user.id },
    });
  }
  revalidatePath("/workspace/hrms/documents/offer-letter-format");
}

export async function deleteTemplateAction(id: string) {
  await requireHr();
  await prisma.offerLetterTemplate.delete({ where: { id } });
  revalidatePath("/workspace/hrms/documents/offer-letter-format");
}
