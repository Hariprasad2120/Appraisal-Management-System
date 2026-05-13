"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCachedSession as auth } from "@/lib/auth";

async function requireHr() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) throw new Error("Forbidden");
  return session;
}

export async function createEomAction(formData: FormData) {
  const session = await requireHr();
  const employeeId = formData.get("employeeId") as string;
  const month = formData.get("month") as string;
  const citation = formData.get("citation") as string | null;

  if (!employeeId || !month) throw new Error("Employee and month are required");

  await prisma.employeeOfMonth.create({
    data: {
      organizationId: session.user.activeOrganizationId ?? "default-org",
      employeeId,
      month: new Date(`${month}-01`),
      citation: citation ?? undefined,
      awardedById: session.user.id,
    },
  });
  revalidatePath("/hrms/tracking/employee-of-month");
}

