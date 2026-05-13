import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "../src/lib/db";

async function main() {
  const passwordHash = await bcrypt.hash(randomBytes(24).toString("hex"), 10);

  const seededEmployees = await prisma.user.findMany({
    where: {
      organizationId: "default-org",
      employeeNumber: { not: null },
      platformRole: null,
    },
    select: { id: true },
  });

  const ids = seededEmployees.map((user) => user.id);

  if (ids.length > 0) {
    await prisma.$transaction([
      prisma.user.updateMany({
        where: { id: { in: ids } },
        data: {
          active: false,
          status: "INVITED",
          activeOrganizationId: null,
          passwordHash,
        },
      }),
      prisma.organizationUser.updateMany({
        where: { userId: { in: ids }, organizationId: "default-org" },
        data: { status: "SUSPENDED" },
      }),
      prisma.userSession.updateMany({
        where: { userId: { in: ids }, status: "ACTIVE" },
        data: { status: "LOGGED_OUT", logoutAt: new Date() },
      }),
    ]);
  }

  console.log(`Updated ${ids.length} seeded employees to no portal access.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
