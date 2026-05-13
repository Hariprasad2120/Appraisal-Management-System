import { redirect } from "next/navigation";
import type { OrganizationRole } from "@/generated/prisma/enums";
import type { SessionTenantUser } from "@/lib/tenant";
import { getMembershipForOrganization, getOrganizationHomePath, setActiveOrganizationForUser } from "@/lib/tenant";
import {
  getWorkspaceLandingPath,
  roleCanAccessWorkspace,
  type WorkspaceKey,
} from "@/lib/workspace-navigation";

export async function redirectToOrganizationHome(user: SessionTenantUser, organizationId: string) {
  const membership = await setActiveOrganizationForUser(user.id, organizationId);
  if (!membership) {
    redirect("/unauthorized");
  }

  redirect(
    getOrganizationHomePath(
      organizationId,
      membership.roleAssignments.map((assignment) => assignment.role),
      user.role,
    ),
  );
}

export async function redirectToOrganizationWorkspace(
  user: SessionTenantUser,
  organizationId: string,
  workspaceKey: WorkspaceKey,
) {
  const membership = await setActiveOrganizationForUser(user.id, organizationId);
  if (!membership) {
    redirect("/unauthorized");
  }

  if (!roleCanAccessWorkspace(workspaceKey, user.role, user.secondaryRole)) {
    redirect("/unauthorized");
  }

  redirect(getWorkspaceLandingPath(workspaceKey, user.role, user.secondaryRole));
}

export async function redirectToLegacyOrganizationRoute(
  user: SessionTenantUser,
  organizationId: string,
  target: "admin" | "hr" | "manager" | "reviewer" | "employee",
) {
  const membership = await setActiveOrganizationForUser(user.id, organizationId);
  if (!membership) {
    redirect("/unauthorized");
  }

  const roles = membership.roleAssignments.map((assignment) => assignment.role);

  const allows = {
    admin: roles.some((role) => ["ORG_OWNER", "ORG_ADMIN", "APPRAISAL_ADMIN"].includes(role)),
    hr: roles.includes("HR"),
    manager: roles.some((role) => ["MANAGEMENT", "MANAGER", "PARTNER_OR_DIRECTOR"].includes(role)),
    reviewer: roles.some((role) => ["HR", "TEAM_LEAD", "MANAGER"].includes(role)),
    employee: roles.some((role) => ["EMPLOYEE", "HR", "TEAM_LEAD", "MANAGER", "MANAGEMENT", "ORG_OWNER", "ORG_ADMIN", "APPRAISAL_ADMIN", "PARTNER_OR_DIRECTOR"].includes(role)),
  } satisfies Record<string, boolean>;

  if (!allows[target]) {
    redirect("/unauthorized");
  }

  const destination = getLegacyDestination(target, roles);
  redirect(destination);
}

function getLegacyDestination(target: "admin" | "hr" | "manager" | "reviewer" | "employee", roles: OrganizationRole[]) {
  if (target === "admin") return "/ams/admin";
  if (target === "hr") return "/ams/reviewer";
  if (target === "employee") return "/ams/employee";
  if (target === "reviewer") return "/ams/reviewer";
  if (roles.some((role) => ["MANAGEMENT", "PARTNER_OR_DIRECTOR"].includes(role))) {
    return "/ams/management";
  }
  return "/ams/reviewer";
}

export async function getOrganizationAccessSummary(user: SessionTenantUser, organizationId: string) {
  return getMembershipForOrganization(user.id, organizationId);
}
