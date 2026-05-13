import { hashSync } from "bcryptjs";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OrganizationRole, OrganizationStatus, PlatformRole, Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { MODULE_DEFINITIONS } from "@/lib/module-catalog";
import { saveOrganizationLogo } from "@/lib/organization-logo";
import { DEFAULT_ORGANIZATION_ID, resolveAuthenticatedHomePath } from "@/lib/tenant";

export const PLATFORM_HOME_PATH = "/platform/home";
export const PLATFORM_SETUP_PATH = "/platform/setup";
export const PLATFORM_ENTRY_PATH = "/platform";

export const PLATFORM_MODULE_DEFINITIONS = MODULE_DEFINITIONS.map((moduleDef) => ({
  key: moduleDef.key,
  name: moduleDef.name,
  description: moduleDef.description,
  available: true,
}));

const organizationSchema = z.object({
  organizationId: z.string().trim().optional(),
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  legalName: z.string().trim().max(160).optional().or(z.literal("")),
  industry: z.string().trim().max(120).optional().or(z.literal("")),
  address: z.string().trim().max(240).optional().or(z.literal("")),
  contactEmail: z.email().max(160).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(32).optional().or(z.literal("")),
  timezone: z.string().trim().min(2).max(80).default("Asia/Kolkata"),
  locale: z.string().trim().min(2).max(16).default("en-IN"),
  dateFormat: z.string().trim().min(2).max(32).default("dd/MM/yyyy"),
});

type OrganizationSetupInput = z.input<typeof organizationSchema> & {
  logo?: File | null;
};

const branchSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().max(40).optional().or(z.literal("")),
  address: z.string().trim().max(240).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(80).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  active: z.coerce.boolean().default(true),
});

const departmentSchema = z.object({
  id: z.string().trim().optional(),
  branchId: z.string().trim().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().max(40).optional().or(z.literal("")),
  active: z.coerce.boolean().default(true),
});

const standaloneManagementSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.email().max(160),
  branchId: z.string().trim().optional().or(z.literal("")),
  departmentId: z.string().trim().optional().or(z.literal("")),
  role: z.enum(["MANAGEMENT", "HR", "MANAGER", "TEAM_LEAD", "APPRAISAL_ADMIN"]),
});

const departmentAssignmentSchema = z.object({
  userId: z.string().trim().min(1),
  branchId: z.string().trim().optional().or(z.literal("")),
  departmentId: z.string().trim().min(1),
  role: z.enum(["MANAGEMENT", "HR", "MANAGER", "TEAM_LEAD", "APPRAISAL_ADMIN"]),
});

const employeeSchema = z.object({
  userId: z.string().trim().optional(),
  name: z.string().trim().min(2).max(160),
  email: z.email().max(160),
  branchId: z.string().trim().min(1),
  departmentId: z.string().trim().min(1),
  designation: z.string().trim().max(120).optional().or(z.literal("")),
  primaryRole: z.enum(["EMPLOYEE", "HR", "MANAGER", "TL", "MANAGEMENT", "ADMIN"]).default("EMPLOYEE"),
  secondaryRole: z.enum(["EMPLOYEE", "HR", "MANAGER", "TL", "MANAGEMENT", "ADMIN"]).optional().or(z.literal("")),
  employeeNumber: z.coerce.number().int().positive().optional(),
  joiningDate: z.string().min(1),
  active: z.coerce.boolean().default(true),
  teamLeadId: z.string().trim().optional().or(z.literal("")),
  managerId: z.string().trim().optional().or(z.literal("")),
  managementId: z.string().trim().optional().or(z.literal("")),
});

const moduleSelectionSchema = z.object({
  selectedModules: z.array(z.string()).default([]),
});

export type PlatformSessionUser = {
  id: string;
  role: Role;
  secondaryRole?: Role | null;
  platformRole?: PlatformRole | null;
  activeOrganizationId?: string | null;
  organizationName?: string;
  enabledModules?: string[];
};

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function mapUserStatus(active: boolean) {
  return active ? "ACTIVE" : "SUSPENDED";
}

function mapOrganizationRoleToLegacyRole(role: OrganizationRole): Role {
  switch (role) {
    case "ORG_OWNER":
    case "ORG_ADMIN":
    case "APPRAISAL_ADMIN":
      return "ADMIN";
    case "MANAGEMENT":
      return "MANAGEMENT";
    case "HR":
      return "HR";
    case "MANAGER":
      return "MANAGER";
    case "TEAM_LEAD":
      return "TL";
    case "PARTNER_OR_DIRECTOR":
      return "PARTNER";
    default:
      return "EMPLOYEE";
  }
}

function pickLegacyRoles(roles: OrganizationRole[]) {
  const mapped = [...new Set(roles.map(mapOrganizationRoleToLegacyRole))];
  const priority: Role[] = ["ADMIN", "MANAGEMENT", "HR", "MANAGER", "TL", "PARTNER", "EMPLOYEE"];
  const ordered = mapped.sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
  return {
    role: ordered[0] ?? "EMPLOYEE",
    secondaryRole: ordered.find((item) => item !== ordered[0]) ?? null,
  };
}

async function syncLegacyRoles(userId: string, organizationId: string) {
  const assignments = await prisma.userRoleAssignment.findMany({
    where: { userId, organizationId },
    select: { role: true },
  });
  const { role, secondaryRole } = pickLegacyRoles(assignments.map((item) => item.role));
  await prisma.user.update({
    where: { id: userId },
    data: {
      role,
      secondaryRole,
      organizationId,
      activeOrganizationId: organizationId,
    },
  });
}

async function ensureRoleAssignment(input: {
  organizationId: string;
  userId: string;
  membershipId: string;
  role: OrganizationRole;
  branchId?: string | null;
  departmentId?: string | null;
}) {
  const existing = await prisma.userRoleAssignment.findFirst({
    where: {
      organizationId: input.organizationId,
      userId: input.userId,
      role: input.role,
      branchId: input.branchId ?? null,
      departmentId: input.departmentId ?? null,
    },
    select: { id: true },
  });
  if (existing) {
    return prisma.userRoleAssignment.update({
      where: { id: existing.id },
      data: { membershipId: input.membershipId },
    });
  }
  return prisma.userRoleAssignment.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      membershipId: input.membershipId,
      role: input.role,
      branchId: input.branchId ?? null,
      departmentId: input.departmentId ?? null,
    },
  });
}

async function ensureModuleCatalog() {
  await Promise.all(
    PLATFORM_MODULE_DEFINITIONS.map((moduleDef) =>
      prisma.module.upsert({
        where: { key: moduleDef.key },
        create: {
          key: moduleDef.key,
          name: moduleDef.name,
          description: moduleDef.description,
          active: true,
        },
        update: {
          name: moduleDef.name,
          description: moduleDef.description,
          active: true,
        },
      }),
    ),
  );
}

async function ensureOrganizationModuleRows(organizationId: string) {
  await ensureModuleCatalog();
  const modules = await prisma.module.findMany({
    where: { key: { in: PLATFORM_MODULE_DEFINITIONS.map((item) => item.key) } },
    select: { id: true, key: true },
  });
  await Promise.all(
    modules.map((moduleItem) =>
      prisma.organizationModule.upsert({
        where: { organizationId_moduleId: { organizationId, moduleId: moduleItem.id } },
        create: {
          organizationId,
          moduleId: moduleItem.id,
          enabled: false,
        },
        update: {},
      }),
    ),
  );
}

async function ensureAccountForOrganization(input: {
  organizationId?: string;
  slug: string;
  name: string;
  legalName?: string | null;
  ownerUserId: string;
}) {
  const existingOrganization = input.organizationId
    ? await prisma.organization.findUnique({
        where: { id: input.organizationId },
        select: { accountId: true },
      })
    : null;

  if (existingOrganization?.accountId) {
    return prisma.account.findUniqueOrThrow({
      where: { id: existingOrganization.accountId },
    });
  }

  const account = await prisma.account.upsert({
    where: { slug: input.slug },
    update: {
      name: input.legalName ?? input.name,
      ownerUserId: input.ownerUserId,
    },
    create: {
      slug: input.slug,
      name: input.legalName ?? input.name,
      ownerUserId: input.ownerUserId,
      status: "TRIAL",
    },
  });

  await prisma.accountMembership.upsert({
    where: {
      accountId_userId: {
        accountId: account.id,
        userId: input.ownerUserId,
      },
    },
    update: {
      role: "ACCOUNT_OWNER",
      status: "ACTIVE",
    },
    create: {
      accountId: account.id,
      userId: input.ownerUserId,
      role: "ACCOUNT_OWNER",
      status: "ACTIVE",
    },
  });

  return account;
}

export async function getPlatformOrganizations() {
  await ensureModuleCatalog();
  return prisma.organization.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      access: true,
      modules: { include: { module: true } },
      _count: { select: { memberships: true, branches: true, departments: true } },
    },
  });
}

export async function getPlatformSetupSnapshot(user: PlatformSessionUser) {
  const activeOrganizationId = user.activeOrganizationId ?? null;
  const organization = activeOrganizationId
    ? await prisma.organization.findUnique({
        where: { id: activeOrganizationId },
        include: {
          settings: true,
          access: true,
          branches: { orderBy: [{ name: "asc" }] },
          departments: {
            orderBy: [{ name: "asc" }],
            include: { branch: { select: { id: true, name: true } } },
          },
          modules: { include: { module: true }, orderBy: [{ module: { name: "asc" } }] },
        },
      })
    : null;

  const memberships = organization
    ? await prisma.organizationUser.findMany({
        where: { organizationId: organization.id, status: "ACTIVE" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              secondaryRole: true,
              platformRole: true,
              department: true,
              designation: true,
              employeeNumber: true,
              joiningDate: true,
              active: true,
            },
          },
          department: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          roleAssignments: { select: { id: true, role: true, departmentId: true, branchId: true } },
        },
        orderBy: [{ user: { name: "asc" } }],
      })
    : [];

  const assignments = organization
    ? await prisma.userRoleAssignment.findMany({
        where: { organizationId: organization.id },
        include: {
          user: { select: { id: true, name: true, email: true, role: true, secondaryRole: true } },
          membership: { select: { id: true, departmentId: true, branchId: true } },
        },
        orderBy: [{ createdAt: "asc" }],
      })
    : [];

  const employees = memberships.filter((membership) => membership.user.role === "EMPLOYEE" || membership.roleAssignments.some((item) => item.role === "EMPLOYEE"));
  const departmentAssignments = assignments.filter((assignment) => Boolean(assignment.departmentId));
  const hasBranches = (organization?.branches.length ?? 0) > 0;
  const hasDepartments = (organization?.departments.length ?? 0) > 0;
  const hasDepartmentAssignments = departmentAssignments.length > 0;
  const hasEmployees = employees.length > 0;
  const hasModuleSelection = (organization?.modules.some((moduleItem) => moduleItem.enabled) ?? false) || organization?.status === "ACTIVE";

  const steps = [
    { key: "organization", label: "Organization details", complete: Boolean(organization) },
    { key: "branches", label: "Branches", complete: hasBranches },
    { key: "departments", label: "Departments", complete: hasDepartments },
    { key: "ownership", label: "Department ownership", complete: hasDepartmentAssignments },
    { key: "employees", label: "Employees and hierarchy", complete: hasEmployees },
    { key: "modules", label: "Module selection", complete: hasModuleSelection },
  ] as const;

  const currentStep = steps.find((step) => !step.complete)?.key ?? "complete";
  const needsSetup = !organization || organization.status !== "ACTIVE" || steps.some((step) => !step.complete);

  return {
    organization,
    memberships,
    assignments,
    employees,
    steps,
    currentStep,
    needsSetup,
  };
}

export async function resolvePlatformHome(user: PlatformSessionUser) {
  const snapshot = await getPlatformSetupSnapshot(user);
  return {
    ...snapshot,
    homePath: snapshot.needsSetup ? PLATFORM_SETUP_PATH : PLATFORM_HOME_PATH,
  };
}

export async function resolveUserHomePath(user: PlatformSessionUser) {
  if (user.platformRole === "PLATFORM_SUPER_ADMIN") {
    const platformState = await resolvePlatformHome(user);
    return platformState.homePath === PLATFORM_ENTRY_PATH ? "/platform-admin" : platformState.homePath;
  }
  return resolveAuthenticatedHomePath(user);
}

async function ensureOrganizationAccessForUser(userId: string, organizationId: string, branchId?: string | null, departmentId?: string | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { designationId: true, active: true, organizationId: true, platformRole: true },
  });
  if (!user) throw new Error("User not found.");
  if (user.organizationId !== organizationId && user.platformRole !== "PLATFORM_SUPER_ADMIN") {
    throw new Error("Cross-organization assignments are not allowed.");
  }

  const membership = await prisma.organizationUser.upsert({
    where: { organizationId_userId: { organizationId, userId } },
    create: {
      organizationId,
      userId,
      branchId: branchId ?? null,
      departmentId: departmentId ?? null,
      designationId: user.designationId ?? null,
      status: user.active ? "ACTIVE" : "SUSPENDED",
    },
    update: {
      branchId: branchId ?? undefined,
      departmentId: departmentId ?? undefined,
      status: user.active ? "ACTIVE" : "SUSPENDED",
    },
  });
  return membership;
}

function mapDepartmentAssignmentRole(role: z.infer<typeof departmentAssignmentSchema>["role"]): OrganizationRole {
  switch (role) {
    case "TEAM_LEAD":
      return "TEAM_LEAD";
    case "APPRAISAL_ADMIN":
      return "APPRAISAL_ADMIN";
    default:
      return role;
  }
}

export async function saveOrganizationSetup(user: PlatformSessionUser, input: OrganizationSetupInput) {
  const parsed = organizationSchema.parse(input);
  await ensureModuleCatalog();

  if (parsed.organizationId) {
    const existing = await prisma.organization.findUnique({
      where: { id: parsed.organizationId },
      select: { id: true },
    });
    if (!existing) throw new Error("Organization not found.");
  }

  const account = await ensureAccountForOrganization({
    organizationId: parsed.organizationId,
    slug: parsed.slug,
    name: parsed.name,
    legalName: normalizeOptional(parsed.legalName),
    ownerUserId: user.id,
  });

  const organization = parsed.organizationId
    ? await prisma.organization.update({
        where: { id: parsed.organizationId },
        data: {
          accountId: account.id,
          name: parsed.name,
          slug: parsed.slug,
          legalName: normalizeOptional(parsed.legalName),
          industry: normalizeOptional(parsed.industry),
          address: normalizeOptional(parsed.address),
          contactEmail: normalizeOptional(parsed.contactEmail),
          contactPhone: normalizeOptional(parsed.contactPhone),
          status: "PENDING",
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
          access: {
            upsert: {
              create: { status: "TRIAL", planName: "Trial" },
              update: {},
            },
          },
        },
      })
    : await prisma.organization.create({
        data: {
          accountId: account.id,
          name: parsed.name,
          slug: parsed.slug,
          legalName: normalizeOptional(parsed.legalName),
          industry: normalizeOptional(parsed.industry),
          address: normalizeOptional(parsed.address),
          contactEmail: normalizeOptional(parsed.contactEmail),
          contactPhone: normalizeOptional(parsed.contactPhone),
          status: "PENDING",
          access: {
            create: { status: "TRIAL", planName: "Trial" },
          },
          settings: {
            create: {
              timezone: parsed.timezone,
              locale: parsed.locale,
              dateFormat: parsed.dateFormat,
            },
          },
        },
      });

  const logoFile = input.logo instanceof File && input.logo.size > 0 ? input.logo : null;
  if (logoFile) {
    const logoUrl = await saveOrganizationLogo({
      organizationId: organization.id,
      file: logoFile,
      previousLogoUrl: organization.logoUrl,
    });
    await prisma.organization.update({
      where: { id: organization.id },
      data: { logoUrl },
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      organizationId: organization.id,
      activeOrganizationId: organization.id,
    },
  });

  const membership = await ensureOrganizationAccessForUser(user.id, organization.id);
  await ensureRoleAssignment({
    organizationId: organization.id,
    userId: user.id,
    membershipId: membership.id,
    role: "ORG_OWNER",
  });
  await ensureRoleAssignment({
    organizationId: organization.id,
    userId: user.id,
    membershipId: membership.id,
    role: "ORG_ADMIN",
  });
  await ensureOrganizationModuleRows(organization.id);
  await syncLegacyRoles(user.id, organization.id);

  revalidatePath(PLATFORM_SETUP_PATH);
  revalidatePath(PLATFORM_HOME_PATH);
  revalidatePath("/platform/super-admin");
  return organization;
}

export async function saveBranch(_user: PlatformSessionUser, organizationId: string, input: z.input<typeof branchSchema>) {
  const parsed = branchSchema.parse(input);
  const data = {
    organizationId,
    name: parsed.name,
    code: normalizeOptional(parsed.code),
    address: normalizeOptional(parsed.address),
    city: normalizeOptional(parsed.city),
    state: normalizeOptional(parsed.state),
    country: normalizeOptional(parsed.country),
    active: parsed.active,
  };
  const branch = parsed.id
    ? await prisma.branch.update({
        where: { id: parsed.id },
        data,
      })
    : await prisma.branch.create({ data });

  revalidatePath(PLATFORM_SETUP_PATH);
  revalidatePath(PLATFORM_HOME_PATH);
  return branch;
}

export async function removeBranch(organizationId: string, branchId: string) {
  const departments = await prisma.department.count({
    where: { organizationId, branchId },
  });
  if (departments > 0) {
    throw new Error("Remove or reassign departments before deleting this branch.");
  }
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { organizationId: true } });
  if (!branch || branch.organizationId !== organizationId) throw new Error("Branch not found.");
  await prisma.branch.delete({ where: { id: branchId } });
  revalidatePath(PLATFORM_SETUP_PATH);
}

export async function saveDepartment(organizationId: string, input: z.input<typeof departmentSchema>) {
  const parsed = departmentSchema.parse(input);
  const data = {
    organizationId,
    branchId: normalizeOptional(parsed.branchId),
    name: parsed.name,
    code: normalizeOptional(parsed.code),
    active: parsed.active,
  };
  const department = parsed.id
    ? await prisma.department.update({
        where: { id: parsed.id },
        data,
      })
    : await prisma.department.create({ data });
  revalidatePath(PLATFORM_SETUP_PATH);
  revalidatePath(PLATFORM_HOME_PATH);
  return department;
}

export async function removeDepartment(organizationId: string, departmentId: string) {
  const members = await prisma.organizationUser.count({
    where: { organizationId, departmentId },
  });
  if (members > 0) {
    throw new Error("Reassign department members before deleting this department.");
  }
  const department = await prisma.department.findUnique({ where: { id: departmentId }, select: { organizationId: true } });
  if (!department || department.organizationId !== organizationId) throw new Error("Department not found.");
  await prisma.department.delete({ where: { id: departmentId } });
  revalidatePath(PLATFORM_SETUP_PATH);
}

export async function createStandaloneManagementUser(organizationId: string, input: z.input<typeof standaloneManagementSchema>) {
  const parsed = standaloneManagementSchema.parse(input);
  const branchId = normalizeOptional(parsed.branchId);
  const departmentId = normalizeOptional(parsed.departmentId);
  const orgRole = mapDepartmentAssignmentRole(parsed.role);
  const legacyRole = mapOrganizationRoleToLegacyRole(orgRole);
  const user = await prisma.user.create({
    data: {
      email: normalizeEmail(parsed.email),
      emailNormalized: normalizeEmail(parsed.email),
      passwordHash: hashSync(randomBytes(24).toString("hex"), 10),
      passkeySetupRequired: true,
      googleLoginAllowed: false,
      name: parsed.name,
      role: legacyRole,
      secondaryRole: null,
      organizationId,
      activeOrganizationId: organizationId,
      branchId,
      departmentId,
      department: undefined,
      joiningDate: new Date(),
      active: true,
      status: "INVITED",
    },
  });

  const membership = await ensureOrganizationAccessForUser(user.id, organizationId, branchId, departmentId);
  await ensureRoleAssignment({
    organizationId,
    userId: user.id,
    membershipId: membership.id,
    role: orgRole,
    branchId,
    departmentId,
  });
  await syncLegacyRoles(user.id, organizationId);
  revalidatePath(PLATFORM_SETUP_PATH);
  return user;
}

export async function assignDepartmentRole(organizationId: string, input: z.input<typeof departmentAssignmentSchema>) {
  const parsed = departmentAssignmentSchema.parse(input);
  const department = await prisma.department.findUnique({
    where: { id: parsed.departmentId },
    select: { id: true, branchId: true, organizationId: true },
  });
  if (!department || department.organizationId !== organizationId) throw new Error("Department not found.");
  const branchId = normalizeOptional(parsed.branchId) ?? department.branchId ?? null;
  const membership = await ensureOrganizationAccessForUser(parsed.userId, organizationId, branchId, parsed.departmentId);
  await ensureRoleAssignment({
    organizationId,
    userId: parsed.userId,
    membershipId: membership.id,
    role: mapDepartmentAssignmentRole(parsed.role),
    branchId,
    departmentId: parsed.departmentId,
  });
  await syncLegacyRoles(parsed.userId, organizationId);
  revalidatePath(PLATFORM_SETUP_PATH);
}

export async function removeDepartmentRoleAssignment(organizationId: string, assignmentId: string) {
  const assignment = await prisma.userRoleAssignment.findUnique({
    where: { id: assignmentId },
    select: { userId: true, organizationId: true },
  });
  if (!assignment || assignment.organizationId !== organizationId) throw new Error("Assignment not found.");
  await prisma.userRoleAssignment.delete({ where: { id: assignmentId } });
  if (assignment?.userId) {
    await syncLegacyRoles(assignment.userId, organizationId);
  }
  revalidatePath(PLATFORM_SETUP_PATH);
}

export async function saveEmployee(organizationId: string, input: z.input<typeof employeeSchema>) {
  const parsed = employeeSchema.parse(input);
  const branchId = parsed.branchId;
  const departmentId = parsed.departmentId;
  const primaryRole = parsed.primaryRole as Role;
  const secondaryRole =
    parsed.secondaryRole && parsed.secondaryRole !== primaryRole
      ? (parsed.secondaryRole as Role)
      : null;

  if (parsed.userId) {
    const existing = await prisma.user.findUnique({
      where: { id: parsed.userId },
      select: { id: true, organizationId: true },
    });
    if (!existing || existing.organizationId !== organizationId) {
      throw new Error("Employee not found.");
    }
  }

  const user = parsed.userId
    ? await prisma.user.update({
        where: { id: parsed.userId },
        data: {
          name: parsed.name,
          email: normalizeEmail(parsed.email),
          emailNormalized: normalizeEmail(parsed.email),
          branchId,
          departmentId,
          department: (await prisma.department.findUnique({ where: { id: departmentId }, select: { name: true } }))?.name ?? null,
          designation: normalizeOptional(parsed.designation),
          role: primaryRole,
          secondaryRole,
          employeeNumber: parsed.employeeNumber ?? null,
          joiningDate: new Date(parsed.joiningDate),
          active: parsed.active,
          status: mapUserStatus(parsed.active),
          activeOrganizationId: organizationId,
        },
      })
    : await prisma.user.create({
        data: {
          email: normalizeEmail(parsed.email),
          emailNormalized: normalizeEmail(parsed.email),
          passwordHash: hashSync(randomBytes(24).toString("hex"), 10),
          passkeySetupRequired: true,
          googleLoginAllowed: false,
          name: parsed.name,
          role: primaryRole,
          secondaryRole,
          organizationId,
          activeOrganizationId: organizationId,
          branchId,
          departmentId,
          department: (await prisma.department.findUnique({ where: { id: departmentId }, select: { name: true } }))?.name ?? null,
          designation: normalizeOptional(parsed.designation),
          joiningDate: new Date(parsed.joiningDate),
          active: parsed.active,
          status: mapUserStatus(parsed.active),
          employeeNumber: parsed.employeeNumber ?? null,
        },
      });

  const membership = await ensureOrganizationAccessForUser(user.id, organizationId, branchId, departmentId);
  await prisma.userRoleAssignment.deleteMany({
    where: {
      organizationId,
      userId: user.id,
      role: { in: ["EMPLOYEE", "HR", "MANAGER", "TEAM_LEAD", "MANAGEMENT", "APPRAISAL_ADMIN"] },
    },
  });
  const roleSet = new Set<OrganizationRole>(["EMPLOYEE"]);
  if (primaryRole === "ADMIN") roleSet.add("ORG_ADMIN");
  if (primaryRole === "MANAGEMENT") roleSet.add("MANAGEMENT");
  if (primaryRole === "HR") roleSet.add("HR");
  if (primaryRole === "MANAGER") roleSet.add("MANAGER");
  if (primaryRole === "TL") roleSet.add("TEAM_LEAD");
  if (secondaryRole === "ADMIN") roleSet.add("APPRAISAL_ADMIN");
  if (secondaryRole === "MANAGEMENT") roleSet.add("MANAGEMENT");
  if (secondaryRole === "HR") roleSet.add("HR");
  if (secondaryRole === "MANAGER") roleSet.add("MANAGER");
  if (secondaryRole === "TL") roleSet.add("TEAM_LEAD");

    for (const orgRole of roleSet) {
      await ensureRoleAssignment({
        organizationId,
        userId: user.id,
        membershipId: membership.id,
        role: orgRole,
        branchId,
        departmentId,
      });
    }

  const existingHierarchy = await prisma.reportingHierarchy.findFirst({
    where: { organizationId, employeeId: user.id, active: true },
    select: { id: true },
  });
  if (existingHierarchy) {
    await prisma.reportingHierarchy.update({
      where: { id: existingHierarchy.id },
      data: {
        organizationId,
        teamLeadId: normalizeOptional(parsed.teamLeadId),
        managerId: normalizeOptional(parsed.managerId),
        managementId: normalizeOptional(parsed.managementId),
        active: true,
        effectiveTo: null,
      },
    });
  } else {
    await prisma.reportingHierarchy.create({
      data: {
        organizationId,
        employeeId: user.id,
        teamLeadId: normalizeOptional(parsed.teamLeadId),
        managerId: normalizeOptional(parsed.managerId),
        managementId: normalizeOptional(parsed.managementId),
        active: true,
      },
    });
  }

  await syncLegacyRoles(user.id, organizationId);
  revalidatePath(PLATFORM_SETUP_PATH);
  revalidatePath(PLATFORM_HOME_PATH);
  return user;
}

export async function removeEmployee(organizationId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { platformRole: true, organizationId: true },
  });
  if (!user || user.organizationId !== organizationId) throw new Error("Employee not found.");
  if (user.platformRole === "PLATFORM_SUPER_ADMIN") {
    throw new Error("Platform super admin users cannot be removed from setup here.");
  }
  await prisma.reportingHierarchy.deleteMany({
    where: { organizationId, employeeId: userId },
  });
  await prisma.userRoleAssignment.deleteMany({
    where: { organizationId, userId },
  });
  await prisma.organizationUser.deleteMany({
    where: { organizationId, userId },
  });
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath(PLATFORM_SETUP_PATH);
}

export async function finalizePlatformModules(user: PlatformSessionUser, organizationId: string, input: z.input<typeof moduleSelectionSchema>) {
  const parsed = moduleSelectionSchema.parse(input);
  await ensureOrganizationModuleRows(organizationId);
  const modules = await prisma.module.findMany({
    where: { key: { in: PLATFORM_MODULE_DEFINITIONS.map((item) => item.key) } },
    select: { id: true, key: true },
  });
  for (const moduleItem of modules) {
    const shouldEnable = parsed.selectedModules.includes(moduleItem.key);
    await prisma.organizationModule.updateMany({
      where: { organizationId, moduleId: moduleItem.id },
      data: {
        enabled: shouldEnable,
        enabledAt: shouldEnable ? new Date() : null,
        enabledById: shouldEnable ? user.id : null,
        disabledAt: shouldEnable ? null : new Date(),
        disabledById: shouldEnable ? null : user.id,
      },
    });
  }

  const nextStatus: OrganizationStatus = parsed.selectedModules.length > 0 ? "ACTIVE" : "PENDING";
  await prisma.organization.update({
    where: { id: organizationId },
    data: { status: nextStatus },
  });
  revalidatePath(PLATFORM_SETUP_PATH);
  revalidatePath(PLATFORM_HOME_PATH);
  revalidatePath("/module-disabled");
}

export async function createTenantAgnosticPlatformUser(input: {
  email: string;
  passwordHash: string;
  name: string;
}) {
  return prisma.user.create({
    data: {
      email: normalizeEmail(input.email),
      emailNormalized: normalizeEmail(input.email),
      passwordHash: input.passwordHash,
      name: input.name,
      role: "ADMIN",
      platformRole: "PLATFORM_SUPER_ADMIN",
      organizationId: DEFAULT_ORGANIZATION_ID,
      activeOrganizationId: null,
      joiningDate: new Date(),
      active: true,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });
}
