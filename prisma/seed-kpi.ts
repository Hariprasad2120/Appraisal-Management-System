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
  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
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

  const [departmentCount, templateCount, itemCount, assignedCount] = await Promise.all([
    prisma.kpiDepartment.count(),
    prisma.kpiTemplate.count(),
    prisma.kpiTemplateItem.count(),
    prisma.user.count({ where: { kpiDepartmentId: { not: null } } }),
  ]);
  console.log(`KPI seed complete: ${departmentCount} departments, ${templateCount} templates, ${itemCount} items, ${assignedCount} assigned employees.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    prisma.$disconnect();
    process.exit(1);
  });
