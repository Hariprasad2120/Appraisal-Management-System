import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { AdminTicketPanel } from "./admin-ticket-panel";

export default async function AdminTicketsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const tickets = await prisma.ticket.findMany({
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: {
      raisedBy: { select: { name: true, role: true, department: true } },
      comments: {
        include: { author: { select: { name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const openCount = tickets.filter((t) => t.status === "OPEN").length;
  const urgentCount = tickets.filter(
    (t) => t.priority === "URGENT" && t.status !== "CLOSED",
  ).length;

  return (
    <div className="w-full max-w-4xl space-y-6">
      <FadeIn>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="ds-h1">Support Tickets</h1>
            <p className="ds-body mt-1">
              {openCount} open · {urgentCount} urgent
            </p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <AdminTicketPanel tickets={tickets} />
      </FadeIn>
    </div>
  );
}
