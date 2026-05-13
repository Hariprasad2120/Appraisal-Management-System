"use server";

import { revalidatePath } from "next/cache";
import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateRuleConfig } from "@/lib/kpi-rules";
import type { KpiApprovalStatus, KpiCriterionStatus, KpiRuleType } from "@/generated/prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")
  ) {
    throw new Error("Forbidden");
  }
  return session;
}

function text(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function refreshCriteriaPaths() {
  revalidatePath("/ams/admin/kpi");
  revalidatePath("/ams/reviewer/kpi");
}

const RULE_TYPE_VALUES = new Set<string>([
  "TURNAROUND_TIME",
  "DUE_DATE",
  "RECURRING_WEEKLY_DUE_DATE",
  "MANUAL",
  "HYBRID",
]);

function parseRuleConfig(raw: string, ruleType: string): object {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("ruleConfig must be valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("ruleConfig must be a JSON object");
  }
  const validationError = validateRuleConfig(ruleType, parsed);
  if (validationError) throw new Error(validationError);
  return parsed as object;
}

export async function createKpiCriterionAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const name = text(formData, "name");
  const description = text(formData, "description") || null;
  const departmentId = text(formData, "departmentId");
  const divisionId = text(formData, "divisionId") || null;
  const weightageRaw = text(formData, "weightage");
  const ruleTypeRaw = text(formData, "ruleType");
  const ruleConfigRaw = text(formData, "ruleConfig");
  const effectiveFrom = text(formData, "effectiveFrom") || null;
  const effectiveTo = text(formData, "effectiveTo") || null;

  if (!name) throw new Error("Name is required");
  if (!departmentId) throw new Error("Department is required");
  const weightage = parseFloat(weightageRaw);
  if (!Number.isFinite(weightage) || weightage <= 0 || weightage > 100)
    throw new Error("Weightage must be between 1 and 100");
  if (!RULE_TYPE_VALUES.has(ruleTypeRaw)) throw new Error("Invalid rule type");
  const ruleConfig = parseRuleConfig(ruleConfigRaw, ruleTypeRaw);

  await prisma.kpiCriterion.create({
    data: {
      name,
      description,
      departmentId,
      divisionId,
      weightage,
      ruleType: ruleTypeRaw as KpiRuleType,
      ruleConfig,
      createdById: session.user.id,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
      effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
    },
  });

  refreshCriteriaPaths();
}

export async function updateKpiCriterionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = text(formData, "id");
  const name = text(formData, "name");
  const description = text(formData, "description") || null;
  const divisionId = text(formData, "divisionId") || null;
  const weightageRaw = text(formData, "weightage");
  const ruleTypeRaw = text(formData, "ruleType");
  const ruleConfigRaw = text(formData, "ruleConfig");
  const effectiveFrom = text(formData, "effectiveFrom") || null;
  const effectiveTo = text(formData, "effectiveTo") || null;

  if (!id) throw new Error("Missing criterion id");
  if (!name) throw new Error("Name is required");
  const weightage = parseFloat(weightageRaw);
  if (!Number.isFinite(weightage) || weightage <= 0 || weightage > 100)
    throw new Error("Weightage must be between 1 and 100");
  if (!RULE_TYPE_VALUES.has(ruleTypeRaw)) throw new Error("Invalid rule type");
  const ruleConfig = parseRuleConfig(ruleConfigRaw, ruleTypeRaw);

  await prisma.kpiCriterion.update({
    where: { id },
    data: {
      name,
      description,
      divisionId,
      weightage,
      ruleType: ruleTypeRaw as KpiRuleType,
      ruleConfig,
      approvalStatus: "PENDING" as KpiApprovalStatus,
      approvedById: null,
      approvedAt: null,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
      effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
    },
  });

  refreshCriteriaPaths();
}

export async function toggleKpiCriterionStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = text(formData, "id");
  const currentStatus = text(formData, "currentStatus") as KpiCriterionStatus;
  if (!id) throw new Error("Missing id");

  const newStatus: KpiCriterionStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  await prisma.kpiCriterion.update({ where: { id }, data: { status: newStatus } });
  refreshCriteriaPaths();
}
