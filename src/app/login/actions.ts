"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";

type LoginResult =
  | { ok: true; challengeToken: string; passkeySetupRequired: boolean }
  | { ok: false; message: string };

type PasskeyResult =
  | { ok: true; redirectTo: string }
  | { ok: false; message: string };

const passkeyPattern = /^\d{4}$|^\d{6}$/;

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sanitizeCallbackUrl(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith("/api/")) return "/";
  if (/\.[a-z0-9]+(?:$|\?)/i.test(value)) return "/";
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

  try {
    const normalizedEmail = normalizeEmail(email);
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user?.active) {
      return { ok: false, message: "Invalid email or password. Please try again." };
    }
    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      await prisma.securityEvent.create({
        data: {
          userId: user.id,
          email: normalizedEmail,
          event: "LOGIN_PASSWORD_STEP",
          outcome: "FAILED",
          details: { reason: "INVALID_PASSWORD" },
        },
      }).catch(() => null);
      return { ok: false, message: "Invalid email or password. Please try again." };
    }

    const challengeToken = randomBytes(32).toString("hex");
    await prisma.loginChallenge.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(challengeToken),
        redirectTo,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    await prisma.securityEvent.create({
      data: {
        userId: user.id,
        email: normalizedEmail,
        event: "LOGIN_PASSWORD_STEP",
        outcome: "SUCCESS",
      },
    }).catch(() => null);

    return {
      ok: true,
      challengeToken,
      passkeySetupRequired: !user.passkeyHash || user.passkeySetupRequired,
    };
  } catch (error) {
    console.error("Login password step failed", error);
    return { ok: false, message: "Sign in failed. Please try again." };
  }
}

export async function verifyPasskeyAction(formData: FormData): Promise<PasskeyResult> {
  const challengeToken = formData.get("challengeToken");
  const passkey = formData.get("passkey");
  const redirectTo = sanitizeCallbackUrl(formData.get("callbackUrl"));
  if (typeof challengeToken !== "string" || typeof passkey !== "string") {
    return { ok: false, message: "Enter your passkey." };
  }
  if (!passkeyPattern.test(passkey)) {
    return { ok: false, message: "Passkey must be 4 or 6 digits." };
  }

  try {
    const result = await signIn("credentials", {
      challengeToken,
      passkey,
      redirectTo,
      redirect: false,
    });

    const safeRedirect = sanitizeReturnedUrl(result, redirectTo);
    if (!safeRedirect) {
      return { ok: false, message: "Invalid email or password. Please try again." };
    }

    return { ok: true, redirectTo: safeRedirect };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, message: "Invalid email or password. Please try again." };
    }
    console.error("Login failed", error);
    return { ok: false, message: "Sign in failed. Please try again." };
  }
}

export async function setupPasskeyAction(formData: FormData): Promise<PasskeyResult> {
  const challengeToken = formData.get("challengeToken");
  const passkey = formData.get("passkey");
  const confirmPasskey = formData.get("confirmPasskey");
  if (typeof challengeToken !== "string" || typeof passkey !== "string" || typeof confirmPasskey !== "string") {
    return { ok: false, message: "Enter and confirm your passkey." };
  }
  if (passkey !== confirmPasskey) return { ok: false, message: "Passkeys do not match." };
  if (!passkeyPattern.test(passkey)) return { ok: false, message: "Passkey must be 4 or 6 digits." };

  const challenge = await prisma.loginChallenge.findUnique({
    where: { tokenHash: hashToken(challengeToken) },
    include: { user: true },
  });
  if (!challenge || challenge.usedAt || challenge.expiresAt < new Date()) {
    return { ok: false, message: "Your login verification expired. Please sign in again." };
  }
  const openReset = await prisma.passkeyResetRequest.findFirst({
    where: { userId: challenge.userId, status: "APPROVED" },
    orderBy: { requestedAt: "desc" },
  });
  const allowed = !challenge.user.passkeyHash || challenge.user.passkeySetupRequired || Boolean(openReset);
  if (!allowed) return { ok: false, message: "Passkey setup is not approved for this account." };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: challenge.userId },
      data: { passkeyHash: await bcrypt.hash(passkey, 10), passkeySetupRequired: false },
    }),
    ...(openReset
      ? [prisma.passkeyResetRequest.update({ where: { id: openReset.id }, data: { status: "COMPLETED" } })]
      : []),
    prisma.securityEvent.create({
      data: {
        userId: challenge.userId,
        email: challenge.user.email,
        event: "PASSKEY_SETUP",
        outcome: "SUCCESS",
      },
    }),
  ]);

  return verifyPasskeyAction(formData);
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
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });
      await prisma.securityEvent.create({
        data: { userId: user.id, email, event: "PASSWORD_RESET_REQUEST", outcome: "SUCCESS" },
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
    prisma.securityEvent.create({ data: { userId: reset.userId, email: reset.user.email, event: "PASSWORD_RESET_COMPLETED", outcome: "SUCCESS" } }),
  ]);
  return { ok: true, message: "Password updated. You can sign in now." };
}

export async function requestPasskeyResetAction(formData: FormData) {
  const emailRaw = formData.get("email");
  if (typeof emailRaw === "string") {
    const email = normalizeEmail(emailRaw);
    const user = await prisma.user.findUnique({ where: { email } });
    if (user?.active) {
      await prisma.passkeyResetRequest.create({ data: { userId: user.id } });
      await prisma.securityEvent.create({ data: { userId: user.id, email, event: "PASSKEY_RESET_REQUEST", outcome: "SUCCESS" } });
    }
  }
  return { ok: true, message: "If the account exists, your admin will review the passkey reset request." };
}
