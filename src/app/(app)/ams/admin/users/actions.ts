"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCachedSession as auth } from "@/lib/auth";
import { hashInviteToken, normalizeInviteEmail } from "@/lib/invites";
import { sendEmail } from "@/lib/email";
import { getAccountUsage, assertAccountWithinPlanLimits } from "@/lib/tenant";

const APP_URL = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.secondaryRole !== "ADMIN")) {
    throw new Error("Forbidden");
  }
  return session;
}

async function getOrgAccountId(orgId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { accountId: true } });
  return org?.accountId ?? null;
}

export async function inviteUserAction(formData: FormData) {
  const session = await requireAdmin();
  const orgId = session.user.activeOrganizationId ?? "default-org";
  const userId = formData.get("userId") as string;
  if (!userId) throw new Error("No employee selected.");

  const employee = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, organizationId: true },
  });
  if (!employee || employee.organizationId !== orgId) throw new Error("Employee not found in this organisation.");
  if (!employee.email) throw new Error("Employee has no email address on record.");

  const accountId = await getOrgAccountId(orgId);
  if (accountId) {
    const usage = await getAccountUsage(accountId);
    await assertAccountWithinPlanLimits(accountId, {
      nextEmployeeCount: usage.activeEmployeeCount + 1,
    });
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashInviteToken(token);
  const emailNormalized = normalizeInviteEmail(employee.email);

  const roleMap: Record<string, string> = {
    ADMIN: "ORG_ADMIN",
    MANAGEMENT: "MANAGEMENT",
    HR: "HR",
    MANAGER: "MANAGER",
    TL: "TEAM_LEAD",
    EMPLOYEE: "EMPLOYEE",
    PARTNER: "PARTNER_OR_DIRECTOR",
    REVIEWER: "EMPLOYEE",
  };
  const organizationRole = (roleMap[employee.role] ?? "EMPLOYEE") as
    | "ORG_OWNER" | "ORG_ADMIN" | "MANAGEMENT" | "HR" | "MANAGER" | "TEAM_LEAD" | "EMPLOYEE" | "PARTNER_OR_DIRECTOR";

  await prisma.$transaction([
    prisma.invite.updateMany({
      where: { organizationId: orgId, emailNormalized, status: "PENDING" },
      data: { status: "REVOKED" },
    }),
    prisma.invite.create({
      data: {
        scopeType: "ORGANIZATION",
        organizationId: orgId,
        email: employee.email,
        emailNormalized,
        name: employee.name,
        organizationRole,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedById: session.user.id,
        status: "PENDING",
      },
    }),
  ]);

  const inviteUrl = `${APP_URL}/activate-invite/${token}`;
  await sendEmail({
    to: employee.email,
    subject: "You have been invited to the AMS portal",
    html: `
      <p>Hi ${employee.name},</p>
      <p>You have been invited to access the Adarsh Shipping AMS portal.</p>
      <p>Click the link below to set your password and activate your account:</p>
      <p><a href="${inviteUrl}">${inviteUrl}</a></p>
      <p>This link expires in 7 days.</p>
      <p>— Adarsh Shipping AMS</p>
    `,
  });

  revalidatePath("/ams/admin/users");
}

export async function resendInviteAction(formData: FormData) {
  const session = await requireAdmin();
  const orgId = session.user.activeOrganizationId ?? "default-org";
  const inviteId = formData.get("inviteId") as string;
  if (!inviteId) throw new Error("Missing invite ID.");

  const invite = await prisma.invite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.organizationId !== orgId) throw new Error("Invite not found.");

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashInviteToken(token);

  await prisma.invite.update({
    where: { id: inviteId },
    data: {
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "PENDING",
    },
  });

  const inviteUrl = `${APP_URL}/activate-invite/${token}`;
  await sendEmail({
    to: invite.email,
    subject: "Your AMS portal invite (resent)",
    html: `
      <p>Hi ${invite.name ?? invite.email},</p>
      <p>Your invite to the Adarsh Shipping AMS portal has been resent.</p>
      <p><a href="${inviteUrl}">${inviteUrl}</a></p>
      <p>This link expires in 7 days.</p>
      <p>— Adarsh Shipping AMS</p>
    `,
  });

  revalidatePath("/ams/admin/users");
}

export async function cancelInviteAction(formData: FormData) {
  const session = await requireAdmin();
  const orgId = session.user.activeOrganizationId ?? "default-org";
  const inviteId = formData.get("inviteId") as string;
  if (!inviteId) throw new Error("Missing invite ID.");

  const invite = await prisma.invite.findFirst({ where: { id: inviteId, organizationId: orgId } });
  if (!invite) throw new Error("Invite not found.");

  await prisma.invite.delete({ where: { id: inviteId } });
  revalidatePath("/ams/admin/users");
}

export async function revokeAccessAction(formData: FormData) {
  const session = await requireAdmin();
  const orgId = session.user.activeOrganizationId ?? "default-org";
  const userId = formData.get("userId") as string;
  if (!userId) throw new Error("Missing user ID.");
  if (userId === session.user.id) throw new Error("Cannot revoke your own access.");

  const user = await prisma.user.findFirst({ where: { id: userId, organizationId: orgId } });
  if (!user) throw new Error("User not found in this organisation.");

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { active: false, status: "SUSPENDED" },
    }),
    prisma.userSession.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "LOGGED_OUT", logoutAt: new Date() },
    }),
  ]);

  revalidatePath("/ams/admin/users");
}

export async function reactivateUserAction(formData: FormData) {
  const session = await requireAdmin();
  const orgId = session.user.activeOrganizationId ?? "default-org";
  const userId = formData.get("userId") as string;
  if (!userId) throw new Error("Missing user ID.");

  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId: orgId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) throw new Error("User not found.");
  if (!user.email) throw new Error("User has no email on record.");

  const accountId = await getOrgAccountId(orgId);
  if (accountId) {
    const usage = await getAccountUsage(accountId);
    await assertAccountWithinPlanLimits(accountId, {
      nextEmployeeCount: usage.activeEmployeeCount + 1,
    });
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashInviteToken(token);
  const emailNormalized = normalizeInviteEmail(user.email);

  const roleMap: Record<string, string> = {
    ADMIN: "ORG_ADMIN", MANAGEMENT: "MANAGEMENT", HR: "HR",
    MANAGER: "MANAGER", TL: "TEAM_LEAD", EMPLOYEE: "EMPLOYEE",
    PARTNER: "PARTNER_OR_DIRECTOR", REVIEWER: "EMPLOYEE",
  };
  const organizationRole = (roleMap[user.role] ?? "EMPLOYEE") as
    | "ORG_OWNER" | "ORG_ADMIN" | "MANAGEMENT" | "HR" | "MANAGER" | "TEAM_LEAD" | "EMPLOYEE" | "PARTNER_OR_DIRECTOR";

  await prisma.$transaction([
    prisma.invite.updateMany({
      where: { organizationId: orgId, emailNormalized, status: "PENDING" },
      data: { status: "REVOKED" },
    }),
    prisma.invite.create({
      data: {
        scopeType: "ORGANIZATION",
        organizationId: orgId,
        email: user.email,
        emailNormalized,
        name: user.name,
        organizationRole,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedById: session.user.id,
        status: "PENDING",
      },
    }),
  ]);

  const inviteUrl = `${APP_URL}/activate-invite/${token}`;
  await sendEmail({
    to: user.email,
    subject: "Your AMS portal access has been reactivated",
    html: `
      <p>Hi ${user.name},</p>
      <p>Your access to the Adarsh Shipping AMS portal has been reactivated.</p>
      <p>Click the link below to set a new password and log in:</p>
      <p><a href="${inviteUrl}">${inviteUrl}</a></p>
      <p>This link expires in 7 days.</p>
      <p>— Adarsh Shipping AMS</p>
    `,
  });

  revalidatePath("/ams/admin/users");
}

export async function deleteUserAccountAction(formData: FormData) {
  const session = await requireAdmin();
  const orgId = session.user.activeOrganizationId ?? "default-org";
  const userId = formData.get("userId") as string;
  if (!userId) throw new Error("Missing user ID.");
  if (userId === session.user.id) throw new Error("Cannot delete your own account.");

  const user = await prisma.user.findFirst({ where: { id: userId, organizationId: orgId } });
  if (!user) throw new Error("User not found in this organisation.");

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/ams/admin/users");
}
