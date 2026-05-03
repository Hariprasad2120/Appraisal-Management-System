import { prisma } from "@/lib/db";
import { GRADE_BANDS, HIKE_TABLE } from "@/lib/criteria";

const DEFAULT_SLAB_TIERS = [
  { key: "upto15k", label: "Up to INR 15,000/mo", id: "UPTO_15K" },
  { key: "upto30k", label: "INR 15,001-30,000/mo", id: "BTW_15K_30K" },
  { key: "above30k", label: "Above INR 30,000/mo", id: "ABOVE_30K" },
] as const;

export function buildDefaultIncrementSlabs() {
  return GRADE_BANDS.flatMap((band) =>
    DEFAULT_SLAB_TIERS.map((tier) => ({
      label: `Grade ${band.grade} (${tier.label})`,
      grade: band.grade,
      minRating: band.minNormalized,
      maxRating: band.maxNormalized,
      salaryTier: tier.id,
      hikePercent: HIKE_TABLE[band.grade][tier.key],
    })),
  );
}

export async function ensureDefaultIncrementSlabs() {
  const defaults = buildDefaultIncrementSlabs();
  const existing = await prisma.incrementSlab.findMany({
    select: { id: true, grade: true, salaryTier: true },
  });
  const hasOfficialSlabs = existing.some((slab) =>
    defaults.some((defaultSlab) => defaultSlab.grade === slab.grade && defaultSlab.salaryTier === slab.salaryTier),
  );

  if (!hasOfficialSlabs && existing.length > 0) {
    await prisma.incrementSlab.deleteMany();
    await prisma.incrementSlab.createMany({ data: defaults });
    return;
  }

  const missing = defaults.filter(
    (defaultSlab) =>
      !existing.some((slab) => slab.grade === defaultSlab.grade && slab.salaryTier === defaultSlab.salaryTier),
  );
  if (missing.length > 0) {
    await prisma.incrementSlab.createMany({ data: missing });
  }
}

export async function getSlabs() {
  await ensureDefaultIncrementSlabs();
  return prisma.incrementSlab.findMany({ orderBy: [{ minRating: "desc" }, { salaryTier: "asc" }] });
}
