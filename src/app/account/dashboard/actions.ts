"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MODULE_DEFINITIONS } from "@/lib/module-catalog";
import { saveOrganizationLogo } from "@/lib/organization-logo";
import { ensureOrganizationModuleCatalog } from "@/lib/organization-hub";
import { canManageOrganizationModules, requireActiveOrganization } from "@/lib/tenant";

const organizationUpdateSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().trim().min(2).max(160),
  legalName: z.string().trim().max(160).optional(),
  industry: z.string().trim().max(120).optional(),
  address: z.string().trim().max(240).optional(),
  contactEmail: z.email().max(160).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(32).optional(),
  timezone: z.string().trim().min(2).max(80),
  locale: z.string().trim().min(2).max(16),
  dateFormat: z.string().trim().min(2).max(32),
});

const moduleToggleSchema = z.object({
  organizationId: z.string().min(1),
  moduleKey: z.string().min(1),
  enabled: z.boolean(),
});

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

async function requireDashboardUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user;
}

function revalidateOrganizationPaths(organizationId: string) {
  revalidatePath("/account/dashboard");
  revalidatePath("/account/organizations");
  revalidatePath(`/org/${organizationId}/admin`);
  revalidatePath("/module-disabled");
}

export async function updateOrganizationProfileAction(formData: FormData) {
  const user = await requireDashboardUser();
  const organization = await requireActiveOrganization(user);
  const logo = formData.get("logo");
  const parsed = organizationUpdateSchema.parse({
    organizationId: text(formData, "organizationId"),
    name: text(formData, "name"),
    legalName: text(formData, "legalName"),
    industry: text(formData, "industry"),
    address: text(formData, "address"),
    contactEmail: text(formData, "contactEmail"),
    contactPhone: text(formData, "contactPhone"),
    timezone: text(formData, "timezone"),
    locale: text(formData, "locale"),
    dateFormat: text(formData, "dateFormat"),
  });

  if (organization.id !== parsed.organizationId) {
    throw new Error("Organization mismatch.");
  }
  if (!(await canManageOrganizationModules(user, organization.id))) {
    throw new Error("You are not allowed to update this organization.");
  }

  await prisma.organization.update({
    where: { id: organization.id },
    data: {
      name: parsed.name,
      legalName: parsed.legalName || null,
      industry: parsed.industry || null,
      address: parsed.address || null,
      contactEmail: parsed.contactEmail || null,
      contactPhone: parsed.contactPhone || null,
      settings: {
        upsert: {
          create: {
            timezone: parsed.timezone,
            locale: parsed.locale,
            dateFormat: parsed.dateFormat,
          },
          update: {
            timezone: parsed.timezone,
            locale: parsed.locale,
            dateFormat: parsed.dateFormat,
          },
        },
      },
    },
  });

  if (logo instanceof File && logo.size > 0) {
    const logoUrl = await saveOrganizationLogo({
      organizationId: organization.id,
      file: logo,
      previousLogoUrl: organization.logoUrl,
    });
    await prisma.organization.update({
      where: { id: organization.id },
      data: { logoUrl },
    });
  }

  revalidateOrganizationPaths(organization.id);
}

export async function toggleOrganizationModuleAction(formData: FormData) {
  const user = await requireDashboardUser();
  const organization = await requireActiveOrganization(user);
  const parsed = moduleToggleSchema.parse({
    organizationId: text(formData, "organizationId"),
    moduleKey: text(formData, "moduleKey"),
    enabled: checked(formData, "enabled"),
  });

  if (organization.id !== parsed.organizationId) {
    throw new Error("Organization mismatch.");
  }
  if (!(await canManageOrganizationModules(user, organization.id))) {
    throw new Error("You are not allowed to change modules for this organization.");
  }

  const orgRecord = await prisma.organization.findUnique({
    where: { id: organization.id },
    select: { accountId: true },
  });
  if (!orgRecord) {
    throw new Error("Organization not found.");
  }
  await ensureOrganizationModuleCatalog(orgRecord.accountId, organization.id);

  const moduleDefinition = MODULE_DEFINITIONS.find((moduleDef) => moduleDef.key === parsed.moduleKey);
  if (!moduleDefinition) {
    throw new Error("Module not found.");
  }

  const moduleRecord = await prisma.module.findUnique({
    where: { key: parsed.moduleKey },
    select: { id: true },
  });
  if (!moduleRecord) {
    throw new Error("Module record not found.");
  }

  await prisma.organizationModule.upsert({
    where: {
      organizationId_moduleId: {
        organizationId: organization.id,
        moduleId: moduleRecord.id,
      },
    },
    create: {
      organizationId: organization.id,
      moduleId: moduleRecord.id,
      enabled: parsed.enabled,
      enabledAt: parsed.enabled ? new Date() : null,
      enabledById: parsed.enabled ? user.id : null,
      disabledAt: parsed.enabled ? null : new Date(),
      disabledById: parsed.enabled ? null : user.id,
    },
    update: {
      enabled: parsed.enabled,
      enabledAt: parsed.enabled ? new Date() : null,
      enabledById: parsed.enabled ? user.id : null,
      disabledAt: parsed.enabled ? null : new Date(),
      disabledById: parsed.enabled ? null : user.id,
    },
  });

  const enabledModuleCount = await prisma.organizationModule.count({
    where: { organizationId: organization.id, enabled: true },
  });
  await prisma.organization.update({
    where: { id: organization.id },
    data: { status: enabledModuleCount > 0 ? "ACTIVE" : "PENDING" },
  });

  revalidateOrganizationPaths(organization.id);
}
