import { prisma } from "@/lib/db";
import { cacheLife } from "next/cache";

export async function getSystemDate(): Promise<Date> {
  "use cache";
  cacheLife("seconds");
  try {
    const last = await prisma.auditLog.findFirst({
      where: { action: "SYSTEM_DATE_OVERRIDE" },
      orderBy: { createdAt: "desc" },
      select: { after: true },
    });
    if (!last) return new Date();
    const after = last.after as { active?: boolean; date?: string } | null;
    if (after?.active === true && after.date) {
      return new Date(after.date);
    }
  } catch {
    // fall through to real date
  }
  return new Date();
}
