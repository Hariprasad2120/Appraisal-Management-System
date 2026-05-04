import "dotenv/config";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Role } from "../src/generated/prisma/enums";

const workbookPath = process.argv[2];
if (!workbookPath) throw new Error("Usage: npm run db:import:fresh -- ./company-data.xlsx");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const ROLES = new Set(["ADMIN", "HR", "EMPLOYEE", "REVIEWER", "MANAGER", "MANAGEMENT", "PARTNER"]);
const ACCOUNT_STATUSES = new Set(["Pending", "Active", "Disabled"]);

type Row = Record<string, unknown>;

function sheet(wb: XLSX.WorkBook, name: string): Row[] {
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`Missing sheet: ${name}`);
  return XLSX.utils.sheet_to_json<Row>(ws, { defval: "" });
}

function value(row: Row, key: string) {
  return String(row[key] ?? "").trim();
}

function email(row: Row, key: string) {
  const v = value(row, key).toLowerCase();
  if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Error(`Invalid email in ${key}: ${v}`);
  return v;
}

function required(row: Row, key: string) {
  const v = value(row, key);
  if (!v) throw new Error(`Missing required field: ${key}`);
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
  const v = required(row, key);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date in ${key}: ${v}`);
  return d;
}

function employeeNumber(employeeId: string) {
  const numeric = Number(employeeId);
  return Number.isInteger(numeric) ? numeric : undefined;
}

async function main() {
  const wb = XLSX.readFile(workbookPath, { cellDates: true });
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
  const defaultPasswordHash = await bcrypt.hash(process.env.IMPORT_DEFAULT_PASSWORD ?? "Welcome@12345", 10);

  let imported = 0;
  for (const row of users) {
    const employeeId = required(row, "employee_id");
    const access = accessByEmployee.get(employeeId);
    if (!access) throw new Error(`Missing Login Access row for ${employeeId}`);
    const officialEmail = email(row, "official_email");
    const role = required(row, "role").toUpperCase() as Role;
    const accountStatus = required(access, "account_status");
    if (!ACCOUNT_STATUSES.has(accountStatus)) throw new Error(`Invalid account_status for ${employeeId}: ${accountStatus}`);

    await prisma.user.upsert({
      where: { email: officialEmail },
      update: {
        name: required(row, "full_name"),
        role,
        department: required(row, "department"),
        designation: required(row, "designation"),
        joiningDate: dateValue(row, "date_of_joining"),
        employmentType: required(row, "employment_type"),
        employeeStatus: required(row, "status"),
        active: accountStatus === "Active",
        googleLoginAllowed: boolYes(access, "google_login_allowed"),
        passkeySetupRequired: boolYes(access, "force_passkey_setup") || boolYes(access, "passkey_required"),
        personalEmail: email(row, "personal_email") || null,
        personalPhone: value(row, "phone_number") || null,
        employeeNumber: employeeNumber(employeeId),
      },
      create: {
        email: officialEmail,
        passwordHash: defaultPasswordHash,
        name: required(row, "full_name"),
        role,
        department: required(row, "department"),
        designation: required(row, "designation"),
        joiningDate: dateValue(row, "date_of_joining"),
        employmentType: required(row, "employment_type"),
        employeeStatus: required(row, "status"),
        active: accountStatus === "Active",
        googleLoginAllowed: boolYes(access, "google_login_allowed"),
        passkeySetupRequired: true,
        personalEmail: email(row, "personal_email") || null,
        personalPhone: value(row, "phone_number") || null,
        employeeNumber: employeeNumber(employeeId),
      },
    });
    imported++;
  }

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  if (admin) {
    await prisma.auditLog.create({
      data: { actorId: admin.id, action: "FRESH_DATA_IMPORT", after: { workbookPath, importedUsers: imported } },
    });
  }
  console.log(`Validated workbook and imported ${imported} users.`);
}

main().finally(() => prisma.$disconnect());
