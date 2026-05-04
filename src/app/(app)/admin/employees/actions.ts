"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { Role } from "@/generated/prisma/enums";

const ROLES: Role[] = ["ADMIN", "MANAGEMENT", "MANAGER", "HR", "TL", "EMPLOYEE", "REVIEWER", "PARTNER"];

function optStr() {
  return z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined));
}

function optInt() {
  return z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? parseInt(v, 10) : undefined))
    .refine((v) => v === undefined || !Number.isNaN(v), "Invalid number");
}

function optDate() {
  return z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? new Date(v) : undefined));
}

const basicSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  name: z.string().min(1),
  role: z.enum(ROLES as [Role, ...Role[]]),
  department: optStr(),
  joiningDate: z.string().min(1).transform((v) => new Date(v)),
  active: z.preprocess((v) => v === "on" || v === true || v === "true", z.boolean()),

  employeeNumber: optInt(),
  firstName: optStr(),
  lastName: optStr(),
  location: optStr(),
  fatherName: optStr(),
  designation: optStr(),
  zohoRole: optStr(),
  employmentType: optStr(),
  employeeStatus: optStr(),
  sourceOfHire: optStr(),
  reportingManagerId: optStr(),
  dob: optDate(),
  gender: optStr(),
  maritalStatus: optStr(),
  workPhone: optStr(),
  personalPhone: optStr(),
  personalEmail: optStr(),
  presentAddress: optStr(),
  permanentAddress: optStr(),
  aadhaar: optStr(),
  pan: optStr(),
  uan: optStr(),
  bankName: optStr(),
  bankAccount: optStr(),
  ifsc: optStr(),
  accountType: optStr(),
  stateCode: optStr(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) throw new Error("Forbidden");
  return session;
}

function fd(formData: FormData): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export async function createEmployeeAction(formData: FormData) {
  await requireAdmin();
  const parsed = basicSchema.safeParse(fd(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  const d = parsed.data;
  const passwordHash = await bcrypt.hash("password123", 10);
  const created = await prisma.user.create({
    data: {
      email: d.email,
      name: d.name,
      role: d.role,
      department: d.department,
      joiningDate: d.joiningDate,
      active: d.active,
      passwordHash,
      employeeNumber: d.employeeNumber,
      firstName: d.firstName,
      lastName: d.lastName,
      location: d.location,
      fatherName: d.fatherName,
      designation: d.designation,
      zohoRole: d.zohoRole,
      employmentType: d.employmentType,
      employeeStatus: d.employeeStatus,
      sourceOfHire: d.sourceOfHire,
      reportingManagerId: d.reportingManagerId,
      dob: d.dob,
      gender: d.gender,
      maritalStatus: d.maritalStatus,
      workPhone: d.workPhone,
      personalPhone: d.personalPhone,
      personalEmail: d.personalEmail,
      presentAddress: d.presentAddress,
      permanentAddress: d.permanentAddress,
      aadhaar: d.aadhaar,
      pan: d.pan,
      uan: d.uan,
      bankName: d.bankName,
      bankAccount: d.bankAccount,
      ifsc: d.ifsc,
      accountType: d.accountType,
      stateCode: d.stateCode,
    },
  });
  revalidatePath("/admin/employees");
  redirect(`/admin/employees/${created.id}`);
}

export async function updateEmployeeAction(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = basicSchema.safeParse(fd(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  const d = parsed.data;
  await prisma.user.update({
    where: { id },
    data: {
      email: d.email,
      name: d.name,
      role: d.role,
      department: d.department,
      joiningDate: d.joiningDate,
      active: d.active,
      employeeNumber: d.employeeNumber ?? null,
      firstName: d.firstName ?? null,
      lastName: d.lastName ?? null,
      location: d.location ?? null,
      fatherName: d.fatherName ?? null,
      designation: d.designation ?? null,
      zohoRole: d.zohoRole ?? null,
      employmentType: d.employmentType ?? null,
      employeeStatus: d.employeeStatus ?? null,
      sourceOfHire: d.sourceOfHire ?? null,
      reportingManagerId: d.reportingManagerId ?? null,
      dob: d.dob ?? null,
      gender: d.gender ?? null,
      maritalStatus: d.maritalStatus ?? null,
      workPhone: d.workPhone ?? null,
      personalPhone: d.personalPhone ?? null,
      personalEmail: d.personalEmail ?? null,
      presentAddress: d.presentAddress ?? null,
      permanentAddress: d.permanentAddress ?? null,
      aadhaar: d.aadhaar ?? null,
      pan: d.pan ?? null,
      uan: d.uan ?? null,
      bankName: d.bankName ?? null,
      bankAccount: d.bankAccount ?? null,
      ifsc: d.ifsc ?? null,
      accountType: d.accountType ?? null,
      stateCode: d.stateCode ?? null,
    },
  });
  revalidatePath("/admin/employees");
  revalidatePath(`/admin/employees/${id}`);
  redirect(`/admin/employees/${id}`);
}

export async function deleteEmployeeAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") throw new Error("Missing id");
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/employees");
  redirect("/admin/employees");
}

const salarySchema = z.object({
  grossAnnum: z.string().transform((v) => Number(v || 0)),
  ctcAnnum: z.string().transform((v) => Number(v || 0)),
  basic: z.string().transform((v) => Number(v || 0)),
  hra: z.string().transform((v) => Number(v || 0)),
  conveyance: z.string().transform((v) => Number(v || 0)),
  transport: z.string().transform((v) => Number(v || 0)),
  travelling: z.string().transform((v) => Number(v || 0)),
  fixedAllowance: z.string().transform((v) => Number(v || 0)),
  stipend: z.string().transform((v) => Number(v || 0)),
});

export async function upsertSalaryAction(userId: string, formData: FormData) {
  await requireAdmin();
  const parsed = salarySchema.safeParse(fd(formData));
  if (!parsed.success) throw new Error("Invalid salary");
  const d = parsed.data;
  await prisma.employeeSalary.upsert({
    where: { userId },
    update: d,
    create: { userId, ...d },
  });
  await prisma.user.update({ where: { id: userId }, data: { currentSalary: d.grossAnnum } });
  revalidatePath(`/admin/employees/${userId}`);
  redirect(`/admin/employees/${userId}`);
}

export async function deleteSalaryAction(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId");
  if (typeof userId !== "string") throw new Error("Missing userId");
  await prisma.employeeSalary.deleteMany({ where: { userId } });
  revalidatePath(`/admin/employees/${userId}`);
  redirect(`/admin/employees/${userId}`);
}

export async function toggleActiveAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const active = formData.get("active") === "true";
  if (!id) throw new Error("Missing id");
  await prisma.user.update({ where: { id }, data: { active: !active } });
  revalidatePath(`/admin/employees/${id}`);
  revalidatePath("/admin/employees");
}
