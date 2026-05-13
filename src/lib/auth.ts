import NextAuth, { type DefaultSession } from "next-auth";
import { cache } from "react";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { AccountRole, PlatformRole, Role } from "@/generated/prisma/enums";
import { getActiveOrganizationForUser, getEnabledModuleKeys, getPrimaryAccountContextForUser } from "@/lib/tenant";
import { randomBytes } from "crypto";

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
      platformRole: PlatformRole | null;
      accountId: string | null;
      accountRole: AccountRole | null;
      accountName: string | null;
      activeOrganizationId: string | null;
      organizationSlug: string;
      organizationName: string;
      enabledModules: string[];
      sessionToken: string;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    secondaryRole: Role | null;
    platformRole: PlatformRole | null;
    accountId: string | null;
    accountRole: AccountRole | null;
    accountName: string | null;
    activeOrganizationId: string | null;
    organizationSlug: string;
    organizationName: string;
    enabledModules: string[];
    sessionToken: string;
    refreshedAt: number;
  }
}

const credsSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(1),
});

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
        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email },
        });
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
        if (user.status && user.status !== "ACTIVE") {
          await recordLoginAttempt({
            userId: user.id,
            email,
            outcome: "FAILED",
            reason: `USER_STATUS_${user.status}`,
            ipAddress,
            userAgent,
          });
          return null;
        }
        const passwordOk = await bcrypt.compare(password, user.passwordHash);
        if (!passwordOk) {
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
        const activeOrganization = await getActiveOrganizationForUser(
          user.id,
          user.activeOrganizationId ?? user.organizationId,
        );
        const activeOrganizationId = activeOrganization?.id ?? null;
        const organizationSlug = activeOrganization?.slug ?? "";
        const organizationName = activeOrganization?.name ?? (user.platformRole === "PLATFORM_SUPER_ADMIN" ? "Platform" : "No organization access");
        const securityOrganizationId = activeOrganizationId ?? user.organizationId;
        const enabledModules = await getEnabledModuleKeys(activeOrganizationId);
        const accountContext = await getPrimaryAccountContextForUser(user.id, activeOrganizationId);

        // Close any stale ACTIVE sessions for this user
        const staleSessions = await prisma.userSession.updateMany({
          where: { userId: user.id, status: "ACTIVE" },
          data: { status: "LOGGED_OUT", logoutAt: new Date() },
        });

        await prisma.userSession.create({
          data: {
            organizationId: securityOrganizationId,
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
                  organizationId: securityOrganizationId,
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
              organizationId: securityOrganizationId,
              email: user.email,
              event: "LOGIN_ATTEMPT",
              outcome: "SUCCESS",
              ipAddress,
              userAgent,
              sessionToken,
            },
            {
              userId: user.id,
              organizationId: securityOrganizationId,
              email: user.email,
              event: "SESSION_STARTED",
              outcome: "SUCCESS",
              ipAddress,
              userAgent,
              sessionToken,
            },
          ],
        });

        const loginNotifications = await prisma.systemSetting.findFirst({
          where: { key: "LOGIN_ACTIVITY_NOTIFICATIONS" },
        });

        if (loginNotifications?.value !== "false") {
          await prisma.notification.create({
            data: {
              organizationId: securityOrganizationId,
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
          platformRole: user.platformRole ?? null,
          accountId: accountContext?.account.id ?? null,
          accountRole: accountContext?.accountRole ?? null,
          accountName: accountContext?.account.name ?? null,
          activeOrganizationId,
          organizationSlug,
          organizationName,
          enabledModules,
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
        select: { active: true, googleLoginAllowed: true },
      });
      return Boolean(approved?.active && approved.googleLoginAllowed);
    },
    jwt: async ({ token, user, trigger }) => {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: Role }).role;
        token.secondaryRole = (user as { secondaryRole: Role | null }).secondaryRole ?? null;
        token.platformRole = (user as { platformRole: PlatformRole | null }).platformRole ?? null;
        token.accountId = (user as { accountId: string | null }).accountId ?? null;
        token.accountRole = (user as { accountRole: AccountRole | null }).accountRole ?? null;
        token.accountName = (user as { accountName: string | null }).accountName ?? null;
        token.activeOrganizationId = (user as { activeOrganizationId: string | null }).activeOrganizationId ?? null;
        token.organizationSlug = (user as { organizationSlug: string }).organizationSlug;
        token.organizationName = (user as { organizationName: string }).organizationName;
        token.enabledModules = (user as { enabledModules: string[] }).enabledModules ?? [];
        token.sessionToken = (user as { sessionToken: string }).sessionToken;
        token.refreshedAt = Date.now();
        return token;
      }

      // Short-circuit: skip DB on most requests — only refresh every 10 minutes or on explicit trigger
      const TOKEN_REFRESH_MS = 10 * 60 * 1000;
      const needsRefresh =
        trigger === "update" ||
        !token.refreshedAt ||
        Date.now() - token.refreshedAt > TOKEN_REFRESH_MS;

      if (!needsRefresh || !token.id) return token;

      const currentUser = await prisma.user.findUnique({
        where: { id: token.id },
        select: {
          role: true,
          secondaryRole: true,
          platformRole: true,
          status: true,
          activeOrganizationId: true,
          organizationId: true,
        },
      });
      if (!currentUser || currentUser.status !== "ACTIVE") return token;

      const orgId = currentUser.activeOrganizationId ?? currentUser.organizationId;
      const [activeOrganization, accountContext, enabledModules] = await Promise.all([
        getActiveOrganizationForUser(token.id, orgId),
        getPrimaryAccountContextForUser(token.id, orgId),
        getEnabledModuleKeys(orgId),
      ]);

      token.role = currentUser.role;
      token.secondaryRole = currentUser.secondaryRole ?? null;
      token.platformRole = currentUser.platformRole ?? null;
      token.accountId = accountContext?.account.id ?? null;
      token.accountRole = accountContext?.accountRole ?? null;
      token.accountName = accountContext?.account.name ?? null;
      token.activeOrganizationId = activeOrganization?.id ?? null;
      token.organizationSlug = activeOrganization?.slug ?? "";
      token.organizationName = activeOrganization?.name ?? "Platform";
      token.enabledModules = enabledModules;
      token.refreshedAt = Date.now();

      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.secondaryRole = token.secondaryRole ?? null;
        session.user.platformRole = token.platformRole ?? null;
        session.user.accountId = token.accountId ?? null;
        session.user.accountRole = token.accountRole ?? null;
        session.user.accountName = token.accountName ?? null;
        session.user.activeOrganizationId = token.activeOrganizationId ?? null;
        session.user.organizationSlug = token.organizationSlug;
        session.user.organizationName = token.organizationName;
        session.user.enabledModules = token.enabledModules ?? [];
        session.user.sessionToken = token.sessionToken;
      }
      return session;
    },
  },
});

// Memoize per-request so multiple RSC components share one JWT decode + callback
export const getCachedSession = cache(auth);
