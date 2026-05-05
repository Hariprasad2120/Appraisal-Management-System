"use server";

import { refresh, revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canBeAppraised } from "@/lib/rbac";
import {
  DEFAULT_KPI_MONTHLY_TARGET,
  KPI_MONTHLY_TARGET_SETTING,
  KPI_RATING_SCALE_SETTING,
  achievementForRating,
  calculateAverageRating,
  calculateMonthlyPointScore,
  calculateWeightedAchievement,
  getKpiPerformanceCategory,
  monthStart,
  parseKpiRatingScale,
} from "@/lib/kpi";

type KnownTemplateItem = {
  name: string;
  weightage: number;
  measurement: string;
  target: string;
};

type TemplateItemSnapshot = {
  id: string;
  parentItemId: string | null;
  itemKind: "CRITERION" | "TASK";
  name: string;
  weightage: number;
  measurement: string;
  target: string;
  description: string | null;
  sortOrder: number;
};

const AUTO_MATCH_RULES: { needle: string; department: string }[] = [
  { needle: "Human Resource", department: "HR" },
  { needle: "Head of HR", department: "HR" },
  { needle: "HR", department: "HR" },
  { needle: "Accounts", department: "Accounts" },
  { needle: "Administration", department: "Administration" },
  { needle: "Admin", department: "Administration" },
  { needle: "Freight Forwarding", department: "Freight Forwarding" },
  { needle: "FF", department: "Freight Forwarding" },
  { needle: "Custom Clearance", department: "Custom Clearance" },
  { needle: "Custom Broker", department: "Custom Clearance" },
  { needle: "Customs Broker", department: "Custom Clearance" },
  { needle: "CFS Operations", department: "Custom Clearance" },
  { needle: "Delivery Order", department: "Custom Clearance" },
  { needle: "Documentation", department: "Custom Clearance" },
];

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) {
    throw new Error("Forbidden");
  }
  return session;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(formData: FormData, key: string): string | null {
  const value = text(formData, key);
  return value.length > 0 ? value : null;
}

function numberValue(formData: FormData, key: string): number {
  const value = Number(text(formData, key));
  return Number.isFinite(value) ? value : 0;
}

async function kpiSettings() {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: [KPI_MONTHLY_TARGET_SETTING, KPI_RATING_SCALE_SETTING] } },
  });
  const map = new Map(settings.map((setting) => [setting.key, setting.value]));
  return {
    monthlyTarget: Number(map.get(KPI_MONTHLY_TARGET_SETTING) ?? DEFAULT_KPI_MONTHLY_TARGET),
    ratingScale: parseKpiRatingScale(map.get(KPI_RATING_SCALE_SETTING)),
  };
}

async function recalculateReview(reviewId: string) {
  const { monthlyTarget } = await kpiSettings();
  const items = await prisma.kpiReviewItem.findMany({ where: { reviewId, itemKind: "TASK", assignedToEmployee: true } });
  const totalWeightage = items.reduce((sum, item) => sum + item.weightage, 0);
  const rawWeightedAchievement = items.reduce((sum, item) => sum + item.weightedAchievement, 0);
  const totalAchievementPercent = totalWeightage > 0 ? (rawWeightedAchievement * 100) / totalWeightage : 0;
  const monthlyPointScore = calculateMonthlyPointScore(totalAchievementPercent, monthlyTarget);
  const averageRating = calculateAverageRating(items.map((item) => item.rating));
  await prisma.kpiReview.update({
    where: { id: reviewId },
    data: {
      totalAchievementPercent,
      monthlyPointScore,
      averageRating,
      performanceCategory: getKpiPerformanceCategory(monthlyPointScore),
    },
  });
}

async function persistDraftScores(reviewId: string, formData: FormData) {
  const review = await prisma.kpiReview.findUnique({
    where: { id: reviewId },
    include: { items: true },
  });
  if (!review) throw new Error("Review not found");
  if (review.status === "FINALIZED") throw new Error("Reopen the finalized review before editing");

  const { ratingScale } = await kpiSettings();
  await prisma.$transaction(
    review.items.filter((item) => item.itemKind === "TASK" && item.assignedToEmployee).map((item) => {
      const ratingRaw = text(formData, `rating:${item.id}`);
      const rating = ratingRaw ? Number(ratingRaw) : null;
      const achievementRaw = text(formData, `achievement:${item.id}`);
      const achievementPercent = achievementRaw ? Number(achievementRaw) : achievementForRating(rating, ratingScale);
      return prisma.kpiReviewItem.update({
        where: { id: item.id },
        data: {
          rating,
          achievementPercent,
          weightedAchievement: calculateWeightedAchievement(item.weightage, achievementPercent),
          actualAchievement: nullableText(formData, `actual:${item.id}`),
          remarks: nullableText(formData, `remarks:${item.id}`),
        },
      });
    }),
  );
  await prisma.kpiReview.update({
    where: { id: reviewId },
    data: { overallRemarks: nullableText(formData, "overallRemarks") },
  });
  await recalculateReview(reviewId);
}

async function autoAssignEmployeesToDepartment(departmentId: string) {
  const department = await prisma.kpiDepartment.findUnique({
    where: { id: departmentId },
    include: { parent: true },
  });
  if (!department) return 0;

  const names = [department.name, department.parent?.name].filter(Boolean) as string[];
  const mappedNeedles = AUTO_MATCH_RULES
    .filter((rule) => names.some((name) => rule.department.toLowerCase() === name.toLowerCase()))
    .map((rule) => rule.needle);
  const needles = [...new Set([...names, ...mappedNeedles])].filter((needle) => needle.length >= 2);
  if (needles.length === 0) return 0;

  const result = await prisma.user.updateMany({
    where: {
      role: { notIn: ["ADMIN", "MANAGEMENT", "PARTNER"] },
      active: true,
      OR: needles.map((needle) => ({
        department: { contains: needle, mode: "insensitive" as const },
      })),
    },
    data: { kpiDepartmentId: departmentId },
  });
  return result.count;
}

const KNOWN_SUB_DEPARTMENT_TEMPLATES: Record<string, KnownTemplateItem[]> = {
  sales: [
    { name: "Gross Profit / Revenue Achievement", weightage: 30, measurement: "Monthly GP or revenue generated", target: "100% of target" },
    { name: "New Customer Acquisition", weightage: 15, measurement: "New active customers added", target: "Monthly target" },
    { name: "Quotation Conversion Ratio", weightage: 15, measurement: "Quotes converted into confirmed shipments", target: "Target % to be fixed" },
    { name: "Sales Calls / Visits / Follow-ups", weightage: 10, measurement: "Calls, meetings, visits, follow-up discipline", target: "Weekly target" },
    { name: "Customer Retention", weightage: 10, measurement: "Repeat shipments from existing customers", target: "High retention" },
    { name: "Cross-Selling", weightage: 5, measurement: "Customs + freight + transport + other services", target: "Monthly contribution" },
    { name: "Credit Discipline", weightage: 5, measurement: "Business within approved credit terms", target: "No risky credit" },
    { name: "CRM / Sales Reporting", weightage: 5, measurement: "Lead, quote, and lost-reason updates", target: "100% updated" },
    { name: "Internal Coordination", weightage: 5, measurement: "Handover to operations/support/accounts", target: "Reviewer rating" },
  ],
  "customer support": [
    { name: "Quotation / Rate Response Time", weightage: 15, measurement: "Time taken to send quote after request", target: "Within agreed TAT" },
    { name: "Booking Accuracy", weightage: 15, measurement: "Correct vessel, routing, carrier, consignee, shipper details", target: "98%+" },
    { name: "Shipment Tracking Updates", weightage: 20, measurement: "Timely milestone updates to customer", target: "100% key milestone update" },
    { name: "Customer Communication Quality", weightage: 15, measurement: "Clear, professional, proactive communication", target: "Reviewer/customer rating" },
    { name: "Exception Handling", weightage: 10, measurement: "Delay, rollover, transshipment, customs, damage, shortage", target: "Fast escalation" },
    { name: "Documentation Coordination", weightage: 10, measurement: "SI, BL draft, MBL/HBL, pre-alert, invoice support", target: "Error-free" },
    { name: "Customer Complaint Control", weightage: 5, measurement: "Complaints due to poor support", target: "Minimal / zero repeated complaints" },
    { name: "Billing Handover Accuracy", weightage: 5, measurement: "Correct billing details to accounts", target: "98%+" },
    { name: "Internal Coordination", weightage: 5, measurement: "Coordination with sales, accounts, customs, transport", target: "Reviewer rating" },
  ],
  documentation: [
    { name: "Documentation Accuracy", weightage: 20, measurement: "Error-free Bill of Entry, Shipping Bill, invoice, packing list, BL/AWB details", target: "98%+ accuracy" },
    { name: "Filing Turnaround Time", weightage: 20, measurement: "Prepare and file after receiving complete documents", target: "Same day / within agreed TAT" },
    { name: "First-Time Clearance Support", weightage: 15, measurement: "Jobs cleared without avoidable document-related query", target: "95%+" },
    { name: "Query Handling Speed", weightage: 10, measurement: "Response time for customs/customer/internal query", target: "Within same working day" },
    { name: "Job Volume / Productivity", weightage: 15, measurement: "Files handled based on complexity", target: "Meets monthly target" },
    { name: "Compliance Knowledge", weightage: 10, measurement: "HS support, checklist, licence/restriction awareness", target: "No major compliance miss" },
    { name: "Record Maintenance", weightage: 5, measurement: "Digital/physical file maintenance", target: "100% updated" },
    { name: "Internal Coordination", weightage: 5, measurement: "Coordination with CFS, DO, accounts, customer support", target: "Reviewer rating" },
  ],
  "cfs operations": [
    { name: "Clearance Coordination Speed", weightage: 20, measurement: "Coordination with CFS, customs, surveyor, transporter, client", target: "Within planned timeline" },
    { name: "Examination / Inspection Handling", weightage: 15, measurement: "Examination, seal verification, cargo inspection", target: "No avoidable delay" },
    { name: "Detention / Demurrage Prevention", weightage: 15, measurement: "Avoidable detention/demurrage cases", target: "Zero avoidable cases" },
    { name: "Physical Presence / Field Discipline", weightage: 10, measurement: "Presence at CFS/port when required", target: "95%+ adherence" },
    { name: "Shipment Status Updates", weightage: 10, measurement: "Updates to internal team/customer support", target: "Same-day updates" },
    { name: "Problem Resolution", weightage: 10, measurement: "Holds, shortage, damage, customs query, CFS issue", target: "Fast escalation" },
    { name: "Cost Control", weightage: 10, measurement: "Avoiding unnecessary CFS/storage/handling charges", target: "No avoidable extra cost" },
    { name: "Safety and Compliance", weightage: 5, measurement: "CFS, customs, port safety rules", target: "Zero violation" },
    { name: "Reporting and Documentation", weightage: 5, measurement: "Proofs, photos, gate pass, EIR, delivery updates", target: "100% maintained" },
  ],
  "delivery orders": [
    { name: "DO Release Turnaround Time", weightage: 25, measurement: "Time to obtain DO after complete documents/payment", target: "Same day / within TAT" },
    { name: "Accuracy of DO Documents", weightage: 20, measurement: "Correct BL, consignee, vessel, container, charges", target: "99% accuracy" },
    { name: "Shipping Line Coordination", weightage: 15, measurement: "Follow-up with line/NVOCC/agent", target: "No avoidable delay" },
    { name: "Payment and Charges Coordination", weightage: 10, measurement: "Correct charges, invoices, receipts, refund follow-up", target: "100% accuracy" },
    { name: "Customer / Internal Updates", weightage: 10, measurement: "DO status update to operations/customer support", target: "Timely updates" },
    { name: "Backlog Control", weightage: 10, measurement: "Pending DO cases beyond TAT", target: "Zero avoidable backlog" },
    { name: "Record Maintenance", weightage: 5, measurement: "DO copies, receipts, email trail", target: "100% maintained" },
    { name: "Escalation Handling", weightage: 5, measurement: "Escalating blocked DOs at right time", target: "Reviewer rating" },
  ],
  "delivery order": [
    { name: "DO Release Turnaround Time", weightage: 25, measurement: "Time to obtain DO after complete documents/payment", target: "Same day / within TAT" },
    { name: "Accuracy of DO Documents", weightage: 20, measurement: "Correct BL, consignee, vessel, container, charges", target: "99% accuracy" },
    { name: "Shipping Line Coordination", weightage: 15, measurement: "Follow-up with line/NVOCC/agent", target: "No avoidable delay" },
    { name: "Payment and Charges Coordination", weightage: 10, measurement: "Correct charges, invoices, receipts, refund follow-up", target: "100% accuracy" },
    { name: "Customer / Internal Updates", weightage: 10, measurement: "DO status update to operations/customer support", target: "Timely updates" },
    { name: "Backlog Control", weightage: 10, measurement: "Pending DO cases beyond TAT", target: "Zero avoidable backlog" },
    { name: "Record Maintenance", weightage: 5, measurement: "DO copies, receipts, email trail", target: "100% maintained" },
    { name: "Escalation Handling", weightage: 5, measurement: "Escalating blocked DOs at right time", target: "Reviewer rating" },
  ],
};

async function seedKnownTemplateForDepartment(departmentId: string, name: string) {
  const items = KNOWN_SUB_DEPARTMENT_TEMPLATES[name.toLowerCase()];
  if (!items) return;
  const template = await prisma.kpiTemplate.create({
    data: { departmentId, name: `${name} KPI Template`, version: 1, active: true },
  });
  await prisma.kpiTemplateItem.createMany({
    data: items.map((item, index) => ({
      templateId: template.id,
      name: item.name,
      weightage: item.weightage,
      measurement: item.measurement,
      target: item.target,
      sortOrder: index + 1,
    })),
  });
}

function refreshKpiPaths() {
  revalidatePath("/admin/kpi");
  revalidatePath("/management/kpi");
  revalidatePath("/employee");
  refresh();
}

export async function createKpiDepartmentAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const schema = z.object({
    name: z.string().min(1),
    parentId: z.string().optional().nullable(),
  });
  const parsed = schema.safeParse({
    name: text(formData, "name"),
    parentId: nullableText(formData, "parentId"),
  });
  if (!parsed.success) throw new Error("Department name is required");

  const siblingCount = await prisma.kpiDepartment.count({
    where: { parentId: parsed.data.parentId ?? null },
  });
  const created = await prisma.kpiDepartment.create({
    data: {
      name: parsed.data.name,
      parentId: parsed.data.parentId ?? null,
      sortOrder: siblingCount + 1,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "KPI_DEPARTMENT_CREATED",
      after: parsed.data,
    },
  }).catch(() => {});
  await seedKnownTemplateForDepartment(created.id, created.name);
  await autoAssignEmployeesToDepartment(created.id);
  refreshKpiPaths();
}

export async function toggleKpiDepartmentAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = text(formData, "id");
  const active = text(formData, "active") === "true";
  if (!id) throw new Error("Missing department");
  await prisma.kpiDepartment.update({ where: { id }, data: { active: !active } });
  refreshKpiPaths();
}

export async function removeKpiDepartmentAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = text(formData, "id");
  if (!id) throw new Error("Missing department");

  const department = await prisma.kpiDepartment.findUnique({ where: { id } });
  if (!department) throw new Error("Department not found");

  const departmentIds = [id];
  for (let index = 0; index < departmentIds.length; index += 1) {
    const children = await prisma.kpiDepartment.findMany({
      where: { parentId: departmentIds[index] },
      select: { id: true },
    });
    departmentIds.push(...children.map((child) => child.id));
  }

  await prisma.user.updateMany({
    where: { kpiDepartmentId: { in: departmentIds } },
    data: { kpiDepartmentId: null },
  });

  const reviewCount = await prisma.kpiReview.count({
    where: { departmentId: { in: departmentIds } },
  });
  if (reviewCount > 0) {
    await prisma.kpiDepartment.updateMany({
      where: { id: { in: departmentIds } },
      data: { active: false },
    });
  } else {
    await prisma.kpiTemplate.deleteMany({ where: { departmentId: { in: departmentIds } } });
    for (const departmentId of departmentIds.reverse()) {
      await prisma.kpiDepartment.delete({ where: { id: departmentId } });
    }
  }
  refreshKpiPaths();
}

export async function assignEmployeeKpiDepartmentAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = text(formData, "userId");
  const kpiDepartmentId = nullableText(formData, "kpiDepartmentId");
  if (!userId) throw new Error("Missing employee");
  await prisma.user.update({ where: { id: userId }, data: { kpiDepartmentId } });
  revalidatePath("/admin/kpi");
  revalidatePath(`/admin/employees/${userId}`);
  refresh();
}

export async function bulkAssignEmployeesToTlAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const tlId = text(formData, "tlId");
  const employeeIds = formData
    .getAll("employeeId")
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  if (!tlId) throw new Error("Choose a TL");
  const tl = await prisma.user.findUnique({
    where: { id: tlId },
    select: { id: true, role: true, active: true },
  });
  if (!tl || tl.role !== "TL" || !tl.active) throw new Error("Choose an active TL");
  if (employeeIds.length === 0) throw new Error("Choose at least one employee");

  const eligibleEmployees = await prisma.user.findMany({
    where: {
      id: { in: employeeIds },
      active: true,
    },
    select: { id: true, role: true },
  });
  const eligibleIds = eligibleEmployees.filter((employee) => canBeAppraised(employee.role)).map((employee) => employee.id);
  if (eligibleIds.length !== employeeIds.length) {
    throw new Error("Only active appraisable employees can be assigned to a TL");
  }
  await prisma.user.updateMany({
    where: { id: { in: eligibleIds } },
    data: { reportingManagerId: tlId },
  });
  revalidatePath("/admin/kpi");
  revalidatePath("/admin/employees");
  revalidatePath("/reviewer/kpi");
  refresh();
}

export async function createKpiTemplateItemAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const departmentId = text(formData, "departmentId");
  if (!departmentId) throw new Error("Choose a KPI department");

  let template = await prisma.kpiTemplate.findFirst({
    where: { departmentId, active: true },
    orderBy: { version: "desc" },
  });
  if (!template) {
    const department = await prisma.kpiDepartment.findUnique({ where: { id: departmentId } });
    if (!department) throw new Error("Department not found");
    template = await prisma.kpiTemplate.create({
      data: { departmentId, name: `${department.name} KPI Template`, version: 1, active: true },
    });
  }

  const schema = z.object({
    name: z.string().min(1),
    measurement: z.string().optional(),
    target: z.string().optional(),
    description: z.string().optional().nullable(),
  });
  const parsed = schema.safeParse({
    name: text(formData, "name"),
    measurement: text(formData, "measurement"),
    target: text(formData, "target"),
    description: nullableText(formData, "description"),
  });
  if (!parsed.success) throw new Error("KPI criterion name is required");
  const tasks = [0, 1, 2, 3, 4, 5]
    .map((index) => ({
      name: text(formData, `taskName:${index}`),
      weightage: numberValue(formData, `taskWeightage:${index}`),
      description: nullableText(formData, `taskDescription:${index}`),
      target: text(formData, `taskTarget:${index}`),
      measurement: text(formData, `taskMeasurement:${index}`),
    }))
    .filter((task) => task.name.length > 0);
  if (tasks.length === 0) throw new Error("A KPI criterion must have at least one task");
  if (tasks.some((task) => task.weightage <= 0)) throw new Error("Each task needs a valid positive weightage");
  const count = await prisma.kpiTemplateItem.count({ where: { templateId: template.id } });
  await prisma.$transaction(async (tx) => {
    const criterion = await tx.kpiTemplateItem.create({
      data: {
        templateId: template.id,
        itemKind: "CRITERION",
        name: parsed.data.name,
        weightage: 0,
        measurement: parsed.data.measurement ?? "",
        target: parsed.data.target ?? "",
        description: parsed.data.description,
        sortOrder: count + 1,
      },
    });
    await tx.kpiTemplateItem.createMany({
      data: tasks.map((task, index) => ({
        templateId: template.id,
        parentItemId: criterion.id,
        itemKind: "TASK",
        name: task.name,
        weightage: task.weightage,
        measurement: task.measurement || parsed.data.measurement || "",
        target: task.target || parsed.data.target || "",
        description: task.description,
        sortOrder: index + 1,
      })),
    });
  });
  refreshKpiPaths();
}

export async function updateKpiTemplateItemAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = text(formData, "id");
  if (!id) throw new Error("Missing KPI item");
  const parsed = z.object({
    name: z.string().min(1),
    weightage: z.number().min(0),
    measurement: z.string().optional(),
    target: z.string().optional(),
    description: z.string().optional().nullable(),
    active: z.boolean(),
  }).safeParse({
    name: text(formData, "name"),
    weightage: numberValue(formData, "weightage"),
    measurement: text(formData, "measurement"),
    target: text(formData, "target"),
    description: nullableText(formData, "description"),
    active: text(formData, "active") === "true",
  });
  if (!parsed.success) throw new Error("Invalid KPI item");
  await prisma.kpiTemplateItem.update({ where: { id }, data: parsed.data });
  refreshKpiPaths();
}

export async function createKpiReviewDraftAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const userId = text(formData, "userId");
  const monthValue = text(formData, "month");
  if (!userId || !monthValue) throw new Error("Choose employee and month");
  const employee = await prisma.user.findUnique({
    where: { id: userId },
    include: { kpiDepartment: true },
  });
  if (!employee?.kpiDepartmentId) throw new Error("Assign this employee to a KPI department first");
  const template = await prisma.kpiTemplate.findFirst({
    where: { departmentId: employee.kpiDepartmentId, active: true },
    include: { items: { where: { active: true }, orderBy: [{ parentItemId: "asc" }, { sortOrder: "asc" }] } },
    orderBy: { version: "desc" },
  });
  const taskItems = template?.items.filter((item) => item.itemKind === "TASK") ?? [];
  if (!template || taskItems.length === 0) throw new Error("This department has no active KPI tasks");
  const templateTotal = taskItems.reduce((sum, item) => sum + item.weightage, 0);
  if (Math.round(templateTotal * 100) / 100 !== 100) {
    throw new Error(`Template task weightage must total 100%. Current total: ${templateTotal}`);
  }
  const month = monthStart(monthValue);
  const existing = await prisma.kpiReview.findUnique({
    where: { userId_month: { userId, month } },
  });
  if (existing) throw new Error("A KPI review already exists for this employee and month");
  const snapshotItems: TemplateItemSnapshot[] = template.items.map((item) => ({
    id: item.id,
    parentItemId: item.parentItemId,
    itemKind: item.itemKind,
    name: item.name,
    weightage: item.weightage,
    measurement: item.measurement,
    target: item.target,
    description: item.description,
    sortOrder: item.sortOrder,
  }));
  await prisma.$transaction(async (tx) => {
    const review = await tx.kpiReview.create({
      data: {
        userId,
        departmentId: employee.kpiDepartmentId!,
        templateId: template.id,
        month,
        createdById: session.user.id,
        templateSnapshot: {
          templateId: template.id,
          templateName: template.name,
          version: template.version,
          departmentName: employee.kpiDepartment?.name ?? "",
          items: snapshotItems,
        },
      },
    });
    const idMap = new Map<string, string>();
    for (const item of snapshotItems.filter((candidate) => candidate.itemKind === "CRITERION")) {
      const created = await tx.kpiReviewItem.create({
        data: {
          reviewId: review.id,
          templateItemId: item.id,
          itemKind: "CRITERION",
          name: item.name,
          weightage: 0,
          measurement: item.measurement,
          target: item.target,
          description: item.description,
          sortOrder: item.sortOrder,
        },
      });
      idMap.set(item.id, created.id);
    }
    const ungroupedCriterion = snapshotItems.some((item) => item.itemKind === "TASK" && !item.parentItemId)
      ? await tx.kpiReviewItem.create({
          data: {
            reviewId: review.id,
            itemKind: "CRITERION",
            name: "General KPI",
            weightage: 0,
            measurement: "",
            target: "",
            sortOrder: 0,
          },
        })
      : null;
    for (const item of snapshotItems.filter((candidate) => candidate.itemKind === "TASK")) {
      await tx.kpiReviewItem.create({
        data: {
          reviewId: review.id,
          templateItemId: item.id,
          parentItemId: item.parentItemId ? idMap.get(item.parentItemId) : ungroupedCriterion?.id,
          itemKind: "TASK",
          name: item.name,
          weightage: item.weightage,
          measurement: item.measurement,
          target: item.target,
          description: item.description,
          sortOrder: item.sortOrder,
        },
      });
    }
  });
  refreshKpiPaths();
}

export async function saveKpiReviewScoresAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const reviewId = text(formData, "reviewId");
  if (!reviewId) throw new Error("Missing review");
  await persistDraftScores(reviewId, formData);
  refreshKpiPaths();
}

export async function finalizeKpiReviewAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const reviewId = text(formData, "reviewId");
  if (!reviewId) throw new Error("Missing review");
  await persistDraftScores(reviewId, formData);
  const review = await prisma.kpiReview.findUnique({
    where: { id: reviewId },
    include: { items: true },
  });
  if (!review) throw new Error("Review not found");
  const taskItems = review.items.filter((item) => item.itemKind === "TASK" && item.assignedToEmployee);
  if (taskItems.length === 0) {
    throw new Error("Assign at least one KPI task before finalizing");
  }
  if (taskItems.some((item) => !item.rating || item.rating < 1 || item.rating > 5)) {
    throw new Error("All KPI tasks need a 1-5 rating before finalizing");
  }
  await recalculateReview(reviewId);
  await prisma.kpiReview.update({
    where: { id: reviewId },
    data: {
      status: "FINALIZED",
      finalizedById: session.user.id,
      finalizedAt: new Date(),
    },
  });
  refreshKpiPaths();
}

export async function loadPreviousMonthKpiSetupAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const sourceReviewId = text(formData, "sourceReviewId");
  const targetUserId = text(formData, "targetUserId");
  const targetMonthValue = text(formData, "targetMonth");
  if (!sourceReviewId || !targetUserId || !targetMonthValue) throw new Error("Choose source, employee, and target month");
  const source = await prisma.kpiReview.findUnique({
    where: { id: sourceReviewId },
    include: { items: { orderBy: [{ parentItemId: "asc" }, { sortOrder: "asc" }] } },
  });
  const employee = await prisma.user.findUnique({ where: { id: targetUserId }, include: { kpiDepartment: true } });
  if (!source || !employee?.kpiDepartmentId) throw new Error("Cannot load KPI setup");
  const targetMonth = monthStart(targetMonthValue);
  const existing = await prisma.kpiReview.findUnique({ where: { userId_month: { userId: targetUserId, month: targetMonth } } });
  if (existing) throw new Error("Target month already has KPI data. Reopen/edit it instead of overwriting.");

  await prisma.$transaction(async (tx) => {
    const review = await tx.kpiReview.create({
      data: {
        userId: targetUserId,
        departmentId: employee.kpiDepartmentId!,
        templateId: source.templateId,
        month: targetMonth,
        createdById: session.user.id,
        templateSnapshot: source.templateSnapshot ?? {},
      },
    });
    const idMap = new Map<string, string>();
    for (const item of source.items.filter((candidate) => candidate.itemKind === "CRITERION")) {
      const created = await tx.kpiReviewItem.create({
        data: {
          reviewId: review.id,
          templateItemId: item.templateItemId,
          itemKind: "CRITERION",
          name: item.name,
          weightage: 0,
          measurement: item.measurement,
          target: item.target,
          description: item.description,
          sortOrder: item.sortOrder,
        },
      });
      idMap.set(item.id, created.id);
    }
    for (const item of source.items.filter((candidate) => candidate.itemKind === "TASK")) {
      await tx.kpiReviewItem.create({
        data: {
          reviewId: review.id,
          templateItemId: item.templateItemId,
          parentItemId: item.parentItemId ? idMap.get(item.parentItemId) : null,
          itemKind: "TASK",
          name: item.name,
          weightage: item.weightage,
          measurement: item.measurement,
          target: item.target,
          description: item.description,
          sortOrder: item.sortOrder,
        },
      });
    }
  });
  refreshKpiPaths();
}

export async function reopenKpiReviewAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const reviewId = text(formData, "reviewId");
  if (!reviewId) throw new Error("Missing review");
  await prisma.kpiReview.update({
    where: { id: reviewId },
    data: { status: "DRAFT", finalizedById: null, finalizedAt: null },
  });
  refreshKpiPaths();
}
