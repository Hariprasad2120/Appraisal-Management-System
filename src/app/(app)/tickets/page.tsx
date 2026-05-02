import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FadeIn, StaggerList, StaggerItem } from "@/components/motion-div";
import { TicketForm } from "./ticket-form";
import { TicketList } from "./ticket-list";

export default async function TicketsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const tickets = await prisma.ticket.findMany({
    where: { raisedById: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      comments: {
        include: { author: { select: { name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return (
    <div className="w-full max-w-7xl space-y-6">
      <FadeIn>
        <div>
          <h1 className="ds-h1">Support Tickets</h1>
          <p className="ds-body mt-1">
            Report issues with the appraisal system. Our admin team will respond
            promptly.
          </p>
        </div>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr] lg:items-start">
        <FadeIn delay={0.05}>
          <TicketForm />
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-500">
              Your Tickets
            </h2>
            <TicketList
              tickets={tickets}
              currentUserId={session.user.id}
              isAdmin={false}
            />
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
