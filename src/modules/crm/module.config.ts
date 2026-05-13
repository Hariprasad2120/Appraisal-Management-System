import { Briefcase } from "lucide-react";
import type { ModuleConfig } from "@/modules/_registry";

export const crmModule: ModuleConfig = {
  key: "crm",
  moduleKey: "customer-relationship-management",
  label: "Customer Relationship Management",
  shortLabel: "CRM",
  description: "Customer relationship management, pipeline visibility, and client follow-through.",
  availability: "coming-soon",
  icon: Briefcase,
  basePath: "/crm",
  accentClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  pathPrefixes: ["/crm"],
  permissions: {},
  getNav: () => [],
  canAccess: () => false,
  defaultLandingPath: () => "/crm",
};
