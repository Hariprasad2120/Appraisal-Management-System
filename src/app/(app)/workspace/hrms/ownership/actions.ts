"use server";

import { revalidatePath, refresh } from "next/cache";
import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canBeAppraised } from "@/lib/rbac";

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

function refreshPaths() {
  revalidatePath("/workspace/hrms/ownership");
  revalidatePath("/workspace/hrms/employees");
  revalidatePath("/reviewer/kpi");
  refresh();
}

export async function assignEmployeesToTlAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const tlId = text(formData, "tlId");
  const employeeIds = formData
    .getAll("employeeId")
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  if (!tlId) throw new Error("Choose a TL");
  const tl = await prisma.user.findUnique({
    where: { id: tlId },
    select: { id: true, role: true, active: true },
  });
  if (!tl || tl.role !== "TL" || !tl.active) throw new Error("Choose an active TL");
  if (employeeIds.length === 0) throw new Error("Choose at least one employee");

  const eligible = await prisma.user.findMany({
    where: { id: { in: employeeIds }, active: true },
    select: { id: true, role: true },
  });
  const eligibleIds = eligible.filter((e) => canBeAppraised(e.role)).map((e) => e.id);
  if (eligibleIds.length !== employeeIds.length) {
    throw new Error("Only active appraisable employees can be assigned to a TL");
  }
  await prisma.user.updateMany({
    where: { id: { in: eligibleIds } },
    data: { reportingManagerId: tlId },
  });
  refreshPaths();
}

export async function unassignEmployeeFromTlAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const employeeId = text(formData, "employeeId");
  if (!employeeId) throw new Error("Missing employee");
  await prisma.user.update({
    where: { id: employeeId },
    data: { reportingManagerId: null },
  });
  refreshPaths();
}

export async function assignTlsToManagerAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const managerId = text(formData, "managerId");
  const tlIds = formData
    .getAll("tlId")
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  if (!managerId) throw new Error("Choose a Manager");
  const manager = await prisma.user.findUnique({
    where: { id: managerId },
    select: { id: true, role: true, active: true },
  });
  if (!manager || manager.role !== "MANAGER" || !manager.active) throw new Error("Choose an active Manager");
  if (tlIds.length === 0) throw new Error("Choose at least one TL");

  const tls = await prisma.user.findMany({
    where: { id: { in: tlIds }, role: "TL", active: true },
    select: { id: true },
  });
  if (tls.length !== tlIds.length) throw new Error("All selected users must be active TLs");

  await prisma.user.updateMany({
    where: { id: { in: tls.map((t) => t.id) } },
    data: { reportingManagerId: managerId },
  });
  refreshPaths();
}

export async function unassignTlFromManagerAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const tlId = text(formData, "tlId");
  if (!tlId) throw new Error("Missing TL");
  const tl = await prisma.user.findUnique({ where: { id: tlId }, select: { role: true } });
  if (!tl || tl.role !== "TL") throw new Error("Not a TL");
  await prisma.user.update({
    where: { id: tlId },
    data: { reportingManagerId: null },
  });
  refreshPaths();
}
