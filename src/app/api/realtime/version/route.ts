import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function maxTime(values: Array<Date | null | undefined>) {
  return values.reduce((max, value) => Math.max(max, value?.getTime() ?? 0), 0);
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ version: 0 }, { status: 401 });

  const [
    cycles,
    notifications,
    ratings,
    moms,
    arrears,
    salaryRevisions,
    users,
    reschedules,
  ] = await Promise.all([
    prisma.appraisalCycle.aggregate({ _max: { updatedAt: true } }),
    prisma.notification.aggregate({ where: { userId: session.user.id }, _max: { createdAt: true } }),
    prisma.rating.aggregate({ _max: { submittedAt: true } }),
    prisma.mOM.aggregate({ _max: { updatedAt: true } }),
    prisma.arrear.aggregate({ _max: { updatedAt: true } }),
    prisma.salaryRevision.aggregate({ _max: { createdAt: true } }),
    prisma.user.aggregate({ _max: { updatedAt: true } }),
    prisma.meetingReschedule.aggregate({ _max: { createdAt: true } }),
  ]);

  return NextResponse.json({
    version: maxTime([
      cycles._max.updatedAt,
      notifications._max.createdAt,
      ratings._max.submittedAt,
      moms._max.updatedAt,
      arrears._max.updatedAt,
      salaryRevisions._max.createdAt,
      users._max.updatedAt,
      reschedules._max.createdAt,
    ]),
  });
}
