import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FadeIn } from "@/components/motion-div";
import { Bell } from "lucide-react";
import { NotificationsPanel } from "./notifications-panel";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="w-full max-w-3xl space-y-6">
      <FadeIn>
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="ds-h1 heading-icon-none">Notifications</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {notifications.filter((n) => !n.read).length} unread
            </p>
          </div>
        </div>
      </FadeIn>

      <NotificationsPanel
        initialNotifications={notifications.map((n) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
