import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generatePayrollSummary } from "@/lib/ot";

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
  if (!month) return NextResponse.json({ error: "month is required (YYYY-MM)" }, { status: 400 });

  const [y, m] = month.split("-").map(Number);
  const monthDate = new Date(y, m - 1, 1);

  const summary = await generatePayrollSummary(monthDate);
  return NextResponse.json(summary);
}
