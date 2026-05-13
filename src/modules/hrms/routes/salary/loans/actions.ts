"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCachedSession as auth } from "@/lib/auth";

async function requireHr() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) throw new Error("Forbidden");
  return session;
}

const createSchema = z.object({
  employeeId: z.string().min(1),
  principal: z.string().transform(Number),
  interestRate: z.string().optional().transform((v) => Number(v ?? "0")),
  tenureMonths: z.string().transform(Number),
  startMonth: z.string().min(1),
  remarks: z.string().optional(),
});

export async function createLoanAction(formData: FormData) {
  const session = await requireHr();
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  const d = parsed.data;
  const loan = await prisma.loan.create({
    data: {
      employeeId: d.employeeId,
      organizationId: session.user.activeOrganizationId ?? "default-org",
      principal: d.principal,
      interestRate: d.interestRate,
      tenureMonths: d.tenureMonths,
      startMonth: new Date(d.startMonth),
      remarks: d.remarks,
      approvedById: session.user.id,
    },
  });

  // Auto-generate monthly repayment schedule (simple equal installments, no interest compounding for now)
  const monthlyAmt = d.principal / d.tenureMonths;
  const repayments = Array.from({ length: d.tenureMonths }, (_, i) => {
    const date = new Date(d.startMonth);
    date.setMonth(date.getMonth() + i);
    return { loanId: loan.id, payrollMonth: new Date(date), amount: monthlyAmt };
  });
  await prisma.loanRepayment.createMany({ data: repayments });

  revalidatePath("/hrms/salary/loans");
}

export async function closeLoanAction(loanId: string) {
  await requireHr();
  await prisma.loan.update({ where: { id: loanId }, data: { status: "CLOSED" } });
  revalidatePath("/hrms/salary/loans");
}

