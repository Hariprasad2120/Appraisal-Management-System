import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function isAdminOrHR(role: string, secondary?: string | null) {
  return role === "ADMIN" || role === "HR" || secondary === "ADMIN" || secondary === "HR";
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminOrHR(session.user.role, session.user.secondaryRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const employees = await prisma.user.findMany({
    where: { active: true, role: { notIn: ["MANAGEMENT", "PARTNER"] } },
    select: { id: true, name: true, employeeNumber: true, department: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(employees);
}
