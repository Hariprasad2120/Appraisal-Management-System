import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";
import { randomBytes } from "crypto";

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
  email: z.string().email(),
  password: z.string().min(1),
});

function normalizeAttemptEmail(credentials: Partial<Record<string, unknown>> | undefined): string | null {
  const email = credentials?.email;
  return typeof email === "string" ? email.toLowerCase().trim() : null;
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
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials, req) => {
        const request = req as unknown as Request;
        const ipAddress = getClientIp(request) ?? null;
        const userAgent = request.headers?.get?.("user-agent") ?? null;
        const attemptedEmail = normalizeAttemptEmail(credentials);
        const parsed = credsSchema.safeParse(credentials);
        if (!parsed.success) {
          await recordLoginAttempt({
            email: attemptedEmail,
            outcome: "FAILED",
            reason: "INVALID_CREDENTIAL_FORMAT",
            ipAddress,
            userAgent,
          });
          return null;
        }
        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
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
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          await recordLoginAttempt({
            userId: user.id,
            email,
            outcome: "FAILED",
            reason: "INVALID_PASSWORD",
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
  ],
  callbacks: {
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
