import { prisma } from "@/lib/db";

/**
 * Returns the system date for "now" checks.
 * If admin has set a date override via simulation panel, returns that date.
 * Otherwise returns the real current date.
 */
export async function getSystemDate(): Promise<Date> {
  try {
    const last = await prisma.auditLog.findFirst({
      where: { action: "SYSTEM_DATE_OVERRIDE" },
      orderBy: { createdAt: "desc" },
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
