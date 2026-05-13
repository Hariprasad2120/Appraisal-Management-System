"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { DEFAULT_ORGANIZATION_ID } from "@/lib/tenant";
import { setBrowserSessionCookie } from "@/lib/session";

type LoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; message: string };

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sanitizeCallbackUrl(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/role-redirect";
  if (!value.startsWith("/") || value.startsWith("//")) return "/role-redirect";
  if (value.startsWith("/api/")) return "/role-redirect";
  if (/\.[a-z0-9]+(?:$|\?)/i.test(value)) return "/role-redirect";
  return value;
}

function sanitizeReturnedUrl(value: unknown, fallback: string): string | null {
  if (typeof value !== "string" || value.length === 0) return fallback;

  try {
    const url = new URL(value, "http://app.local");
    if (url.searchParams.has("error")) return null;
    if (url.pathname.startsWith("/api/")) return fallback;
    if (/\.[a-z0-9]+$/i.test(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export async function loginWithCredentials(formData: FormData): Promise<LoginResult> {
  const email = formData.get("email");
  const password = formData.get("password");
  const redirectTo = sanitizeCallbackUrl(formData.get("callbackUrl"));

  if (typeof email !== "string" || typeof password !== "string") {
    return { ok: false, message: "Enter your email and password." };
  }

  const normalizedEmail = normalizeEmail(email);

  try {
    const result = await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirectTo,
      redirect: false,
    });

    const safeRedirect = sanitizeReturnedUrl(result, redirectTo);
    if (!safeRedirect) {
      return { ok: false, message: "Invalid email or password. Please try again." };
    }

    await setBrowserSessionCookie();
    return { ok: true, redirectTo: safeRedirect };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, message: "Invalid email or password. Please try again." };
    }
    console.error("Login failed", error);
    return { ok: false, message: "Sign in failed. Please try again." };
  }
}

export async function requestPasswordResetAction(formData: FormData) {
  const emailRaw = formData.get("email");
  if (typeof emailRaw === "string") {
    const email = normalizeEmail(emailRaw);
    const user = await prisma.user.findUnique({ where: { email } });
    if (user?.active) {
      const token = randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: {
          organizationId: user.organizationId ?? DEFAULT_ORGANIZATION_ID,
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });
      await prisma.securityEvent.create({
        data: { organizationId: user.organizationId ?? DEFAULT_ORGANIZATION_ID, userId: user.id, email, event: "PASSWORD_RESET_REQUEST", outcome: "SUCCESS" },
      });
      const baseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
      const resetUrl = new URL(`/login/reset?token=${token}`, baseUrl).toString();
      await sendEmail({
        to: email,
        subject: "Reset your appraisal portal password",
        html: `<p>Use this link to reset your password. It expires in 30 minutes and can be used once.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      }).catch(() => null);
    }
  }
  return { ok: true, message: "If the email is registered, a reset link has been sent." };
}

export async function resetPasswordAction(formData: FormData) {
  const token = formData.get("token");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  if (typeof token !== "string" || typeof password !== "string" || typeof confirmPassword !== "string") {
    return { ok: false, message: "Enter your new password." };
  }
  if (password !== confirmPassword) return { ok: false, message: "Passwords do not match." };
  if (password.length < 8) return { ok: false, message: "Password must be at least 8 characters." };
  const reset = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    return { ok: false, message: "Reset link is invalid or expired." };
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: reset.userId }, data: { passwordHash: await bcrypt.hash(password, 10) } }),
    prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    prisma.securityEvent.create({ data: { organizationId: reset.user.organizationId ?? DEFAULT_ORGANIZATION_ID, userId: reset.userId, email: reset.user.email, event: "PASSWORD_RESET_COMPLETED", outcome: "SUCCESS" } }),
  ]);
  return { ok: true, message: "Password updated. You can sign in now." };
}
