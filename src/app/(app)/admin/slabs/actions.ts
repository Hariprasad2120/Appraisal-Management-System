"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { GRADE_BANDS, HIKE_TABLE } from "@/lib/criteria";

const createSchema = z.object({
  label: z.string().min(1),
  grade: z.string().default(""),
  minRating: z.coerce.number().min(0).max(100),
  maxRating: z.coerce.number().min(0).max(100),
  salaryTier: z.string().default("ALL"),
  hikePercent: z.coerce.number().min(0).max(100),
});

type Result = { ok: true } | { ok: false; error: string };

export async function createSlabAction(fd: FormData): Promise<Result> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) return { ok: false, error: "Forbidden" };

  const parsed = createSchema.safeParse({
    label: fd.get("label"),
    grade: fd.get("grade"),
    minRating: fd.get("minRating"),
    maxRating: fd.get("maxRating"),
    salaryTier: fd.get("salaryTier"),
    hikePercent: fd.get("hikePercent"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  await prisma.incrementSlab.create({ data: parsed.data });
  revalidateTag("slabs", "max");
  revalidatePath("/admin/slabs");
  return { ok: true };
}

export async function deleteSlabAction(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) return;
  const id = fd.get("id") as string;
  if (!id) return;
  await prisma.incrementSlab.delete({ where: { id } }).catch(() => {});
  revalidateTag("slabs", "max");
  revalidatePath("/admin/slabs");
}

/** Wipe all slabs and re-seed from the official grade/tier table */
export async function seedSlabsAction(): Promise<Result> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) return { ok: false, error: "Forbidden" };

  const tiers: { key: "upto15k" | "upto30k" | "above30k"; label: string; id: string }[] = [
    { key: "upto15k",  label: "≤ ₹15,000/mo",        id: "UPTO_15K" },
    { key: "upto30k",  label: "₹15,001–30,000/mo",   id: "BTW_15K_30K" },
    { key: "above30k", label: "> ₹30,000/mo",         id: "ABOVE_30K" },
  ];

  const slabs = [];
  for (const band of GRADE_BANDS) {
    const hikeRow = HIKE_TABLE[band.grade];
    for (const tier of tiers) {
      slabs.push({
        label: `Grade ${band.grade} (${tier.label})`,
        grade: band.grade,
        minRating: band.minNormalized,
        maxRating: band.maxNormalized,
        salaryTier: tier.id,
        hikePercent: hikeRow[tier.key],
      });
    }
  }

  await prisma.$transaction([
    prisma.incrementSlab.deleteMany(),
    prisma.incrementSlab.createMany({ data: slabs }),
  ]);

  revalidateTag("slabs", "max");
  revalidatePath("/admin/slabs");
  return { ok: true };
}
