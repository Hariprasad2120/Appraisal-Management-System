import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { AccountRole, OrganizationRole, PlatformRole, Role } from "@/generated/prisma/enums";
import { APPRAISAL_MODULE_KEY } from "@/lib/module-catalog";
export { APPRAISAL_MODULE_KEY };

export const DEFAULT_ORGANIZATION_ID = "default-org";
export const DEFAULT_ORGANIZATION_SLUG = "adarsh-shipping-and-services";
export const APPRAISAL_DISABLED_MESSAGE =
  "Appraisal Management module is not enabled for this organization.";

export type SessionTenantUser = {
  id: string;
  role: Role;
  secondaryRole?: Role | null;
  platformRole?: PlatformRole | null;
  accountId?: string | null;
  accountRole?: AccountRole | null;
  activeOrganizationId?: string | null;
};

export type MembershipWithRoles = Awaited<ReturnType<typeof getUserOrganizationMemberships>>[number];
export type AccountMembershipWithAccount = Awaited<ReturnType<typeof getUserAccountMemberships>>[number];

const ORG_MANAGEMENT_ROLES: OrganizationRole[] = [
  "ORG_OWNER",
  "ORG_ADMIN",
  "MANAGEMENT",
  "APPRAISAL_ADMIN",
];

const USER_MANAGEMENT_ROLES: OrganizationRole[] = [
  "ORG_OWNER",
  "ORG_ADMIN",
  "MANAGEMENT",
  "HR",
];

const BRANCH_MANAGEMENT_ROLES: OrganizationRole[] = [
  "ORG_OWNER",
  "ORG_ADMIN",
  "MANAGEMENT",
  "HR",
];

const ORG_ADMIN_ROLES: OrganizationRole[] = [
  "ORG_OWNER",
  "ORG_ADMIN",
  "APPRAISAL_ADMIN",
];

const ORG_MANAGER_ROLES: OrganizationRole[] = [
  "MANAGEMENT",
  "MANAGER",
  "PARTNER_OR_DIRECTOR",
];

const ORG_REVIEWER_ROLES: OrganizationRole[] = [
  "HR",
  "TEAM_LEAD",
];
const ACCOUNT_MANAGEMENT_ROLES: AccountRole[] = ["ACCOUNT_OWNER", "ACCOUNT_ADMIN"];
const ACTIVE_ACCOUNT_STATUSES = ["TRIAL", "ACTIVE"] as const;

export function legacyRoleToOrganizationRole(role: Role): OrganizationRole {
  switch (role) {
    case "ADMIN":
      return "ORG_ADMIN";
    case "MANAGEMENT":
      return "MANAGEMENT";
    case "MANAGER":
      return "MANAGER";
    case "HR":
      return "HR";
    case "TL":
      return "TEAM_LEAD";
    case "PARTNER":
      return "PARTNER_OR_DIRECTOR";
    default:
      return "EMPLOYEE";
  }
}

export function isPlatformSuperAdmin(user: SessionTenantUser | null | undefined) {
  return user?.platformRole === "PLATFORM_SUPER_ADMIN";
}

export async function getUserOrganizationMemberships(userId: string) {
  return prisma.organizationUser.findMany({
    where: {
      userId,
      status: "ACTIVE",
      organization: {
        status: "ACTIVE",
        account: { status: { in: [...ACTIVE_ACCOUNT_STATUSES] } },
      },
    },
    include: {
      organization: {
        select: {
          id: true,
          accountId: true,
          slug: true,
          name: true,
          logoUrl: true,
          primaryColor: true,
          status: true,
          account: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
        },
      },
      roleAssignments: { select: { role: true, branchId: true, departmentId: true } },
    },
    orderBy: [{ organization: { name: "asc" } }],
  });
}

export async function getUserAccountMemberships(userId: string) {
  return prisma.accountMembership.findMany({
    where: {
      userId,
      status: "ACTIVE",
      account: { status: { in: [...ACTIVE_ACCOUNT_STATUSES] } },
    },
    include: {
      account: {
        include: {
          subscriptions: {
            orderBy: [{ createdAt: "desc" }],
            take: 1,
            include: { plan: true },
          },
          organizations: {
            where: { status: { in: ["PENDING", "ACTIVE", "SUSPENDED"] } },
            select: { id: true, name: true, slug: true, status: true },
            orderBy: [{ name: "asc" }],
          },
          modules: {
            include: { module: true },
          },
        },
      },
    },
    orderBy: [{ account: { name: "asc" } }],
  });
}

export function getOrganizationRoleLabels(roles: OrganizationRole[]) {
  const deduped = [...new Set(roles)];
  return deduped.map((role) => {
    switch (role) {
      case "ORG_OWNER":
        return "Organization Owner";
      case "ORG_ADMIN":
        return "Organization Admin";
      case "APPRAISAL_ADMIN":
        return "Appraisal Admin";
      case "TEAM_LEAD":
        return "TL/Reviewer";
      case "PARTNER_OR_DIRECTOR":
        return "Partner/Director";
      default:
        return role
          .toLowerCase()
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");
    }
  });
}

export function getOrganizationHomePath(organizationId: string, roles: OrganizationRole[], fallbackRole?: Role) {
  if (roles.some((role) => ORG_ADMIN_ROLES.includes(role))) {
    return `/org/${organizationId}/admin`;
  }
  if (roles.includes("HR")) {
    return `/org/${organizationId}/hr`;
  }
  if (roles.some((role) => ORG_MANAGER_ROLES.includes(role))) {
    return `/org/${organizationId}/manager`;
  }
  if (roles.some((role) => ORG_REVIEWER_ROLES.includes(role))) {
    return `/org/${organizationId}/reviewer`;
  }
  if (fallbackRole === "PARTNER") {
    return `/org/${organizationId}/manager`;
  }
  return `/org/${organizationId}/employee`;
}

export async function getMembershipForOrganization(userId: string, organizationId: string) {
  const membership = await prisma.organizationUser.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    include: {
      organization: {
        select: {
          id: true,
          slug: true,
          name: true,
          logoUrl: true,
          primaryColor: true,
          status: true,
        },
      },
      roleAssignments: { select: { role: true, branchId: true, departmentId: true } },
    },
  });
  if (!membership || membership.status !== "ACTIVE" || membership.organization.status !== "ACTIVE") {
    return null;
  }
  return membership;
}

export async function setActiveOrganizationForUser(userId: string, organizationId: string) {
  const membership = await getMembershipForOrganization(userId, organizationId);
  if (!membership) return null;
  await prisma.user.update({
    where: { id: userId },
    data: { activeOrganizationId: organizationId },
  });
  return membership;
}

export async function resolveAuthenticatedHomePath(user: SessionTenantUser) {
  if (isPlatformSuperAdmin(user)) {
    return "/platform-admin";
  }

  const accountMemberships = await getUserAccountMemberships(user.id);
  const managedAccountMembership = accountMemberships.find((membership) =>
    ACCOUNT_MANAGEMENT_ROLES.includes(membership.role),
  );
  if (managedAccountMembership) {
    return "/account/dashboard";
  }

  const memberships = await getUserOrganizationMemberships(user.id);
  if (memberships.length === 0) {
    return "/no-organization-access";
  }
  return "/account/dashboard";
}

export async function getActiveOrganizationForUser(userId: string, requestedOrganizationId?: string | null) {
  const memberships = await getUserOrganizationMemberships(userId);
  if (memberships.length === 0) return null;
  if (requestedOrganizationId) {
    const requested = memberships.find((membership) => membership.organizationId === requestedOrganizationId);
    if (requested) return requested.organization;
  }
  return memberships[0].organization;
}

export async function getActiveAccountForUser(userId: string, requestedAccountId?: string | null) {
  const memberships = await getUserAccountMemberships(userId);
  if (memberships.length === 0) return null;
  if (requestedAccountId) {
    const requested = memberships.find((membership) => membership.accountId === requestedAccountId);
    if (requested) return requested.account;
  }
  return memberships[0].account;
}

export async function getPrimaryAccountContextForUser(userId: string, activeOrganizationId?: string | null) {
  if (activeOrganizationId) {
    const membership = await prisma.organizationUser.findUnique({
      where: { organizationId_userId: { organizationId: activeOrganizationId, userId } },
      select: {
        organization: {
          select: {
            account: {
              include: {
                subscriptions: {
                  orderBy: [{ createdAt: "desc" }],
                  take: 1,
                  include: { plan: true },
                },
                modules: { include: { module: true } },
                organizations: {
                  select: { id: true, name: true, slug: true, status: true },
                  orderBy: [{ name: "asc" }],
                },
              },
            },
          },
        },
      },
    });
    if (membership?.organization.account) {
      const accountMembership = await prisma.accountMembership.findFirst({
        where: {
          userId,
          accountId: membership.organization.account.id,
          status: "ACTIVE",
        },
        select: { role: true },
      });
      return {
        account: membership.organization.account,
        accountRole: accountMembership?.role ?? null,
      };
    }
  }

  const accountMemberships = await getUserAccountMemberships(userId);
  if (accountMemberships.length === 0) return null;
  return {
    account: accountMemberships[0].account,
    accountRole: accountMemberships[0].role,
  };
}

export async function requireActiveOrganization(user: SessionTenantUser) {
  if (isPlatformSuperAdmin(user) && !user.activeOrganizationId) {
    redirect("/platform/setup");
  }
  const organization = await getActiveOrganizationForUser(user.id, user.activeOrganizationId);
  if (!organization) {
    if (isPlatformSuperAdmin(user)) redirect("/platform/setup");
    redirect("/login");
  }
  return organization;
}

export async function requireActiveAccount(user: SessionTenantUser) {
  const account = await getActiveAccountForUser(user.id, user.accountId);
  if (!account) {
    redirect("/no-organization-access");
  }
  return account;
}

export async function getEnabledModuleKeys(organizationId?: string | null) {
  if (!organizationId) return [];
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      accountId: true,
      modules: {
        where: { enabled: true, module: { active: true } },
        select: { module: { select: { key: true } } },
      },
      account: {
        select: {
          modules: {
            where: { enabled: true, module: { active: true } },
            select: { module: { select: { key: true } } },
          },
        },
      },
    },
  });
  if (!organization) return [];
  const organizationKeys = organization.modules.map((item) => item.module.key);
  const accountKeys = organization.account.modules.map((item) => item.module.key);
  if (accountKeys.length === 0) return organizationKeys;
  return organizationKeys.filter((key) => accountKeys.includes(key));
}

export async function isModuleEnabled(organizationId: string, moduleKey: string) {
  const enabledModule = await prisma.organizationModule.findFirst({
    where: { organizationId, enabled: true, module: { key: moduleKey, active: true } },
    select: { id: true },
  });
  return Boolean(enabledModule);
}

export async function canAccessAppraisalModule(_user: SessionTenantUser, organizationId: string) {
  return isModuleEnabled(organizationId, APPRAISAL_MODULE_KEY);
}

export async function requireAppraisalModule(user: SessionTenantUser, organizationId: string) {
  if (await canAccessAppraisalModule(user, organizationId)) return;
  redirect("/module-disabled");
}

async function getOrganizationRoles(userId: string, organizationId: string): Promise<OrganizationRole[]> {
  const assignments = await prisma.userRoleAssignment.findMany({
    where: {
      userId,
      organizationId,
      membership: { status: "ACTIVE" },
    },
    select: { role: true },
  });
  return assignments.map((assignment) => assignment.role);
}

async function hasAnyOrganizationRole(user: SessionTenantUser, organizationId: string, roles: OrganizationRole[]) {
  if (isPlatformSuperAdmin(user)) return true;
  const assigned = await getOrganizationRoles(user.id, organizationId);
  return assigned.some((role) => roles.includes(role));
}

export async function canManageOrganization(user: SessionTenantUser, organizationId: string) {
  return hasAnyOrganizationRole(user, organizationId, ORG_MANAGEMENT_ROLES);
}

export async function canManageOrganizationModules(user: SessionTenantUser, organizationId: string) {
  return hasAnyOrganizationRole(user, organizationId, ORG_ADMIN_ROLES);
}

export async function canManageUsers(user: SessionTenantUser, organizationId: string) {
  return hasAnyOrganizationRole(user, organizationId, USER_MANAGEMENT_ROLES);
}

export async function canManageBranches(user: SessionTenantUser, organizationId: string) {
  return hasAnyOrganizationRole(user, organizationId, BRANCH_MANAGEMENT_ROLES);
}

export async function canCreateAppraisalCycle(user: SessionTenantUser, organizationId: string) {
  if (!(await canAccessAppraisalModule(user, organizationId))) return false;
  return hasAnyOrganizationRole(user, organizationId, ["ORG_OWNER", "ORG_ADMIN", "HR", "APPRAISAL_ADMIN"]);
}

export async function canFinalizeSalary(user: SessionTenantUser, organizationId: string) {
  if (!(await canAccessAppraisalModule(user, organizationId))) return false;
  return hasAnyOrganizationRole(user, organizationId, ["ORG_OWNER", "ORG_ADMIN", "MANAGEMENT"]);
}

export async function canManageModuleAccess(user: SessionTenantUser) {
  return isPlatformSuperAdmin(user);
}

export async function canManageAccount(user: SessionTenantUser, accountId: string) {
  if (isPlatformSuperAdmin(user)) return true;
  const membership = await prisma.accountMembership.findFirst({
    where: {
      accountId,
      userId: user.id,
      status: "ACTIVE",
      role: { in: ACCOUNT_MANAGEMENT_ROLES },
    },
    select: { id: true },
  });
  return Boolean(membership);
}

export async function getAccountUsage(accountId: string) {
  const [organizationCount, activeEmployeeCount] = await Promise.all([
    prisma.organization.count({
      where: { accountId, status: { in: ["PENDING", "ACTIVE", "SUSPENDED"] } },
    }),
    prisma.organizationUser.count({
      where: {
        status: "ACTIVE",
        organization: { accountId },
      },
    }),
  ]);

  const subscription = await prisma.subscription.findFirst({
    where: { accountId },
    orderBy: [{ createdAt: "desc" }],
    include: { plan: true },
  });

  return {
    organizationCount,
    activeEmployeeCount,
    subscription,
  };
}

export async function assertAccountWithinPlanLimits(accountId: string, input: { nextOrganizationCount?: number; nextEmployeeCount?: number }) {
  const usage = await getAccountUsage(accountId);
  const plan = usage.subscription?.plan;
  if (!plan) return usage;

  if (input.nextOrganizationCount && plan.maxOrganizations !== null && plan.maxOrganizations !== undefined && input.nextOrganizationCount > plan.maxOrganizations) {
    throw new Error(`Organization limit reached for the ${plan.name} plan.`);
  }

  if (input.nextEmployeeCount && plan.maxEmployees !== null && plan.maxEmployees !== undefined && input.nextEmployeeCount > plan.maxEmployees) {
    throw new Error(`Employee limit reached for the ${plan.name} plan.`);
  }

  return usage;
}

export async function canRateEmployee(user: SessionTenantUser, cycleId: string) {
  const assignment = await prisma.cycleAssignment.findFirst({
    where: {
      cycleId,
      reviewerId: user.id,
      organizationId: user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID,
    },
    select: { id: true },
  });
  return Boolean(assignment);
}

export async function canViewEmployeeAppraisal(user: SessionTenantUser, employeeId: string) {
  const organizationId = user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;
  if (user.id === employeeId) return true;
  if (await hasAnyOrganizationRole(user, organizationId, ORG_MANAGEMENT_ROLES)) return true;
  const reporting = await prisma.reportingHierarchy.findFirst({
    where: {
      organizationId,
      employeeId,
      active: true,
      OR: [{ teamLeadId: user.id }, { managerId: user.id }, { managementId: user.id }],
    },
    select: { id: true },
  });
  return Boolean(reporting);
}

export async function canAccessOrganizationData(user: SessionTenantUser, organizationId: string) {
  const membership = await prisma.organizationUser.findUnique({
    where: { organizationId_userId: { organizationId, userId: user.id } },
    select: { id: true, status: true },
  });
  if (membership?.status === "ACTIVE") return true;
  if (!isPlatformSuperAdmin(user)) return false;
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { explicitlyAllowsPlatformDataAccess: true },
  });
  return organization?.explicitlyAllowsPlatformDataAccess === true;
}

export async function requireOrganizationAccess(user: SessionTenantUser, organizationId: string) {
  const membership = await getMembershipForOrganization(user.id, organizationId);
  if (membership) return membership;
  if (isPlatformSuperAdmin(user)) {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, slug: true, name: true, status: true, explicitlyAllowsPlatformDataAccess: true },
    });
    if (organization?.explicitlyAllowsPlatformDataAccess) {
      return {
        id: `platform-${organization.id}`,
        organizationId: organization.id,
        organization,
        roleAssignments: [],
      };
    }
  }
  redirect("/unauthorized");
}
