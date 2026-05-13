import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  const [activeUsers, noAccessUsers, pendingInvites] = await Promise.all([
    prisma.user.count({
      where: { organizationId: "default-org", active: true, status: "ACTIVE" },
    }),
    prisma.user.count({
      where: {
        organizationId: "default-org",
        OR: [{ active: false }, { status: { in: ["INVITED", "SUSPENDED"] } }],
      },
    }),
    prisma.invite.count({
      where: { organizationId: "default-org", status: "PENDING" },
    }),
  ]);

  console.log(JSON.stringify({ activeUsers, noAccessUsers, pendingInvites }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
