"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";

type ImportResult = { ok: true; message: string } | { ok: false; error: string };
type Row = Record<string, unknown>;

const ROLES = new Set(["ADMIN", "HR", "EMPLOYEE", "REVIEWER", "MANAGER", "MANAGEMENT", "PARTNER"]);
const ACCOUNT_STATUSES = new Set(["Pending", "Active", "Disabled"]);

function requireImportDefaultPassword() {
  const password = process.env.IMPORT_DEFAULT_PASSWORD?.trim();
  if (!password) {
    throw new Error("IMPORT_DEFAULT_PASSWORD must be set before importing fresh data.");
  }
  return password;
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) {
    throw new Error("Forbidden");
  }
  return session;
}

function sheet(wb: XLSX.WorkBook, name: string): Row[] {
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`Missing sheet: ${name}`);
  return XLSX.utils.sheet_to_json<Row>(ws, { defval: "" });
}

function value(row: Row, key: string) {
  return String(row[key] ?? "").trim();
}

function required(row: Row, key: string) {
  const v = value(row, key);
  if (!v) throw new Error(`Missing required field: ${key}`);
  return v;
}

function email(row: Row, key: string) {
  const v = value(row, key).toLowerCase();
  if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Error(`Invalid email in ${key}: ${v}`);
  return v;
}

function boolYes(row: Row, key: string) {
  return value(row, key).toLowerCase() === "yes";
}

function dateValue(row: Row, key: string) {
  const raw = row[key];
  if (raw instanceof Date) return raw;
  if (typeof raw === "number") {
    const parsed = XLSX.SSF.parse_date_code(raw);
    return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  const d = new Date(required(row, key));
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date in ${key}`);
  return d;
}

function employeeNumber(employeeId: string) {
  const numeric = Number(employeeId);
  return Number.isInteger(numeric) ? numeric : undefined;
}

export async function importWorkbookAction(formData: FormData): Promise<ImportResult> {
  const session = await requireAdmin();
  const file = formData.get("workbook");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an .xlsx workbook to import." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const users = sheet(wb, "Users");
    const accessRows = sheet(wb, "Login Access");
    sheet(wb, "Eligibility");
    sheet(wb, "Reviewer Assignment");
    sheet(wb, "Criteria Questions");
    sheet(wb, "Salary Arrear");

    const ids = new Set<string>();
    const emails = new Set<string>();
    for (const row of users) {
      const employeeId = required(row, "employee_id");
      const officialEmail = email(row, "official_email");
      const role = required(row, "role").toUpperCase();
      if (ids.has(employeeId)) throw new Error(`Duplicate employee_id: ${employeeId}`);
      if (emails.has(officialEmail)) throw new Error(`Duplicate official_email: ${officialEmail}`);
      if (!ROLES.has(role)) throw new Error(`Invalid role for ${employeeId}: ${role}`);
      ids.add(employeeId);
      emails.add(officialEmail);
    }

    const accessByEmployee = new Map(accessRows.map((row) => [required(row, "employee_id"), row]));
    const defaultPasswordHash = await bcrypt.hash(requireImportDefaultPassword(), 10);

    let imported = 0;
    for (const row of users) {
      const employeeId = required(row, "employee_id");
      const access = accessByEmployee.get(employeeId);
      if (!access) throw new Error(`Missing Login Access row for ${employeeId}`);
      const officialEmail = email(row, "official_email");
      const role = required(row, "role").toUpperCase() as Role;
      const accountStatus = required(access, "account_status");
      if (!ACCOUNT_STATUSES.has(accountStatus)) {
        throw new Error(`Invalid account_status for ${employeeId}: ${accountStatus}`);
      }

      await prisma.user.upsert({
        where: { email: officialEmail },
        update: {
          name: required(row, "full_name"),
          emailNormalized: officialEmail,
          role,
          department: required(row, "department"),
          designation: required(row, "designation"),
          joiningDate: dateValue(row, "date_of_joining"),
          employmentType: required(row, "employment_type"),
          employeeStatus: required(row, "status"),
          active: accountStatus === "Active",
          status: accountStatus === "Active" ? "ACTIVE" : "SUSPENDED",
          googleLoginAllowed: boolYes(access, "google_login_allowed"),
          passkeySetupRequired: boolYes(access, "force_passkey_setup") || boolYes(access, "passkey_required"),
          personalEmail: email(row, "personal_email") || null,
          personalPhone: value(row, "phone_number") || null,
          employeeNumber: employeeNumber(employeeId),
        },
        create: {
          email: officialEmail,
          emailNormalized: officialEmail,
          passwordHash: defaultPasswordHash,
          name: required(row, "full_name"),
          role,
          department: required(row, "department"),
          designation: required(row, "designation"),
          joiningDate: dateValue(row, "date_of_joining"),
          employmentType: required(row, "employment_type"),
          employeeStatus: required(row, "status"),
          active: accountStatus === "Active",
          status: accountStatus === "Active" ? "ACTIVE" : "SUSPENDED",
          googleLoginAllowed: boolYes(access, "google_login_allowed"),
          passkeySetupRequired: true,
          personalEmail: email(row, "personal_email") || null,
          personalPhone: value(row, "phone_number") || null,
          employeeNumber: employeeNumber(employeeId),
        },
      });
      imported++;
    }

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "FRESH_DATA_IMPORT",
        after: { fileName: file.name, importedUsers: imported },
      },
    });

    revalidatePath("/ams/admin/data-tools");
    revalidatePath("/workspace/hrms/employees");
    return { ok: true, message: `Imported ${imported} users from ${file.name}.` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Import failed." };
  }
}
