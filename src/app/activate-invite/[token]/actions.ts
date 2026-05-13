"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashInviteToken, normalizeInviteEmail } from "@/lib/invites";

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

function mapOrganizationRoleToLegacyRole(role: string) {
  switch (role) {
    case "ORG_OWNER":
    case "ORG_ADMIN":
    case "APPRAISAL_ADMIN":
      return "ADMIN";
    case "MANAGEMENT":
      return "MANAGEMENT";
    case "HR":
      return "HR";
    case "MANAGER":
      return "MANAGER";
    case "TEAM_LEAD":
      return "TL";
    case "PARTNER_OR_DIRECTOR":
      return "PARTNER";
    default:
      return "EMPLOYEE";
  }
}

export async function activateInviteAction(token: string, formData: FormData) {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  const tokenHash = hashInviteToken(token);
  const invite = await prisma.invite.findUnique({
    where: { tokenHash },
    include: {
      account: true,
      organization: true,
    },
  });

  if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    throw new Error("This invite is invalid or has expired.");
  }

  const email = normalizeInviteEmail(invite.email);
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const organizationRole = invite.organizationRole ?? "EMPLOYEE";

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      update: {
        email,
        emailNormalized: email,
        passwordHash,
        active: true,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        activeOrganizationId: invite.organizationId ?? undefined,
        organizationId: invite.organizationId ?? undefined,
        role: invite.organizationId ? mapOrganizationRoleToLegacyRole(organizationRole) : undefined,
      },
      create: {
        email,
        emailNormalized: email,
        passwordHash,
        name: invite.name ?? email,
        role: invite.organizationId ? mapOrganizationRoleToLegacyRole(organizationRole) : "EMPLOYEE",
        secondaryRole: null,
        organizationId: invite.organizationId ?? "default-org",
        activeOrganizationId: invite.organizationId ?? null,
        joiningDate: new Date(),
        active: true,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        passkeySetupRequired: true,
        googleLoginAllowed: false,
      },
    });

    if (invite.accountId && invite.accountRole) {
      await tx.accountMembership.upsert({
        where: {
          accountId_userId: {
            accountId: invite.accountId,
            userId: user.id,
          },
        },
        update: {
          role: invite.accountRole,
          status: "ACTIVE",
        },
        create: {
          accountId: invite.accountId,
          userId: user.id,
          role: invite.accountRole,
          status: "ACTIVE",
          invitedById: invite.invitedById,
        },
      });
    }

    if (invite.organizationId) {
      const membership = await tx.organizationUser.upsert({
        where: {
          organizationId_userId: {
            organizationId: invite.organizationId,
            userId: user.id,
          },
        },
        update: {
          status: "ACTIVE",
          branchId: invite.branchId ?? undefined,
          departmentId: invite.departmentId ?? undefined,
        },
        create: {
          organizationId: invite.organizationId,
          userId: user.id,
          branchId: invite.branchId ?? undefined,
          departmentId: invite.departmentId ?? undefined,
          status: "ACTIVE",
          invitedById: invite.invitedById ?? undefined,
        },
      });

      const existingAssignment = await tx.userRoleAssignment.findFirst({
        where: {
          organizationId: invite.organizationId,
          userId: user.id,
          role: organizationRole,
          branchId: invite.branchId ?? null,
          departmentId: invite.departmentId ?? null,
        },
        select: { id: true },
      });

      if (existingAssignment) {
        await tx.userRoleAssignment.update({
          where: { id: existingAssignment.id },
          data: {
            membershipId: membership.id,
          },
        });
      } else {
        await tx.userRoleAssignment.create({
          data: {
            organizationId: invite.organizationId,
            userId: user.id,
            membershipId: membership.id,
            role: organizationRole,
            branchId: invite.branchId ?? null,
            departmentId: invite.departmentId ?? null,
            createdById: invite.invitedById ?? undefined,
          },
        });
      }
    }

    await tx.invite.update({
      where: { id: invite.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedUserId: user.id,
      },
    });
  });

  redirect("/login?invite=activated");
}
