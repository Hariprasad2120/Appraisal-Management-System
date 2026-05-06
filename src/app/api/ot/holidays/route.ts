import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
  const year = searchParams.get("year");

  const where = year
    ? {
        holidayDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      }
    : {};

  const holidays = await prisma.holiday.findMany({
    where,
    orderBy: { holidayDate: "asc" },
  });
  return NextResponse.json(holidays);
}

const holidaySchema = z.object({
  holidayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  holidayName: z.string().min(1).max(255),
  holidayType: z.enum(["NATIONAL", "COMPANY", "RESTRICTED", "WEEKEND"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminOrHR(session.user.role, session.user.secondaryRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = holidaySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const holiday = await prisma.holiday.create({
      data: {
        holidayDate: new Date(parsed.data.holidayDate),
        holidayName: parsed.data.holidayName,
        holidayType: parsed.data.holidayType,
      },
    });
    return NextResponse.json(holiday, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Holiday already exists for this date and type" }, { status: 409 });
  }
}
