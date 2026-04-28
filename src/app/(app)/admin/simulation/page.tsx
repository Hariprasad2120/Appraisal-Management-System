import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { SimulationPanel } from "./simulation-panel";
import { toTitleCase } from "@/lib/utils";

export default async function SimulationPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Access restricted to Admin only.
      </div>
    );
  }

  const [activeCycles, lastSimLog, lastDateLog] = await Promise.all([
    prisma.appraisalCycle.findMany({
      where: { status: { notIn: ["DECIDED", "CLOSED"] } },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findFirst({
      where: { action: "SIMULATION_MODE" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findFirst({
      where: { action: "SYSTEM_DATE_OVERRIDE" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const lastSimAfter = lastSimLog?.after as { active?: boolean } | null;
  const isSimulationActive = lastSimAfter?.active === true;

  const lastDateAfter = lastDateLog?.after as { active?: boolean; date?: string } | null;
  const systemDateOverride =
    lastDateAfter?.active === true && lastDateAfter.date ? lastDateAfter.date : null;

  const mappedCycles = activeCycles.map((c) => ({
    id: c.id,
    employeeName: toTitleCase(c.user.name),
    status: c.status,
    ratingDeadline: c.ratingDeadline?.toISOString() ?? null,
    scheduledDate: c.scheduledDate?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-6 max-w-3xl">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Time Travel / Simulation</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Shift deadlines and simulate workflow progression for testing. Admin only.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.08}>
        <SimulationPanel
          activeCycles={mappedCycles}
          isSimulationActive={isSimulationActive}
          systemDateOverride={systemDateOverride}
        />
      </FadeIn>
    </div>
  );
}
