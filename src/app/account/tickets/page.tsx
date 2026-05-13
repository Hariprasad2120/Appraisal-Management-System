import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { FadeIn } from "@/components/motion-div";
import { AdminTicketPanel } from "@/app/(app)/admin/tickets/admin-ticket-panel";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";

export default async function AccountTicketsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;

  const tickets = await prisma.ticket.findMany({
    where: { organizationId },
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
  const urgentCount = tickets.filter((t) => t.priority === "URGENT" && t.status !== "CLOSED").length;

  return (
    <div className="max-w-4xl space-y-6">
      <FadeIn>
        <div>
          <h1 className="ds-h1">Support Tickets</h1>
          <p className="ds-body mt-1">{openCount} open · {urgentCount} urgent</p>
        </div>
      </FadeIn>
      <FadeIn delay={0.05}>
        <AdminTicketPanel tickets={tickets} />
      </FadeIn>
    </div>
  );
}
