import type { Role } from "@/generated/prisma/enums";
import { MODULES } from "@/modules/_registry";

/**
 * Check if a role has a specific permission.
 * Permission keys are namespaced: "<module-key>:<feature>.<action>"
 * e.g. "appraisal:cycles.create", "hrms:employees.manage"
 *
 * Falls back gracefully if the module or permission key is not found.
 */
export function hasPermission(
  permissionKey: string,
  role: Role,
  secondaryRole?: Role | null,
): boolean {
  const [moduleKey, featureKey] = permissionKey.split(":");
  if (!moduleKey || !featureKey) return false;

  const mod = MODULES.find((m) => m.key === moduleKey);
  if (!mod) return false;

  const allowed = mod.permissions[featureKey];
  if (!allowed) return false;

  return (
    allowed.includes(role) ||
    (secondaryRole != null && allowed.includes(secondaryRole))
  );
}

/**
 * Throws if the role lacks the required permission.
 * Use inside server actions and server components.
 */
export function requirePermission(
  permissionKey: string,
  role: Role,
  secondaryRole?: Role | null,
): void {
  if (!hasPermission(permissionKey, role, secondaryRole)) {
    throw new Error(`Forbidden: missing permission '${permissionKey}' for role '${role}'`);
  }
}
