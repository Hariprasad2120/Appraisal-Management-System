"use server";

import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";
import { differenceInCalendarDays } from "date-fns";

export async function createLeaveRequestAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;
  const userId = session.user.id;

  const leaveTypeId = formData.get("leaveTypeId") as string;
  const fromDate = new Date(formData.get("fromDate") as string);
  const toDate = new Date(formData.get("toDate") as string);
  const reason = (formData.get("reason") as string | null)?.trim() || null;

  if (!leaveTypeId || isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    throw new Error("Invalid leave request data.");
  }
  if (toDate < fromDate) throw new Error("End date must be after start date.");

  const days = differenceInCalendarDays(toDate, fromDate) + 1;

  await prisma.leaveRequest.create({
    data: {
      organizationId,
      employeeId: userId,
      leaveTypeId,
      fromDate,
      toDate,
      days,
      reason,
    },
  });

  revalidatePath("/leave");
}

export async function cancelLeaveRequestAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const id = formData.get("id") as string;
  const request = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!request || request.employeeId !== userId) throw new Error("Not found.");
  if (request.status !== "PENDING") throw new Error("Only pending requests can be cancelled.");

  await prisma.leaveRequest.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath("/leave");
}
