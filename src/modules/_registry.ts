import type { LucideIcon } from "lucide-react";
import type { Role } from "@/generated/prisma/enums";

export type WorkspaceNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group?: string;
};

export type ModuleAvailability = "live" | "coming-soon";

export type ModuleConfig = {
  /** Short slug used as route prefix, e.g. "appraisal", "hrms", "attendance", "core" */
  key: string;
  /** Matches Organization.enabledModules entries. Omit for always-on modules. */
  moduleKey?: string;
  label: string;
  shortLabel: string;
  description: string;
  availability: ModuleAvailability;
  icon: LucideIcon;
  /** If true, module is always enabled regardless of organization config */
  alwaysOn?: boolean;
  /**
   * Base path for this module's routes.
   * "/" for core (personal pages stay at top level).
   */
  basePath: string;
  accentClass: string;
  badgeClass: string;
  /**
   * URL prefixes this module owns.
   * Used by middleware to determine which module a path belongs to.
   */
  pathPrefixes: string[];
  /** Per-feature permission map: featureKey → allowed roles */
  permissions: Record<string, Role[]>;
  /** Navigation items shown in sidebar for this module */
  getNav: (role: Role, secondaryRole?: Role | null, homeHref?: string) => WorkspaceNavItem[];
  /** Whether a user can access this module at all */
  canAccess: (role: Role, secondaryRole?: Role | null) => boolean;
  /** Default landing path within this module for a given role */
  defaultLandingPath: (role: Role, secondaryRole?: Role | null) => string;
};

import { coreModule } from "./core/module.config";
import { appraisalModule } from "./appraisal/module.config";
import { hrmsModule } from "./hrms/module.config";
import { attendanceModule } from "./attendance/module.config";
import { crmModule } from "./crm/module.config";

/**
 * Central module registry. To add a module: create src/modules/<key>/module.config.ts,
 * export a ModuleConfig, and add it here. To remove a module: delete the folder and
 * remove the entry.
 */
export const MODULES: ModuleConfig[] = [
  coreModule,
  appraisalModule,
  hrmsModule,
  attendanceModule,
  crmModule,
];

export function getModule(key: string): ModuleConfig | null {
  return MODULES.find((m) => m.key === key) ?? null;
}

export function getModuleByModuleKey(moduleKey: string): ModuleConfig | null {
  return MODULES.find((m) => m.moduleKey === moduleKey) ?? null;
}

/** Modules that require org enablement (non-core) */
export function getOptionalModules(): ModuleConfig[] {
  return MODULES.filter((m) => !m.alwaysOn && m.moduleKey);
}

/** Modules enabled for an org (plus always-on) */
export function getEnabledModules(enabledKeys?: string[] | null): ModuleConfig[] {
  return MODULES.filter(
    (m) => m.alwaysOn || (m.moduleKey && (enabledKeys?.includes(m.moduleKey) ?? false)),
  );
}

/** Which module owns this pathname */
export function getModuleForPath(pathname: string): ModuleConfig | null {
  // Attendance prefixes take priority (sub-paths of appraisal prefixes)
  const attendance = MODULES.find((m) => m.key === "attendance");
  if (attendance && matchesAnyPrefix(pathname, attendance.pathPrefixes)) {
    return attendance;
  }
  return MODULES.find((m) => m.key !== "attendance" && matchesAnyPrefix(pathname, m.pathPrefixes)) ?? null;
}

function matchesAnyPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
