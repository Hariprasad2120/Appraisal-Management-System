/**
 * Thin adapter — source of truth is src/modules/_registry.ts.
 * Exported names and signatures kept for backward compatibility.
 */
import type { LucideIcon } from "lucide-react";
import type { Role } from "@/generated/prisma/enums";
import {
  MODULES,
  getEnabledModules,
  getModuleForPath,
  type ModuleAvailability,
  type WorkspaceNavItem,
} from "@/modules/_registry";
import {
  APPRAISAL_MODULE_KEY,
  ATTENDANCE_MODULE_KEY,
  HUMAN_RESOURCE_MODULE_KEY,
} from "@/lib/module-catalog";

export { APPRAISAL_MODULE_KEY };
export type { WorkspaceNavItem };

export type WorkspaceKey =
  | "appraisal-management"
  | "hrms"
  | "attendance-management";

export type WorkspaceAvailability = ModuleAvailability;

export type WorkspaceDefinition = {
  key: WorkspaceKey;
  moduleKey: string;
  label: string;
  shortLabel: string;
  description: string;
  availability: WorkspaceAvailability;
  icon: LucideIcon;
  accentClass: string;
  badgeClass: string;
};

function moduleKeyToWorkspaceKey(moduleKey: string): WorkspaceKey | null {
  if (moduleKey === APPRAISAL_MODULE_KEY) return "appraisal-management";
  if (moduleKey === HUMAN_RESOURCE_MODULE_KEY) return "hrms";
  if (moduleKey === ATTENDANCE_MODULE_KEY) return "attendance-management";
  return null;
}

export const WORKSPACE_DEFINITIONS: WorkspaceDefinition[] = MODULES.filter(
  (m) => !m.alwaysOn && m.moduleKey && moduleKeyToWorkspaceKey(m.moduleKey),
).map((m) => ({
  key: moduleKeyToWorkspaceKey(m.moduleKey!)!,
  moduleKey: m.moduleKey!,
  label: m.label,
  shortLabel: m.shortLabel,
  description: m.description,
  availability: m.availability,
  icon: m.icon,
  accentClass: m.accentClass,
  badgeClass: m.badgeClass,
}));

export function getWorkspaceDefinition(workspaceKey: WorkspaceKey): WorkspaceDefinition | null {
  return WORKSPACE_DEFINITIONS.find((w) => w.key === workspaceKey) ?? null;
}

export function isWorkspaceEnabled(
  workspaceKey: WorkspaceKey,
  enabledModules?: string[] | null,
): boolean {
  const workspace = getWorkspaceDefinition(workspaceKey);
  if (!workspace) return false;
  return enabledModules?.includes(workspace.moduleKey) ?? false;
}

export function getEnabledWorkspaces(enabledModules?: string[] | null): WorkspaceDefinition[] {
  return WORKSPACE_DEFINITIONS.filter((w) => enabledModules?.includes(w.moduleKey) ?? false);
}

export function roleCanAccessWorkspace(
  workspaceKey: WorkspaceKey,
  role: Role,
  secondaryRole?: Role | null,
): boolean {
  const moduleKey =
    workspaceKey === "appraisal-management"
      ? APPRAISAL_MODULE_KEY
      : workspaceKey === "hrms"
        ? HUMAN_RESOURCE_MODULE_KEY
        : ATTENDANCE_MODULE_KEY;
  const mod = MODULES.find((m) => m.moduleKey === moduleKey);
  return mod?.canAccess(role, secondaryRole) ?? false;
}

export function getVisibleWorkspaces(
  enabledModules?: string[] | null,
  role?: Role,
  secondaryRole?: Role | null,
): WorkspaceDefinition[] {
  return getEnabledWorkspaces(enabledModules).filter((w) =>
    role ? roleCanAccessWorkspace(w.key, role, secondaryRole) : true,
  );
}

export function getWorkspaceForPath(pathname: string): WorkspaceKey | null {
  const mod = getModuleForPath(pathname);
  if (!mod || mod.alwaysOn || !mod.moduleKey) return null;
  return moduleKeyToWorkspaceKey(mod.moduleKey);
}

export function getWorkspaceStatusLabel(workspace: WorkspaceDefinition): string {
  return workspace.availability === "live" ? "Live" : "Coming soon";
}

export function getWorkspaceLandingPath(
  workspaceKey: WorkspaceKey,
  role: Role,
  secondaryRole?: Role | null,
  homeHref?: string,
): string {
  const moduleKey =
    workspaceKey === "appraisal-management"
      ? APPRAISAL_MODULE_KEY
      : workspaceKey === "hrms"
        ? HUMAN_RESOURCE_MODULE_KEY
        : ATTENDANCE_MODULE_KEY;
  const mod = MODULES.find((m) => m.moduleKey === moduleKey);
  if (!mod) return "/";
  const landing = mod.defaultLandingPath(role, secondaryRole);
  if (workspaceKey === "appraisal-management" && homeHref) return homeHref;
  return landing;
}

export function getWorkspaceNavItems(
  workspaceKey: WorkspaceKey,
  role: Role,
  secondaryRole?: Role | null,
  homeHref?: string,
): WorkspaceNavItem[] {
  const moduleKey =
    workspaceKey === "appraisal-management"
      ? APPRAISAL_MODULE_KEY
      : workspaceKey === "hrms"
        ? HUMAN_RESOURCE_MODULE_KEY
        : ATTENDANCE_MODULE_KEY;
  const mod = MODULES.find((m) => m.moduleKey === moduleKey);
  return mod?.getNav(role, secondaryRole, homeHref) ?? [];
}

export function getWorkspaceLaunchHref(
  organizationId: string,
  workspaceKey: WorkspaceKey,
): string {
  return `/org/${organizationId}/workspace/${workspaceKey}`;
}

export function getModuleRequiredForPath(pathname: string): string | null {
  const mod = getModuleForPath(pathname);
  if (!mod || mod.alwaysOn) return null;
  return mod.moduleKey ?? null;
}

export function getModuleDisabledRedirect(pathname: string): string {
  const moduleKey = getModuleRequiredForPath(pathname);
  if (!moduleKey) return "/module-disabled";
  return `/module-disabled?module=${moduleKey}`;
}
