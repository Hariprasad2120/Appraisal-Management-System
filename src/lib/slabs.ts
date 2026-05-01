import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";

export const getSlabs = unstable_cache(
  async () => prisma.incrementSlab.findMany({ orderBy: { minRating: "desc" } }),
  ["increment-slabs"],
  { tags: ["slabs"], revalidate: 3600 }
);
