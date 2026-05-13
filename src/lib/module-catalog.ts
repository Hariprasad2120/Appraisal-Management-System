/**
 * Thin adapter — source of truth is src/modules/_registry.ts.
 * Exported names kept for backward compatibility.
 */
import type { LucideIcon } from "lucide-react";
import { MODULES, type ModuleAvailability } from "@/modules/_registry";

export type { ModuleAvailability };

export const APPRAISAL_MODULE_KEY = "appraisal-management";
export const HUMAN_RESOURCE_MODULE_KEY = "human-resource-management";
export const ATTENDANCE_MODULE_KEY = "attendance-management";
export const CRM_MODULE_KEY = "customer-relationship-management";

export type ModuleDefinition = {
  key: string;
  name: string;
  shortLabel: string;
  description: string;
  availability: ModuleAvailability;
  icon: LucideIcon;
  accentClass: string;
  badgeClass: string;
};

export const MODULE_DEFINITIONS: ModuleDefinition[] = MODULES.filter((m) => !m.alwaysOn && m.moduleKey).map(
  (m) => ({
    key: m.moduleKey!,
    name: m.label,
    shortLabel: m.shortLabel,
    description: m.description,
    availability: m.availability,
    icon: m.icon,
    accentClass: m.accentClass,
    badgeClass: m.badgeClass,
  }),
);

export function getModuleDefinition(moduleKey: string): ModuleDefinition | null {
  return MODULE_DEFINITIONS.find((m) => m.key === moduleKey) ?? null;
}

export function getModuleStatusLabel(availability: ModuleAvailability): string {
  return availability === "live" ? "Live" : "Coming soon";
}
