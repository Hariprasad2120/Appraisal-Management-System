import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ADMIN_EMAIL = "hr@adarshshipping.in";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  if (process.env.CONFIRM_RESET !== "KEEP_ONLY_ADMIN") {
    throw new Error("Set CONFIRM_RESET=KEEP_ONLY_ADMIN to run the data reset.");
  }

  const adminEmail = ADMIN_EMAIL.toLowerCase();
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      email: adminEmail,
      role: "ADMIN",
      active: true,
      passkeySetupRequired: true,
      googleLoginAllowed: true,
    },
    create: {
      email: adminEmail,
      name: "HR Admin",
      role: "ADMIN",
      joiningDate: new Date(),
      active: true,
      passwordHash: await bcrypt.hash(process.env.RESET_ADMIN_PASSWORD ?? "Admin@12345", 10),
      passkeySetupRequired: true,
      googleLoginAllowed: true,
    },
  });

  await prisma.$transaction([
    prisma.messageRetriggerLog.deleteMany({}),
    prisma.passwordResetToken.deleteMany({}),
    prisma.passkeyResetRequest.deleteMany({}),
    prisma.loginChallenge.deleteMany({}),
    prisma.notification.deleteMany({ where: { userId: { not: admin.id } } }),
    prisma.securityEvent.deleteMany({ where: { userId: { not: admin.id } } }),
    prisma.userSession.deleteMany({ where: { userId: { not: admin.id } } }),
    prisma.ticketComment.deleteMany({}),
    prisma.ticket.deleteMany({}),
    prisma.ratingReview.deleteMany({}),
    prisma.ratingDisagreement.deleteMany({}),
    prisma.meetingReschedule.deleteMany({}),
    prisma.arrear.deleteMany({}),
    prisma.appraisalDecision.deleteMany({}),
    prisma.mOM.deleteMany({}),
    prisma.dateVote.deleteMany({}),
    prisma.rating.deleteMany({}),
    prisma.cycleAssignment.deleteMany({}),
    prisma.extensionRequest.deleteMany({}),
    prisma.selfAssessment.deleteMany({}),
    prisma.auditLog.deleteMany({ where: { actorId: { not: admin.id } } }),
    prisma.appraisalCycle.deleteMany({}),
    prisma.salaryRevision.deleteMany({ where: { userId: { not: admin.id } } }),
    prisma.employeeSalary.deleteMany({ where: { userId: { not: admin.id } } }),
    prisma.criteriaOverride.deleteMany({ where: { updatedById: { not: admin.id } } }),
    prisma.user.updateMany({
      where: { id: { not: admin.id } },
      data: { reportingManagerId: null },
    }),
    prisma.user.deleteMany({ where: { id: { not: admin.id } } }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "DATABASE_RESET_KEEP_ONLY_ADMIN",
        after: { preservedAdminEmail: adminEmail },
      },
    }),
  ]);

  console.log(`Database reset complete. Preserved admin: ${adminEmail}`);
}

main()
  .finally(() => prisma.$disconnect());
