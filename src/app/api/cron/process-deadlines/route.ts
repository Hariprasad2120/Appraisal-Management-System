import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addBusinessDays } from "@/lib/business-days";
import { syncCycleStatus } from "@/lib/workflow";
import { appraisalDueEmail, sendEmail } from "@/lib/email";
import { getAppraisalEligibility } from "@/lib/appraisal-eligibility";

/**
 * Called to process deadline events:
 * 1. When 3-biz-day self-assessment edit window closes → notify reviewers + dept managers + TL
 * 2. When rating deadline passes → notify for extension if no rating submitted
 *
 * In production: call this via a cron job (e.g. Vercel cron, GitHub Actions).
 * In development: accessible at /api/cron/process-deadlines
 */
export async function POST() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // --- 0. Appraisal month arrived — notify appraisees until admin assigns reviewers ---
  const appraisalUsers = await prisma.user.findMany({
    where: { role: { notIn: ["MANAGEMENT", "PARTNER", "ADMIN"] }, active: true },
    select: {
      id: true,
      name: true,
      email: true,
      joiningDate: true,
      cyclesAsEmployee: {
        where: {
          OR: [
            { status: { notIn: ["CLOSED", "DECIDED"] } },
            {
              status: { in: ["CLOSED", "DECIDED"] },
              startDate: { gte: monthStart, lt: nextMonthStart },
            },
          ],
        },
        select: { id: true, status: true },
      },
    },
  });

  let dueNotified = 0;
  for (const user of appraisalUsers) {
    const eligibility = getAppraisalEligibility(user.joiningDate, now);
    if (!eligibility.eligible) continue;
    if (user.cyclesAsEmployee.length > 0) continue;

    const existing = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        type: "APPRAISAL_MONTH_DUE",
        createdAt: { gte: monthStart, lt: nextMonthStart },
      },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "APPRAISAL_MONTH_DUE",
        message: `Your ${eligibility.cycleType.toLowerCase()} appraisal month has arrived. Admin will assign reviewers soon.`,
        link: "/ams/employee",
        persistent: true,
        critical: true,
      },
    });
    const loginUrl = `${process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/login`;
    const mail = appraisalDueEmail({ employeeName: user.name, cycleType: eligibility.cycleType, loginUrl });
    await sendEmail({ to: user.email, ...mail }).catch(() => {});
    dueNotified++;
  }

  // --- 1. Edit window closed — notify reviewers ---
  // Find cycles where self was submitted, edit window just passed, reviewers not yet notified
  const expiredSelfCycles = await prisma.appraisalCycle.findMany({
    where: {
      status: "SELF_SUBMITTED",
      self: {
        submittedAt: { not: null },
        editableUntil: { lte: now },
        locked: false,
      },
    },
    include: {
      self: true,
      user: { select: { name: true } },
      assignments: {
        include: { reviewer: { select: { id: true, name: true } } },
      },
    },
  });

  for (const cycle of expiredSelfCycles) {
    if (!cycle.self) continue;

    // Lock self-assessment
    await prisma.selfAssessment.update({
      where: { cycleId: cycle.id },
      data: { locked: true },
    });

    const editCount = cycle.self.editCount;
    const submittedAt = cycle.self.submittedAt?.toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    }) ?? "unknown";

    // Set rating deadline 3 business days after the self-assessment period closes.
    const ratingDeadline = addBusinessDays(cycle.self.editableUntil, 3);
    await prisma.appraisalCycle.update({
      where: { id: cycle.id },
      data: { ratingDeadline },
    });

    // Notify all assigned reviewers
    for (const assignment of cycle.assignments) {
      await prisma.notification.create({
        data: {
          userId: assignment.reviewer.id,
          type: "REVIEW_WINDOW_OPEN",
          message: `${cycle.user.name} submitted their appraisal on ${submittedAt}${editCount > 0 ? ` (edited ${editCount} time${editCount !== 1 ? "s" : ""})` : ""}. You have 3 business days (until ${ratingDeadline.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}) to submit your rating.`,
          link: `/reviewer/${cycle.id}/rate`,
          persistent: true,
          critical: true,
        },
      });
    }
  }

  // --- 2. Rating deadline passed — send reminder to reviewers who haven't rated ---
  const ratingExpiredCycles = await prisma.appraisalCycle.findMany({
    where: {
      status: { in: ["SELF_SUBMITTED", "RATING_IN_PROGRESS"] },
      ratingDeadline: { lte: now, not: null },
    },
    include: {
      user: { select: { name: true } },
      assignments: {
        include: { reviewer: { select: { id: true } } },
      },
      ratings: { select: { reviewerId: true } },
    },
  });

  for (const cycle of ratingExpiredCycles) {
    await syncCycleStatus(cycle.id);

    const ratedIds = new Set(cycle.ratings.map((r) => r.reviewerId));
    const pendingReviewers = cycle.assignments.filter(
      (a) => a.availability === "AVAILABLE" && !ratedIds.has(a.reviewer.id),
    );

    for (const a of pendingReviewers) {
      // Check if we haven't sent a deadline-passed notification recently
      const recent = await prisma.notification.findFirst({
        where: {
          userId: a.reviewer.id,
          type: "RATING_OVERDUE",
          link: `/reviewer/${cycle.id}`,
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      });
      if (recent) continue;

      await prisma.notification.create({
        data: {
          userId: a.reviewer.id,
          type: "RATING_OVERDUE",
          message: `Rating deadline for ${cycle.user.name}'s appraisal has passed. Please submit your rating immediately or request a time extension.`,
          link: `/reviewer/${cycle.id}`,
          persistent: true,
          critical: true,
        },
      });
    }
  }

  return NextResponse.json({ ok: true, processed: { dueNotified, selfExpired: expiredSelfCycles.length, ratingExpired: ratingExpiredCycles.length } });
}
