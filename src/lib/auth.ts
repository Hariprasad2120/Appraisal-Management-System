import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";
import { createHash, randomBytes } from "crypto";

if (process.env.NODE_ENV === "production") {
  for (const key of ["NEXTAUTH_URL", "AUTH_URL"] as const) {
    const value = process.env[key];
    if (value?.includes("localhost")) delete process.env[key];
  }
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      secondaryRole: Role | null;
      sessionToken: string;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    secondaryRole: Role | null;
    sessionToken: string;
  }
}

const credsSchema = z.object({
  challengeToken: z.string().min(32),
  passkey: z.string().regex(/^\d{4}$|^\d{6}$/),
});

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? null;
}

function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return "an unknown device";
  if (/Edg\//.test(userAgent)) return "Microsoft Edge";
  if (/Chrome\//.test(userAgent)) return "Chrome";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  if (/Safari\//.test(userAgent)) return "Safari";
  return "a browser";
}

async function recordLoginAttempt(input: {
  userId?: string | null;
  email: string | null;
  outcome: "SUCCESS" | "FAILED";
  reason?: string;
  ipAddress: string | null;
  userAgent: string | null;
  sessionToken?: string;
}) {
  try {
    await prisma.securityEvent.create({
      data: {
        userId: input.userId ?? null,
        email: input.email,
        event: "LOGIN_ATTEMPT",
        outcome: input.outcome,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        sessionToken: input.sessionToken,
        details: input.reason ? { reason: input.reason } : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to record login attempt", error);
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        challengeToken: { label: "Challenge", type: "text" },
        passkey: { label: "Passkey", type: "password" },
      },
      authorize: async (credentials, req) => {
        const request = req as unknown as Request;
        const ipAddress = getClientIp(request) ?? null;
        const userAgent = request.headers?.get?.("user-agent") ?? null;
        const parsed = credsSchema.safeParse(credentials);
        if (!parsed.success) {
          await recordLoginAttempt({
            email: null,
            outcome: "FAILED",
            reason: "INVALID_CREDENTIAL_FORMAT",
            ipAddress,
            userAgent,
          });
          return null;
        }
        const { challengeToken, passkey } = parsed.data;
        const challenge = await prisma.loginChallenge.findUnique({
          where: { tokenHash: hashToken(challengeToken) },
          include: { user: true },
        });
        const email = challenge?.user.email ?? null;
        if (!challenge || challenge.usedAt || challenge.expiresAt < new Date()) {
          await recordLoginAttempt({
            email,
            outcome: "FAILED",
            reason: "INVALID_OR_EXPIRED_CHALLENGE",
            ipAddress,
            userAgent,
          });
          return null;
        }

        const user = challenge.user;
        if (!user) {
          await recordLoginAttempt({
            email,
            outcome: "FAILED",
            reason: "USER_NOT_FOUND",
            ipAddress,
            userAgent,
          });
          return null;
        }
        if (!user.passkeyHash || user.passkeySetupRequired) {
          await recordLoginAttempt({
            userId: user.id,
            email,
            outcome: "FAILED",
            reason: "PASSKEY_SETUP_REQUIRED",
            ipAddress,
            userAgent,
          });
          return null;
        }
        if (!user.active) {
          await recordLoginAttempt({
            userId: user.id,
            email,
            outcome: "FAILED",
            reason: "USER_INACTIVE",
            ipAddress,
            userAgent,
          });
          return null;
        }
        const ok = await bcrypt.compare(passkey, user.passkeyHash);
        if (!ok) {
          await recordLoginAttempt({
            userId: user.id,
            email,
            outcome: "FAILED",
            reason: "INVALID_PASSKEY",
            ipAddress,
            userAgent,
          });
          return null;
        }

        const sessionToken = randomBytes(32).toString("hex");

        // Close any stale ACTIVE sessions for this user
        const staleSessions = await prisma.userSession.updateMany({
          where: { userId: user.id, status: "ACTIVE" },
          data: { status: "LOGGED_OUT", logoutAt: new Date() },
        });

        await prisma.loginChallenge.update({
          where: { id: challenge.id },
          data: { usedAt: new Date() },
        });

        await prisma.userSession.create({
          data: {
            userId: user.id,
            token: sessionToken,
            ipAddress,
            userAgent,
          },
        });

        await prisma.securityEvent.createMany({
          data: [
            ...(staleSessions.count > 0
              ? [{
                  userId: user.id,
                  email: user.email,
                  event: "SESSION_ENDED",
                  outcome: "SUCCESS",
                  ipAddress,
                  userAgent,
                  details: { reason: "REPLACED_BY_NEW_LOGIN", closedSessions: staleSessions.count },
                }]
              : []),
            {
              userId: user.id,
              email: user.email,
              event: "LOGIN_ATTEMPT",
              outcome: "SUCCESS",
              ipAddress,
              userAgent,
              sessionToken,
            },
            {
              userId: user.id,
              email: user.email,
              event: "SESSION_STARTED",
              outcome: "SUCCESS",
              ipAddress,
              userAgent,
              sessionToken,
            },
          ],
        });

        const loginNotifications = await prisma.systemSetting.findUnique({
          where: { key: "LOGIN_ACTIVITY_NOTIFICATIONS" },
        });

        if (loginNotifications?.value !== "false") {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: "LOGIN_ACTIVITY",
              message: `New login to your account from ${describeUserAgent(userAgent)}${ipAddress ? ` at ${ipAddress}` : ""}.`,
              link: null,
              persistent: true,
              critical: true,
              important: true,
            },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          secondaryRole: user.secondaryRole ?? null,
          sessionToken,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
  ],
  callbacks: {
    signIn: async ({ user, account, profile }) => {
      if (account?.provider !== "google") return true;
      const email = user.email?.toLowerCase().trim();
      const verified = (profile as { email_verified?: boolean } | undefined)?.email_verified === true;
      if (!email || !verified) return false;
      const approved = await prisma.user.findUnique({
        where: { email },
        select: { id: true, active: true, googleLoginAllowed: true },
      });
      if (!approved?.active || !approved.googleLoginAllowed) return false;
      const challengeToken = randomBytes(32).toString("hex");
      await prisma.loginChallenge.create({
        data: {
          userId: approved.id,
          provider: "google",
          tokenHash: hashToken(challengeToken),
          redirectTo: "/",
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });
      return `/login?challenge=${challengeToken}&provider=google`;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: Role }).role;
        token.secondaryRole = (user as { secondaryRole: Role | null }).secondaryRole ?? null;
        token.sessionToken = (user as { sessionToken: string }).sessionToken;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.secondaryRole = token.secondaryRole ?? null;
        session.user.sessionToken = token.sessionToken;
      }
      return session;
    },
  },
});
