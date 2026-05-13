import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { FadeIn } from "@/components/motion-div";
import { AdminNotificationsPanel } from "@/app/(app)/admin/notifications/admin-notifications-panel";
import { Bell } from "lucide-react";

export default async function AccountNotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN") redirect("/unauthorized");

  const notifications = await prisma.notification.findMany({
    take: 200,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, role: true, email: true } },
    },
  });

  const total = await prisma.notification.count();
  const unacknowledged = await prisma.notification.count({ where: { critical: true, acknowledged: false, dismissed: false } });
  const urgent = await prisma.notification.count({ where: { urgent: true, dismissed: false } });

  return (
    <div className="max-w-5xl space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="size-6" /> Notification Center
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total} total · {unacknowledged} pending acknowledgement · {urgent} urgent active
          </p>
        </div>
      </FadeIn>
      <FadeIn delay={0.05}>
        <AdminNotificationsPanel
          notifications={notifications.map((n) => ({
            ...n,
            createdAt: n.createdAt.toISOString(),
            acknowledgedAt: n.acknowledgedAt?.toISOString() ?? null,
          }))}
        />
      </FadeIn>
    </div>
  );
}
