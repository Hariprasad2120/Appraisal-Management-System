import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processMonthOT } from "@/lib/ot";
import { z } from "zod";

function isAdminOrHR(role: string, secondary?: string | null) {
  return role === "ADMIN" || role === "HR" || secondary === "ADMIN" || secondary === "HR";
}

const processSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminOrHR(session.user.role, session.user.secondaryRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = processSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [y, m] = parsed.data.month.split("-").map(Number);
  const monthDate = new Date(y, m - 1, 1);

  const result = await processMonthOT(monthDate);
  return NextResponse.json(result);
}
