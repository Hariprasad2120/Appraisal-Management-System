"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCachedSession as auth } from "@/lib/auth";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";

export async function markAllReadAction(): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;
  await prisma.notification.updateMany({
    where: { organizationId, userId: session.user.id, read: false },
    data: { read: true },
  });
  revalidatePath("/notifications");
}

export async function markOneReadAction(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;
  await prisma.notification.updateMany({
    where: { organizationId, id, userId: session.user.id },
    data: { read: true },
  });
  revalidatePath("/notifications");
}

export async function deleteAllNotificationsAction(): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;
  await prisma.notification.deleteMany({
    where: { organizationId, userId: session.user.id },
  });
  revalidatePath("/notifications");
}
