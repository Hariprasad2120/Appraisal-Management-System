import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { importLopRows } from "@/lib/ot-import";

function isAdminOrHR(role: string, secondary?: string | null) {
  return role === "ADMIN" || role === "HR" || secondary === "ADMIN" || secondary === "HR";
}

const bodySchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(10000),
  mappings: z.object({
    employeeNumber: z.string().optional(),
    employeeName: z.string().optional(),
    officialEmail: z.string().optional(),
    payrollMonth: z.string().optional(),
    lopDays: z.string().min(1),
    remarks: z.string().optional(),
  }),
  fallbackPayrollMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminOrHR(session.user.role, session.user.secondaryRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const mappings = parsed.data.mappings;
  if (!mappings.employeeNumber && !mappings.employeeName && !mappings.officialEmail) {
    return NextResponse.json(
      { error: "Map at least one employee field: Employee ID, Employee Name, or Email." },
      { status: 400 },
    );
  }

  const result = await importLopRows(
    parsed.data.rows,
    mappings,
    parsed.data.fallbackPayrollMonth,
  );
  return NextResponse.json(result);
}
