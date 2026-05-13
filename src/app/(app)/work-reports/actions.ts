"use server";

import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";
import { startOfWeek } from "date-fns";

function currentWeekStart() {
  return startOfWeek(new Date(), { weekStartsOn: 1 });
}

export async function submitWorkReportAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const organizationId = session.user.activeOrganizationId ?? DEFAULT_ORGANIZATION_ID;
  const userId = session.user.id;

  const weekStart = currentWeekStart();
  const summary = (formData.get("summary") as string | null)?.trim() ?? "";
  const accomplishments = (formData.get("accomplishments") as string | null)?.trim() || null;
  const blockers = (formData.get("blockers") as string | null)?.trim() || null;
  const nextWeek = (formData.get("nextWeek") as string | null)?.trim() || null;

  if (!summary) throw new Error("Summary is required.");

  await prisma.workReport.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    create: { organizationId, userId, weekStart, summary, accomplishments, blockers, nextWeek, submittedAt: new Date() },
    update: { summary, accomplishments, blockers, nextWeek, submittedAt: new Date() },
  });

  revalidatePath("/work-reports");
}

export async function updateWorkReportAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const id = formData.get("id") as string;
  const report = await prisma.workReport.findUnique({ where: { id } });
  if (!report || report.userId !== userId) throw new Error("Not found.");

  const summary = (formData.get("summary") as string | null)?.trim() ?? "";
  const accomplishments = (formData.get("accomplishments") as string | null)?.trim() || null;
  const blockers = (formData.get("blockers") as string | null)?.trim() || null;
  const nextWeek = (formData.get("nextWeek") as string | null)?.trim() || null;

  if (!summary) throw new Error("Summary is required.");

  await prisma.workReport.update({
    where: { id },
    data: { summary, accomplishments, blockers, nextWeek, submittedAt: new Date() },
  });

  revalidatePath("/work-reports");
}
