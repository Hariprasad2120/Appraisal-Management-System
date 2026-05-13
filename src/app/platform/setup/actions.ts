"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  PLATFORM_HOME_PATH,
  PLATFORM_SETUP_PATH,
  assignDepartmentRole,
  createStandaloneManagementUser,
  finalizePlatformModules,
  removeBranch,
  removeDepartment,
  removeDepartmentRoleAssignment,
  removeEmployee,
  saveBranch,
  saveDepartment,
  saveEmployee,
  saveOrganizationSetup,
} from "@/lib/platform-setup";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function optional(formData: FormData, key: string) {
  const value = text(formData, key).trim();
  return value || undefined;
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function encodeMessage(message: string) {
  return encodeURIComponent(message);
}

function toSetupRedirect(params: Record<string, string>) {
  const search = new URLSearchParams(params);
  redirect(`${PLATFORM_SETUP_PATH}?${search.toString()}`);
}

async function requirePlatformUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.platformRole !== "PLATFORM_SUPER_ADMIN") redirect("/");
  return session.user;
}

function getScopedOrganizationId(user: Awaited<ReturnType<typeof requirePlatformUser>>, formData: FormData) {
  const organizationId = text(formData, "organizationId") || user.activeOrganizationId || "";
  if (!organizationId) {
    throw new Error("Create the organization details first.");
  }
  return organizationId;
}

export async function saveOrganizationAction(formData: FormData) {
  const user = await requirePlatformUser();
  try {
    const logo = formData.get("logo");
    const organization = await saveOrganizationSetup(user, {
      organizationId: optional(formData, "organizationId"),
      name: text(formData, "name"),
      slug: text(formData, "slug"),
      legalName: optional(formData, "legalName"),
      industry: optional(formData, "industry"),
      address: optional(formData, "address"),
      contactEmail: optional(formData, "contactEmail"),
      contactPhone: optional(formData, "contactPhone"),
      timezone: text(formData, "timezone"),
      locale: text(formData, "locale"),
      dateFormat: text(formData, "dateFormat"),
      logo: logo instanceof File ? logo : null,
    });
    toSetupRedirect({ success: encodeMessage(`Organization ${organization.name} saved.`) });
  } catch (error) {
    toSetupRedirect({ error: encodeMessage(error instanceof Error ? error.message : "Failed to save organization.") });
  }
}

export async function saveBranchAction(formData: FormData) {
  const user = await requirePlatformUser();
  try {
    const organizationId = getScopedOrganizationId(user, formData);
    await saveBranch(user, organizationId, {
      id: optional(formData, "id"),
      name: text(formData, "name"),
      code: optional(formData, "code"),
      address: optional(formData, "address"),
      city: optional(formData, "city"),
      state: optional(formData, "state"),
      country: optional(formData, "country"),
      active: checked(formData, "active"),
    });
    toSetupRedirect({ success: encodeMessage("Branch saved.") });
  } catch (error) {
    toSetupRedirect({ error: encodeMessage(error instanceof Error ? error.message : "Failed to save branch.") });
  }
}

export async function deleteBranchAction(formData: FormData) {
  await requirePlatformUser();
  try {
    await removeBranch(text(formData, "organizationId"), text(formData, "branchId"));
    toSetupRedirect({ success: encodeMessage("Branch removed.") });
  } catch (error) {
    toSetupRedirect({ error: encodeMessage(error instanceof Error ? error.message : "Failed to remove branch.") });
  }
}

export async function saveDepartmentAction(formData: FormData) {
  const user = await requirePlatformUser();
  try {
    const organizationId = getScopedOrganizationId(user, formData);
    await saveDepartment(organizationId, {
      id: optional(formData, "id"),
      branchId: optional(formData, "branchId"),
      name: text(formData, "name"),
      code: optional(formData, "code"),
      active: checked(formData, "active"),
    });
    toSetupRedirect({ success: encodeMessage("Department saved.") });
  } catch (error) {
    toSetupRedirect({ error: encodeMessage(error instanceof Error ? error.message : "Failed to save department.") });
  }
}

export async function deleteDepartmentAction(formData: FormData) {
  await requirePlatformUser();
  try {
    await removeDepartment(text(formData, "organizationId"), text(formData, "departmentId"));
    toSetupRedirect({ success: encodeMessage("Department removed.") });
  } catch (error) {
    toSetupRedirect({ error: encodeMessage(error instanceof Error ? error.message : "Failed to remove department.") });
  }
}

export async function createStandaloneManagementUserAction(formData: FormData) {
  await requirePlatformUser();
  try {
    await createStandaloneManagementUser(text(formData, "organizationId"), {
      name: text(formData, "name"),
      email: text(formData, "email"),
      branchId: optional(formData, "branchId"),
      departmentId: optional(formData, "departmentId"),
      role: text(formData, "role") as "MANAGEMENT" | "HR" | "MANAGER" | "TEAM_LEAD" | "APPRAISAL_ADMIN",
    });
    toSetupRedirect({ success: encodeMessage("Management user created.") });
  } catch (error) {
    toSetupRedirect({ error: encodeMessage(error instanceof Error ? error.message : "Failed to create management user.") });
  }
}

export async function assignDepartmentRoleAction(formData: FormData) {
  await requirePlatformUser();
  try {
    await assignDepartmentRole(text(formData, "organizationId"), {
      userId: text(formData, "userId"),
      branchId: optional(formData, "branchId"),
      departmentId: text(formData, "departmentId"),
      role: text(formData, "role") as "MANAGEMENT" | "HR" | "MANAGER" | "TEAM_LEAD" | "APPRAISAL_ADMIN",
    });
    toSetupRedirect({ success: encodeMessage("Department ownership updated.") });
  } catch (error) {
    toSetupRedirect({ error: encodeMessage(error instanceof Error ? error.message : "Failed to assign department role.") });
  }
}

export async function removeDepartmentRoleAssignmentAction(formData: FormData) {
  await requirePlatformUser();
  try {
    await removeDepartmentRoleAssignment(text(formData, "organizationId"), text(formData, "assignmentId"));
    toSetupRedirect({ success: encodeMessage("Department role assignment removed.") });
  } catch (error) {
    toSetupRedirect({ error: encodeMessage(error instanceof Error ? error.message : "Failed to remove assignment.") });
  }
}

export async function saveEmployeeAction(formData: FormData) {
  await requirePlatformUser();
  try {
    await saveEmployee(text(formData, "organizationId"), {
      userId: optional(formData, "userId"),
      name: text(formData, "name"),
      email: text(formData, "email"),
      branchId: text(formData, "branchId"),
      departmentId: text(formData, "departmentId"),
      designation: optional(formData, "designation"),
      primaryRole: text(formData, "primaryRole") as "EMPLOYEE" | "HR" | "MANAGER" | "TL" | "MANAGEMENT" | "ADMIN",
      secondaryRole: optional(formData, "secondaryRole") as "EMPLOYEE" | "HR" | "MANAGER" | "TL" | "MANAGEMENT" | "ADMIN" | undefined,
      employeeNumber: optional(formData, "employeeNumber") ? Number(text(formData, "employeeNumber")) : undefined,
      joiningDate: text(formData, "joiningDate"),
      active: checked(formData, "active"),
      teamLeadId: optional(formData, "teamLeadId"),
      managerId: optional(formData, "managerId"),
      managementId: optional(formData, "managementId"),
    });
    toSetupRedirect({ success: encodeMessage("Employee saved.") });
  } catch (error) {
    toSetupRedirect({ error: encodeMessage(error instanceof Error ? error.message : "Failed to save employee.") });
  }
}

export async function deleteEmployeeAction(formData: FormData) {
  await requirePlatformUser();
  try {
    await removeEmployee(text(formData, "organizationId"), text(formData, "userId"));
    toSetupRedirect({ success: encodeMessage("Employee removed.") });
  } catch (error) {
    toSetupRedirect({ error: encodeMessage(error instanceof Error ? error.message : "Failed to remove employee.") });
  }
}

export async function finalizeModulesAction(formData: FormData) {
  const user = await requirePlatformUser();
  try {
    const organizationId = text(formData, "organizationId");
    await finalizePlatformModules(user, organizationId, {
      selectedModules: formData
        .getAll("selectedModules")
        .map((value) => String(value))
        .filter(Boolean),
    });
    redirect(`${PLATFORM_HOME_PATH}?success=${encodeMessage("Organization setup completed.")}`);
  } catch (error) {
    toSetupRedirect({ error: encodeMessage(error instanceof Error ? error.message : "Failed to finalize modules.") });
  }
}
