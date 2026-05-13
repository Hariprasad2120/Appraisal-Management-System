import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  DEFAULT_KPI_ANNUAL_TARGET,
  DEFAULT_KPI_MONTHLY_TARGET,
  DEFAULT_KPI_RATING_SCALE,
  KPI_ANNUAL_TARGET_SETTING,
  KPI_BUSINESS_DEPARTMENTS,
  KPI_MONTHLY_TARGET_SETTING,
  KPI_RATING_SCALE_SETTING,
  KPI_SEED_DEPARTMENTS,
  LEGACY_KPI_DEPARTMENT_REDIRECTS,
  type KpiSeedItem,
} from "../src/lib/kpi";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function upsertSetting(key: string, value: string) {
  const existing = await prisma.systemSetting.findFirst({
    where: { organizationId: "default-org", key },
    select: { id: true },
  });
  if (existing) {
    await prisma.systemSetting.update({ where: { id: existing.id }, data: { value } });
    return;
  }
  await prisma.systemSetting.create({
    data: { organizationId: "default-org", key, value },
  });
}

async function ensureTemplate(departmentId: string, departmentName: string, items: KpiSeedItem[]) {
  let template = await prisma.kpiTemplate.findFirst({
    where: { departmentId, active: true },
    orderBy: { version: "desc" },
  });
  if (!template) {
    template = await prisma.kpiTemplate.create({
      data: { departmentId, name: `${departmentName} KPI Template`, version: 1, active: true },
    });
  }
  const desiredNames = items.map((item) => item.name);
  await prisma.kpiTemplateItem.updateMany({
    where: { templateId: template.id, name: { notIn: desiredNames } },
    data: { active: false },
  });
  for (const [index, item] of items.entries()) {
    const existing = await prisma.kpiTemplateItem.findFirst({
      where: { templateId: template.id, name: item.name },
    });
    const data = {
      weightage: item.weightage,
      measurement: item.measurement,
      target: item.target,
      active: true,
      sortOrder: index + 1,
    };
    if (existing) {
      await prisma.kpiTemplateItem.update({ where: { id: existing.id }, data });
    } else {
      await prisma.kpiTemplateItem.create({
        data: { templateId: template.id, name: item.name, ...data },
      });
    }
  }
}

async function main() {
  await upsertSetting(KPI_MONTHLY_TARGET_SETTING, String(DEFAULT_KPI_MONTHLY_TARGET));
  await upsertSetting(KPI_ANNUAL_TARGET_SETTING, String(DEFAULT_KPI_ANNUAL_TARGET));
  await upsertSetting(KPI_RATING_SCALE_SETTING, JSON.stringify(DEFAULT_KPI_RATING_SCALE));

  for (const [rootIndex, root] of KPI_SEED_DEPARTMENTS.entries()) {
    const existingRoot = await prisma.kpiDepartment.findFirst({
      where: { parentId: null, name: root.name },
    });
    const rootDepartment = existingRoot
      ? await prisma.kpiDepartment.update({
          where: { id: existingRoot.id },
          data: { active: true, sortOrder: rootIndex + 1 },
        })
      : await prisma.kpiDepartment.create({
          data: { name: root.name, sortOrder: rootIndex + 1 },
        });
    if (root.items) await ensureTemplate(rootDepartment.id, root.name, root.items);
  }

  const rootDepartments = await prisma.kpiDepartment.findMany({
    where: { parentId: null, name: { in: [...KPI_BUSINESS_DEPARTMENTS] } },
    include: { templates: { where: { active: true }, orderBy: { version: "desc" }, take: 1 } },
  });
  const rootByName = new Map(rootDepartments.map((department) => [department.name, department]));

  for (const [legacyName, targetName] of Object.entries(LEGACY_KPI_DEPARTMENT_REDIRECTS)) {
    const target = rootByName.get(targetName);
    const targetTemplate = target?.templates[0];
    if (!target || !targetTemplate) continue;
    const legacyDepartments = await prisma.kpiDepartment.findMany({ where: { name: legacyName } });
    for (const legacy of legacyDepartments) {
      await prisma.user.updateMany({
        where: { kpiDepartmentId: legacy.id },
        data: { kpiDepartmentId: target.id },
      });
      await prisma.kpiReview.updateMany({
        where: { departmentId: legacy.id },
        data: { departmentId: target.id, templateId: targetTemplate.id },
      });
      await prisma.kpiTemplate.deleteMany({ where: { departmentId: legacy.id } });
      await prisma.kpiDepartment.delete({ where: { id: legacy.id } }).catch(async () => {
        await prisma.kpiDepartment.update({ where: { id: legacy.id }, data: { active: false, parentId: null } });
      });
    }
  }

  const allowedRootNames = [...KPI_BUSINESS_DEPARTMENTS];
  const extraDepartments = await prisma.kpiDepartment.findMany({
    where: {
      OR: [
        { parentId: { not: null } },
        { parentId: null, name: { notIn: allowedRootNames } },
      ],
    },
  });
  const administration = rootByName.get("Administration");
  const administrationTemplate = administration?.templates[0];
  for (const extra of extraDepartments) {
    await prisma.user.updateMany({
      where: { kpiDepartmentId: extra.id },
      data: { kpiDepartmentId: administration?.id ?? null },
    });
    if (administration && administrationTemplate) {
      await prisma.kpiReview.updateMany({
        where: { departmentId: extra.id },
        data: { departmentId: administration.id, templateId: administrationTemplate.id },
      });
    }
    await prisma.kpiTemplate.deleteMany({ where: { departmentId: extra.id } }).catch(() => {});
    await prisma.kpiDepartment.delete({ where: { id: extra.id } }).catch(async () => {
      await prisma.kpiDepartment.update({ where: { id: extra.id }, data: { active: false, parentId: null } });
    });
  }

  const kpiDepartments = await prisma.kpiDepartment.findMany();
  const kpiByName = new Map(kpiDepartments.map((department) => [department.name, department.id]));
  const assignRules: { match: string; department: string }[] = [
    { match: "Human Resource", department: "HR" },
    { match: "Head of HR", department: "HR" },
    { match: "HR", department: "HR" },
    { match: "Accounts", department: "Accounts" },
    { match: "Freight Forwarding", department: "Freight Forwarding" },
    { match: "Custom Broker", department: "Custom Clearance" },
    { match: "Customs Broker", department: "Custom Clearance" },
    { match: "CFS Operations", department: "Custom Clearance" },
    { match: "Delivery Order", department: "Custom Clearance" },
    { match: "Administration", department: "Administration" },
  ];
  for (const rule of assignRules) {
    const kpiDepartmentId = kpiByName.get(rule.department);
    if (!kpiDepartmentId) continue;
    await prisma.user.updateMany({
      where: {
        role: { notIn: ["ADMIN", "MANAGEMENT", "PARTNER"] },
        department: { contains: rule.match, mode: "insensitive" },
      },
      data: { kpiDepartmentId },
    });
  }

  // Seed Accounts KPI criteria.
  await seedAccountsCriteria();

  const [departmentCount, templateCount, itemCount, assignedCount] = await Promise.all([
    prisma.kpiDepartment.count(),
    prisma.kpiTemplate.count(),
    prisma.kpiTemplateItem.count(),
    prisma.user.count({ where: { kpiDepartmentId: { not: null } } }),
  ]);
  console.log(`KPI seed complete: ${departmentCount} departments, ${templateCount} templates, ${itemCount} items, ${assignedCount} assigned employees.`);
}

async function seedAccountsCriteria() {
  const accountsDept = await prisma.kpiDepartment.findFirst({
    where: { parentId: null, name: "Accounts" },
  });
  if (!accountsDept) {
    console.warn("Accounts department not found — skipping criteria seed.");
    return;
  }

  // Find a seed admin user to credit as creator
  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (!adminUser) {
    console.warn("No ADMIN user found — skipping Accounts criteria seed.");
    return;
  }

  const ACCOUNTS_CRITERIA = [
    // Phase 6 — Invoice Turnaround Time (TURNAROUND_TIME)
    {
      name: "Invoice Turnaround Time",
      description: "Bill Creation turnaround measured in working hours from assignment to employee submission, excluding approved pauses and TL review time.",
      weightage: 40,
      ruleType: "TURNAROUND_TIME" as const,
      ruleConfig: {
        version: 1,
        taskExamples: ["Bill Creation"],
        createdByRole: "ADMIN",
        taskAssignedByRole: "TL",
        requiresFileUpload: true,
        timerUnit: "WORKING_MINUTES",
        timerStartsAfterAssignmentGrace: true,
        timerFreezesDuringReview: true,
        tlReviewDelayCounts: false,
        pauseRequiresTlApproval: true,
        tlDirectPauseAllowed: true,
        reopenResumesFromPreviousElapsedWorkingTime: true,
        partialCompletionMultiplier: 0.5,
        dailyAggregation: "AVERAGE_TASK_RATINGS_FOR_ASSIGNED_DAYS",
        monthlyAggregation: "AVERAGE_DAILY_RATINGS_WITH_TASKS_ONLY",
        bands: [
          { maxHours: 12, rating: 5 },
          { maxHours: 24, rating: 4 },
          { maxHours: 48, rating: 3 },
          { maxHours: 72, rating: 2 },
        ],
        bandDescriptions: [
          "0 to 12 working hours = 5",
          ">12 to 24 working hours = 4",
          ">24 to 48 working hours = 3",
          ">48 to 72 working hours = 2",
          ">72 working hours = 1",
        ],
        minRating: 1,
        graceMinutes: 30,
      },
    },
    // Phase 7 - Statutory Compliance (DUE_DATE)
    {
      name: "Statutory Compliance",
      description: "Compliance proof submitted against statutory due dates. Rated by submission date, with pending TL review time excluded from employee rating.",
      weightage: 35,
      ruleType: "DUE_DATE" as const,
      ruleConfig: {
        version: 1,
        taskExamples: ["GST Filing", "TDS Filing", "PF/ESI Filing", "Professional Tax Filing"],
        createdByRole: "ADMIN",
        taskAssignedByRole: "TL",
        requiresFileUpload: true,
        employeeRemarksRequired: true,
        timerFreezesDuringReview: true,
        tlReviewDelayCounts: false,
        allowTlReopen: true,
        partialCompletionMultiplier: 0.5,
        storeSystemAndFinalRating: true,
        dayCountModeDefault: "WORKING_DAYS",
        dayCountModeSetting: "kpi.accounts.statutoryCompliance.dayCountMode",
        allowedDayCountModes: ["WORKING_DAYS", "CALENDAR_DAYS"],
        reportingMonthBasis: "DUE_MONTH",
        aggregationRecommendation: "COUNT_UNDER_DUE_MONTH",
        earlyDaysForMax: 5,
        onDayRating: 4,
        lateDeductionPerDay: 1,
        minRating: 1,
        examples: [
          "Due 30 May, submitted on or before 25 May = 5",
          "Due 30 May, submitted on 30 May = 4",
          "1 day late = 3",
          "2 days late = 2",
          "3 or more days late = 1",
        ],
      },
    },
    // Phase 8 - Financial Reports (RECURRING_WEEKLY_DUE_DATE)
    {
      name: "Financial Reports",
      description: "Weekly financial summary reports auto-opened every Monday and due Friday before office closing time.",
      weightage: 25,
      ruleType: "RECURRING_WEEKLY_DUE_DATE" as const,
      ruleConfig: {
        version: 1,
        taskExamples: ["Weekly Financial Summary"],
        createdByRole: "ADMIN",
        assignmentConfiguredByRoles: ["ADMIN", "TL"],
        assignmentMode: "EMPLOYEE_OR_GROUP",
        autoGeneration: {
          enabled: true,
          openWeekday: 1,
          dueWeekday: 5,
          dueTimeSource: "WORKING_CALENDAR_WORK_END_TIME",
          developmentTrigger: "GENERATE_ON_KPI_PAGE_LOAD_OR_ADMIN_ACTION",
          productionTriggerEnv: "KPI_WEEKLY_TASK_CRON_ENABLED",
          paidBackgroundServiceRequired: false,
        },
        requiresFileUpload: true,
        employeeRemarksRequired: true,
        timerFreezesDuringReview: true,
        tlReviewDelayCounts: false,
        allowTlReopen: true,
        partialCompletionMultiplier: 0.5,
        dayCountModeDefault: "WORKING_DAYS",
        weekday: 5,
        dueWeekday: 5,
        dueTime: "OFFICE_CLOSING",
        maxRating: 5,
        nextWorkingDayRating: 4,
        deductionPerDay: 1,
        minRating: 1,
        examples: [
          "Friday before office closing = 5",
          "Saturday before office closing = 4",
          "Monday before office closing = 3, assuming Sunday is non-working",
          "Tuesday before office closing = 2",
          "Later = 1",
        ],
      },
    },
  ];

  for (const crit of ACCOUNTS_CRITERIA) {
    const existing = await prisma.kpiCriterion.findFirst({
      where: { departmentId: accountsDept.id, name: crit.name },
    });
    if (existing) {
      await prisma.kpiCriterion.update({
        where: { id: existing.id },
        data: {
          description: crit.description,
          weightage: crit.weightage,
          ruleType: crit.ruleType,
          ruleConfig: crit.ruleConfig,
          status: "ACTIVE",
        },
      });
      console.log(`  Updated criterion: ${crit.name}`);
    } else {
      await prisma.kpiCriterion.create({
        data: {
          name: crit.name,
          description: crit.description,
          departmentId: accountsDept.id,
          weightage: crit.weightage,
          ruleType: crit.ruleType,
          ruleConfig: crit.ruleConfig,
          status: "ACTIVE",
          approvalStatus: "PENDING",
          createdById: adminUser.id,
        },
      });
      console.log(`  Created criterion: ${crit.name}`);
    }
  }
  console.log("Accounts KPI Phase 6-8 criteria seeded.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    prisma.$disconnect();
    process.exit(1);
  });
