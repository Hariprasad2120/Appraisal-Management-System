import { prisma } from "@/lib/db";
import { cacheLife, cacheTag } from "next/cache";

export async function getSlabs() {
  "use cache";
  cacheLife("hours");
  cacheTag("slabs");
  return prisma.incrementSlab.findMany({ orderBy: { minRating: "desc" } });
}
