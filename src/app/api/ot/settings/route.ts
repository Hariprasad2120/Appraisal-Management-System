import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_COMPOFF_SLABS } from "@/lib/ot";
import { z } from "zod";

function isAdminOrHR(role: string, secondary?: string | null) {
  return role === "ADMIN" || role === "HR" || secondary === "ADMIN" || secondary === "HR";
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminOrHR(session.user.role, session.user.secondaryRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const settings = await prisma.otSettings.findUnique({ where: { id: "default" } });
  if (!settings) {
    return NextResponse.json({
      standardHoursPerDay: 8,
      otRatePerHour: 100,
      compOffSlabs: DEFAULT_COMPOFF_SLABS,
      graceMinutes: 15,
      requiresWorkReport: false,
    });
  }
  return NextResponse.json({
    standardHoursPerDay: Number(settings.standardHoursPerDay),
    otRatePerHour: Number(settings.otRatePerHour),
    compOffSlabs: settings.compOffSlabs,
    graceMinutes: settings.graceMinutes,
    requiresWorkReport: settings.requiresWorkReport,
  });
}

const settingsSchema = z.object({
  standardHoursPerDay: z.number().min(1).max(24),
  otRatePerHour: z.number().min(0),
  compOffSlabs: z.array(z.object({ minHours: z.number(), compOffDays: z.number() })),
  graceMinutes: z.number().min(0).max(120).optional(),
  requiresWorkReport: z.boolean().optional(),
});

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminOrHR(session.user.role, session.user.secondaryRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const settings = await prisma.otSettings.upsert({
    where: { id: "default" },
    update: {
      standardHoursPerDay: data.standardHoursPerDay,
      otRatePerHour: data.otRatePerHour,
      compOffSlabs: data.compOffSlabs,
      graceMinutes: data.graceMinutes ?? 15,
      requiresWorkReport: data.requiresWorkReport ?? false,
      updatedById: session.user.id,
    },
    create: {
      id: "default",
      standardHoursPerDay: data.standardHoursPerDay,
      otRatePerHour: data.otRatePerHour,
      compOffSlabs: data.compOffSlabs,
      graceMinutes: data.graceMinutes ?? 15,
      requiresWorkReport: data.requiresWorkReport ?? false,
      updatedById: session.user.id,
    },
  });
  return NextResponse.json(settings);
}
