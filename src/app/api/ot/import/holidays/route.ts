import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { importHolidayRows } from "@/lib/ot-import";

function isAdminOrHR(role: string, secondary?: string | null) {
  return role === "ADMIN" || role === "HR" || secondary === "ADMIN" || secondary === "HR";
}

const bodySchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(5000),
  mappings: z.object({
    holidayDate: z.string().min(1),
    holidayName: z.string().optional(),
    holidayType: z.string().optional(),
  }),
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

  const result = await importHolidayRows(parsed.data.rows, parsed.data.mappings);
  return NextResponse.json(result);
}
