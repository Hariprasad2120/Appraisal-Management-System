import type { OrganizationRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  APPRAISAL_MODULE_KEY,
  ATTENDANCE_MODULE_KEY,
  HUMAN_RESOURCE_MODULE_KEY,
  MODULE_DEFINITIONS,
  getModuleStatusLabel,
} from "@/lib/module-catalog";
import { getUserOrganizationMemberships, getOrganizationRoleLabels, type SessionTenantUser } from "@/lib/tenant";
import { getWorkspaceLaunchHref } from "@/lib/workspace-navigation";

const ORGANIZATION_ADMIN_ROLES: OrganizationRole[] = [
  "ORG_OWNER",
  "ORG_ADMIN",
  "APPRAISAL_ADMIN",
];

export const ORGANIZATION_HUB_TABS = [
  { key: "overview", label: "Overview" },
  { key: "announcements", label: "Announcements" },
  { key: "policies", label: "Policies" },
  { key: "employee-tree", label: "Employee Tree" },
  { key: "department-tree", label: "Department Tree" },
  { key: "department-directory", label: "Department Directory" },
  { key: "birthday-folks", label: "Birthday Folks" },
  { key: "new-hires", label: "New Hires" },
  { key: "calendar", label: "Calendar" },
  { key: "modules", label: "Modules" },
] as const;

export type OrganizationHubTabKey = (typeof ORGANIZATION_HUB_TABS)[number]["key"];

export function normalizeOrganizationHubTab(tab?: string): OrganizationHubTabKey {
  return ORGANIZATION_HUB_TABS.some((item) => item.key === tab)
    ? (tab as OrganizationHubTabKey)
    : "overview";
}

export async function ensureOrganizationModuleCatalog(accountId: string, organizationId: string) {
  for (const moduleDef of MODULE_DEFINITIONS) {
    const moduleRecord = await prisma.module.upsert({
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
      select: { id: true },
    });

    await prisma.accountModule.upsert({
      where: {
        accountId_moduleId: {
          accountId,
          moduleId: moduleRecord.id,
        },
      },
      create: {
        accountId,
        moduleId: moduleRecord.id,
        enabled: true,
      },
      update: {
        enabled: true,
      },
    });

    await prisma.organizationModule.upsert({
      where: {
        organizationId_moduleId: {
          organizationId,
          moduleId: moduleRecord.id,
        },
      },
      create: {
        organizationId,
        moduleId: moduleRecord.id,
        enabled: moduleDef.key === APPRAISAL_MODULE_KEY,
        enabledAt: moduleDef.key === APPRAISAL_MODULE_KEY ? new Date() : null,
      },
      update: {},
    });
  }
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatRoleLabel(role: string) {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatLocation(parts: Array<string | null | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(", ");
}

function getNextBirthdayDate(dob: Date, now: Date) {
  const next = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
  if (next < now) {
    next.setFullYear(now.getFullYear() + 1);
  }
  return next;
}

function getDaysUntil(date: Date, now: Date) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((date.getTime() - now.getTime()) / msPerDay);
}

export async function getOrganizationHubData(user: SessionTenantUser) {
  const memberships = await getUserOrganizationMemberships(user.id);
  if (memberships.length === 0) {
    return null;
  }

  const activeMembership =
    memberships.find((membership) => membership.organization.id === user.activeOrganizationId) ??
    memberships[0];
  const organizationId = activeMembership.organization.id;

  await ensureOrganizationModuleCatalog(activeMembership.organization.accountId, organizationId);

  const [organization, reportingRows, holidays, upcomingCycles] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        legalName: true,
        industry: true,
        logoUrl: true,
        primaryColor: true,
        address: true,
        contactEmail: true,
        contactPhone: true,
        status: true,
        createdAt: true,
        settings: {
          select: {
            timezone: true,
            locale: true,
            dateFormat: true,
          },
        },
        account: {
          select: {
            id: true,
            name: true,
            slug: true,
            modules: {
              where: { enabled: true, module: { active: true } },
              select: { module: { select: { key: true } } },
            },
          },
        },
        branches: {
          orderBy: [{ name: "asc" }],
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
            state: true,
            country: true,
            address: true,
            active: true,
          },
        },
        departments: {
          orderBy: [{ name: "asc" }],
          select: {
            id: true,
            name: true,
            code: true,
            active: true,
            branchId: true,
            branch: { select: { id: true, name: true } },
          },
        },
        modules: {
          include: {
            module: {
              select: { id: true, key: true, name: true, description: true, active: true },
            },
          },
          orderBy: [{ module: { name: "asc" } }],
        },
        memberships: {
          where: { status: "ACTIVE" },
          orderBy: [{ user: { name: "asc" } }],
          select: {
            id: true,
            branchId: true,
            departmentId: true,
            divisionId: true,
            joinedAt: true,
            branch: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                secondaryRole: true,
                designation: true,
                employeeNumber: true,
                joiningDate: true,
                dob: true,
                active: true,
                photo: true,
              },
            },
            roleAssignments: {
              select: {
                role: true,
                branchId: true,
                departmentId: true,
              },
            },
          },
        },
        roleAssignments: {
          select: {
            id: true,
            role: true,
            userId: true,
            branchId: true,
            departmentId: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    }),
    prisma.reportingHierarchy.findMany({
      where: { organizationId, active: true },
      select: {
        employeeId: true,
        teamLeadId: true,
        managerId: true,
        managementId: true,
      },
    }),
    prisma.holiday.findMany({
      where: { organizationId, holidayDate: { gte: startOfToday() } },
      orderBy: [{ holidayDate: "asc" }],
      take: 8,
      select: {
        id: true,
        holidayDate: true,
        holidayName: true,
        holidayType: true,
      },
    }),
    prisma.appraisalCycle.findMany({
      where: {
        organizationId,
        OR: [
          { startDate: { gte: startOfToday() } },
          { ratingDeadline: { gte: startOfToday() } },
        ],
      },
      orderBy: [{ startDate: "asc" }],
      take: 8,
      select: {
        id: true,
        type: true,
        status: true,
        startDate: true,
        ratingDeadline: true,
        user: { select: { name: true } },
      },
    }),
  ]);

  if (!organization) {
    return null;
  }

  const roleAssignments = activeMembership.roleAssignments.map((assignment) => assignment.role);
  const roleLabels = getOrganizationRoleLabels(roleAssignments);
  const canManageModules = roleAssignments.some((role) => ORGANIZATION_ADMIN_ROLES.includes(role));

  const entitledModuleKeys = organization.account.modules.map((item) => item.module.key);
  const moduleRows = MODULE_DEFINITIONS.map((moduleDef) => {
    const orgModule = organization.modules.find((item) => item.module.key === moduleDef.key);
    const enabledByOrg = orgModule?.enabled ?? false;
    const entitled = entitledModuleKeys.length === 0 || entitledModuleKeys.includes(moduleDef.key);
    const enabled = entitled && enabledByOrg;

    const launchHref =
      moduleDef.key === APPRAISAL_MODULE_KEY
        ? getWorkspaceLaunchHref(organization.id, "appraisal-management")
        : moduleDef.key === ATTENDANCE_MODULE_KEY
          ? getWorkspaceLaunchHref(organization.id, "attendance-management")
          : moduleDef.key === HUMAN_RESOURCE_MODULE_KEY
            ? getWorkspaceLaunchHref(organization.id, "hrms")
            : null;

    return {
      key: moduleDef.key,
      name: moduleDef.name,
      shortLabel: moduleDef.shortLabel,
      description: moduleDef.description,
      availability: moduleDef.availability,
      statusLabel: getModuleStatusLabel(moduleDef.availability),
      enabled,
      entitled,
      launchHref,
      enabledAt: orgModule?.enabledAt?.toISOString() ?? null,
      isWorkspace:
        moduleDef.key === APPRAISAL_MODULE_KEY ||
        moduleDef.key === ATTENDANCE_MODULE_KEY ||
        moduleDef.key === HUMAN_RESOURCE_MODULE_KEY,
    };
  });

  const people = organization.memberships.map((membership) => {
    const hierarchy = reportingRows.find((row) => row.employeeId === membership.user.id);
    const primaryRole = membership.roleAssignments[0]?.role ?? null;
    return {
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      branchId: membership.branchId,
      branchName: membership.branch?.name ?? null,
      departmentId: membership.departmentId,
      departmentName: membership.department?.name ?? null,
      designation: membership.user.designation ?? null,
      employeeNumber: membership.user.employeeNumber ?? null,
      joiningDate: membership.user.joiningDate.toISOString(),
      joinedAt: membership.joinedAt.toISOString(),
      dob: membership.user.dob?.toISOString() ?? null,
      primaryRole: primaryRole ? formatRoleLabel(primaryRole) : formatRoleLabel(membership.user.role),
      roleLabels: membership.roleAssignments.map((assignment) => formatRoleLabel(assignment.role)),
      teamLeadId: hierarchy?.teamLeadId ?? null,
      managerId: hierarchy?.managerId ?? null,
      managementId: hierarchy?.managementId ?? null,
    };
  });

  const peopleById = new Map(people.map((person) => [person.id, person]));

  const employeeTree = people.map((person) => ({
    ...person,
    teamLeadName: person.teamLeadId ? peopleById.get(person.teamLeadId)?.name ?? null : null,
    managerName: person.managerId ? peopleById.get(person.managerId)?.name ?? null : null,
    managementName: person.managementId ? peopleById.get(person.managementId)?.name ?? null : null,
    childIds: people
      .filter(
        (candidate) =>
          candidate.teamLeadId === person.id ||
          candidate.managerId === person.id ||
          candidate.managementId === person.id,
      )
      .map((candidate) => candidate.id),
  }));

  const branches = organization.branches.map((branch) => {
    const branchPeople = people.filter((person) => person.branchId === branch.id);
    const branchDepartments = organization.departments.filter((department) => department.branchId === branch.id);

    return {
      id: branch.id,
      name: branch.name,
      code: branch.code ?? null,
      active: branch.active,
      location: formatLocation([branch.city, branch.state, branch.country]),
      address: branch.address ?? null,
      memberCount: branchPeople.length,
      departments: branchDepartments.map((department) => {
        const departmentAssignments = organization.roleAssignments.filter(
          (assignment) => assignment.departmentId === department.id,
        );
        const leads = departmentAssignments
          .filter((assignment) => ["TEAM_LEAD", "MANAGER", "HR", "MANAGEMENT"].includes(assignment.role))
          .map((assignment) => ({
            id: assignment.user.id,
            name: assignment.user.name,
            role: formatRoleLabel(assignment.role),
          }));
        const members = people.filter((person) => person.departmentId === department.id);
        return {
          id: department.id,
          name: department.name,
          code: department.code ?? null,
          active: department.active,
          memberCount: members.length,
          leads,
        };
      }),
    };
  });

  const unassignedDepartments = organization.departments
    .filter((department) => !department.branchId)
    .map((department) => {
      const departmentAssignments = organization.roleAssignments.filter(
        (assignment) => assignment.departmentId === department.id,
      );
      return {
        id: department.id,
        name: department.name,
        code: department.code ?? null,
        active: department.active,
        memberCount: people.filter((person) => person.departmentId === department.id).length,
        leads: departmentAssignments
          .filter((assignment) => ["TEAM_LEAD", "MANAGER", "HR", "MANAGEMENT"].includes(assignment.role))
          .map((assignment) => ({
            id: assignment.user.id,
            name: assignment.user.name,
            role: formatRoleLabel(assignment.role),
          })),
      };
    });

  const now = new Date();
  const birthdays = people
    .filter((person) => Boolean(person.dob))
    .map((person) => {
      const nextBirthday = getNextBirthdayDate(new Date(person.dob!), now);
      return {
        ...person,
        nextBirthday: nextBirthday.toISOString(),
        daysUntil: getDaysUntil(nextBirthday, now),
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 8);

  const newHires = [...people]
    .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
    .slice(0, 8);

  const calendarItems = [
    ...holidays.map((holiday) => ({
      id: holiday.id,
      kind: "holiday" as const,
      title: holiday.holidayName,
      date: holiday.holidayDate.toISOString(),
      meta: formatRoleLabel(holiday.holidayType),
    })),
    ...upcomingCycles.map((cycle) => ({
      id: cycle.id,
      kind: "appraisal" as const,
      title: `${formatRoleLabel(cycle.type)} appraisal · ${cycle.user.name}`,
      date: (cycle.ratingDeadline ?? cycle.startDate).toISOString(),
      meta: cycle.ratingDeadline ? "Rating deadline" : "Cycle start",
    })),
  ]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 10);

  const activeWorkspaceModuleKey = moduleRows.find((moduleRow) => moduleRow.enabled)?.key ?? APPRAISAL_MODULE_KEY;

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      legalName: organization.legalName,
      industry: organization.industry,
      logoUrl: organization.logoUrl,
      primaryColor: organization.primaryColor,
      address: organization.address,
      contactEmail: organization.contactEmail,
      contactPhone: organization.contactPhone,
      status: organization.status,
      createdAt: organization.createdAt.toISOString(),
      settings: organization.settings,
      account: {
        id: organization.account.id,
        name: organization.account.name,
        slug: organization.account.slug,
      },
    },
    userContext: {
      roleLabels,
      canManageModules,
      canEditOrganization: canManageModules,
      activeModuleKey: activeWorkspaceModuleKey,
    },
    stats: {
      branchCount: organization.branches.length,
      departmentCount: organization.departments.length,
      memberCount: organization.memberships.length,
      enabledModuleCount: moduleRows.filter((item) => item.enabled).length,
    },
    tabs: ORGANIZATION_HUB_TABS,
    modules: moduleRows,
    employeeTree,
    branches,
    unassignedDepartments,
    birthdays,
    newHires,
    calendarItems,
    placeholders: {
      announcements: {
        title: "Announcement center template",
        description: "Publish company-wide notices, team updates, and leadership messages here when the content model is added.",
      },
      policies: {
        title: "Policy hub template",
        description: "Use this space later for handbook links, HR policies, compliance SOPs, and downloadable references.",
      },
    },
  };
}
