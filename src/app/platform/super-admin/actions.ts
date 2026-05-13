"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { APPRAISAL_MODULE_KEY } from "@/lib/tenant";
import { saveOrganizationSetup } from "@/lib/platform-setup";

const createOrganizationSchema = z.object({
  name: z.string().min(2).max(160),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  industry: z.string().max(120).optional(),
});

async function requirePlatformSuperAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.platformRole !== "PLATFORM_SUPER_ADMIN") redirect("/");
  return session;
}

export async function createOrganizationAction(formData: FormData) {
  const session = await requirePlatformSuperAdmin();
  const parsed = createOrganizationSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    industry: formData.get("industry") || undefined,
  });
  if (!parsed.success) throw new Error("Enter a valid organization name and slug.");
  await saveOrganizationSetup(session.user, {
    name: parsed.data.name,
    slug: parsed.data.slug,
    industry: parsed.data.industry,
    legalName: parsed.data.name,
    address: "",
    contactEmail: "",
    contactPhone: "",
    timezone: "Asia/Kolkata",
    locale: "en-IN",
    dateFormat: "dd/MM/yyyy",
  });

  revalidatePath("/platform/super-admin");
  redirect("/platform/setup?success=Organization%20shell%20created.");
}

export async function updateOrganizationStatusAction(formData: FormData) {
  await requirePlatformSuperAdmin();
  const organizationId = String(formData.get("organizationId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!organizationId || !["ACTIVE", "SUSPENDED", "DISABLED", "PENDING"].includes(status)) {
    throw new Error("Invalid organization status.");
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      status: status as "ACTIVE" | "SUSPENDED" | "DISABLED" | "PENDING",
      access: {
        upsert: {
          create: {
            status: status === "ACTIVE" ? "ACTIVE" : status === "SUSPENDED" ? "SUSPENDED" : "TRIAL",
          },
          update: {
            status: status === "ACTIVE" ? "ACTIVE" : status === "SUSPENDED" ? "SUSPENDED" : "TRIAL",
            suspendedAt: status === "SUSPENDED" ? new Date() : null,
          },
        },
      },
    },
  });

  revalidatePath("/platform/super-admin");
}

export async function setAppraisalModuleEnabledAction(formData: FormData) {
  const session = await requirePlatformSuperAdmin();
  const organizationId = String(formData.get("organizationId") ?? "");
  const enabled = formData.get("enabled") === "true";
  if (!organizationId) throw new Error("Missing organization.");

  const appraisalModule = await prisma.module.upsert({
    where: { key: APPRAISAL_MODULE_KEY },
    create: {
      key: APPRAISAL_MODULE_KEY,
      name: "Appraisal Management",
      description: "Full appraisal workflow module.",
    },
    update: { active: true },
  });

  await prisma.organizationModule.upsert({
    where: { organizationId_moduleId: { organizationId, moduleId: appraisalModule.id } },
    create: {
      organizationId,
      moduleId: appraisalModule.id,
      enabled,
      enabledAt: enabled ? new Date() : null,
      enabledById: enabled ? session.user.id : null,
      disabledAt: enabled ? null : new Date(),
      disabledById: enabled ? null : session.user.id,
    },
    update: {
      enabled,
      enabledAt: enabled ? new Date() : null,
      enabledById: enabled ? session.user.id : null,
      disabledAt: enabled ? null : new Date(),
      disabledById: enabled ? null : session.user.id,
    },
  });

  revalidatePath("/platform/super-admin");
}
