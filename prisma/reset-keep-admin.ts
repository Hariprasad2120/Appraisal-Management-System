import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const PLATFORM_ADMIN_EMAIL = (process.env.PLATFORM_SUPER_ADMIN_EMAIL ?? "hariprasad.official.137@gmail.com").toLowerCase();

function requireResetAdminPassword() {
  const password = process.env.RESET_ADMIN_PASSWORD?.trim();
  if (!password) {
    throw new Error("RESET_ADMIN_PASSWORD must be set for reset-keep-admin.");
  }
  return password;
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  if (process.env.CONFIRM_RESET !== "KEEP_ONLY_ADMIN") {
    throw new Error("Set CONFIRM_RESET=KEEP_ONLY_ADMIN to run the data reset.");
  }

  const adminEmail = PLATFORM_ADMIN_EMAIL;
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      email: adminEmail,
      emailNormalized: adminEmail,
      role: "ADMIN",
      active: true,
      status: "ACTIVE",
      passkeySetupRequired: true,
      googleLoginAllowed: true,
      platformRole: "PLATFORM_SUPER_ADMIN",
      emailVerifiedAt: new Date(),
    },
    create: {
      email: adminEmail,
      emailNormalized: adminEmail,
      name: "Platform Super Admin",
      role: "ADMIN",
      joiningDate: new Date(),
      active: true,
      status: "ACTIVE",
      passwordHash: await bcrypt.hash(requireResetAdminPassword(), 10),
      passkeySetupRequired: true,
      googleLoginAllowed: true,
      platformRole: "PLATFORM_SUPER_ADMIN",
      emailVerifiedAt: new Date(),
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
