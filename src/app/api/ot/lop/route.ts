import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";
import { z } from "zod";

function isAdminOrHR(role: string, secondary?: string | null) {
  return role === "ADMIN" || role === "HR" || secondary === "ADMIN" || secondary === "HR";
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminOrHR(session.user.role, session.user.secondaryRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");

  const where: Record<string, unknown> = {};
  if (month) {
    const [y, m] = month.split("-").map(Number);
    where.payrollMonth = new Date(y, m - 1, 1);
  }

  const records = await prisma.employeeLop.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, employeeNumber: true, department: true } },
    },
    orderBy: [{ payrollMonth: "desc" }, { employee: { name: "asc" } }],
  });

  return NextResponse.json(records);
}

const lopSchema = z.object({
  employeeId: z.string(),
  payrollMonth: z.string().regex(/^\d{4}-\d{2}$/),
  lopDays: z.number().min(0).max(31),
  remarks: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminOrHR(session.user.role, session.user.secondaryRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = lopSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [y, m] = parsed.data.payrollMonth.split("-").map(Number);
  const payrollMonth = new Date(y, m - 1, 1);
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;

  const record = await prisma.employeeLop.upsert({
    where: {
      organizationId_employeeId_payrollMonth: {
        organizationId,
        employeeId: parsed.data.employeeId,
        payrollMonth,
      },
    },
    update: {
      lopDays: parsed.data.lopDays,
      remarks: parsed.data.remarks ?? null,
    },
    create: {
      organizationId,
      employeeId: parsed.data.employeeId,
      payrollMonth,
      lopDays: parsed.data.lopDays,
      remarks: parsed.data.remarks ?? null,
      createdById: session.user.id,
    },
  });

  return NextResponse.json(record);
}
