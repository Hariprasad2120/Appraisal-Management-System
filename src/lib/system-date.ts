import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";

const getCachedSystemDate = unstable_cache(
  async () => {
    try {
      const last = await prisma.auditLog.findFirst({
        where: { action: "SYSTEM_DATE_OVERRIDE" },
        orderBy: { createdAt: "desc" },
        select: { after: true },
      });
      if (!last) return null;
      const after = last.after as { active?: boolean; date?: string } | null;
      if (after?.active === true && after.date) return after.date;
    } catch {
      // fall through
    }
    return null;
  },
  ["system-date"],
  { revalidate: 60 }
);

export async function getSystemDate(): Promise<Date> {
  const dateStr = await getCachedSystemDate();
  return dateStr ? new Date(dateStr) : new Date();
}
