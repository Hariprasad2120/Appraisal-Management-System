"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { getCachedSession as auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildDefaultIncrementSlabs } from "@/lib/slabs";

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
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) {
    return { ok: false, error: "Forbidden" };
  }

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
  revalidatePath("/ams/admin/slabs");
  return { ok: true };
}

export async function deleteSlabAction(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) return;
  const id = fd.get("id") as string;
  if (!id) return;
  await prisma.incrementSlab.delete({ where: { id } }).catch(() => {});
  revalidateTag("slabs", "max");
  revalidatePath("/ams/admin/slabs");
}

/** Wipe all slabs and re-seed from the official grade/tier table. */
export async function seedSlabsAction(): Promise<Result> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) {
    return { ok: false, error: "Forbidden" };
  }

  await prisma.$transaction([
    prisma.incrementSlab.deleteMany(),
    prisma.incrementSlab.createMany({ data: buildDefaultIncrementSlabs() }),
  ]);

  revalidateTag("slabs", "max");
  revalidatePath("/ams/admin/slabs");
  return { ok: true };
}
