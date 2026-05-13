import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { AccountRole, Role } from "@/generated/prisma/enums";
import { canAccessPath, isModuleEnabledForPath, ROLE_HOME } from "@/lib/rbac";
import { requestHasBrowserSessionCookie } from "@/lib/session";
import { getEnabledModuleKeys } from "@/lib/tenant";
import { getModuleDisabledRedirect } from "@/lib/workspace-navigation";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/pricing",
  "/register",
  "/request-demo",
  "/activate-invite",
  "/unauthorized",
  "/no-organization-access",
  "/api/auth",
  "/api/logo",
  "/Logo.png",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`));
}

function isPublicAsset(pathname: string) {
  return /\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|webmanifest)$/i.test(pathname);
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isHttps =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";
  const hasBrowserSession = requestHasBrowserSessionCookie(request);

  if (isPublicPath(pathname) || isPublicAsset(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  let token: {
    role?: Role;
    secondaryRole?: Role | null;
    platformRole?: "PLATFORM_SUPER_ADMIN" | null;
    accountId?: string | null;
    accountRole?: AccountRole | null;
    activeOrganizationId?: string | null;
    enabledModules?: string[];
  } | null;
  try {
    token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
      secureCookie: isHttps,
    });
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (!token?.role || !hasBrowserSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const { role, secondaryRole, platformRole, accountId, accountRole, activeOrganizationId } = token;

  if (pathname === "/" || pathname === "/pricing" || pathname === "/register" || pathname === "/request-demo") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/platform") || pathname.startsWith("/platform-admin")) {
    if (platformRole === "PLATFORM_SUPER_ADMIN") {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME[role];
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/account")) {
    const isSharedAccountRoute =
      pathname === "/account/dashboard" ||
      pathname.startsWith("/account/dashboard?") ||
      pathname === "/account/organizations" ||
      pathname.startsWith("/account/organizations?");

    if (isSharedAccountRoute && activeOrganizationId) {
      return NextResponse.next();
    }

    if (accountId && (accountRole === "ACCOUNT_OWNER" || accountRole === "ACCOUNT_ADMIN")) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  if (pathname === "/dashboard") {
    const url = request.nextUrl.clone();
    url.pathname = platformRole === "PLATFORM_SUPER_ADMIN" ? "/platform-admin" : "/role-redirect";
    return NextResponse.redirect(url);
  }

  if (platformRole === "PLATFORM_SUPER_ADMIN" && !activeOrganizationId) {
    const url = request.nextUrl.clone();
    url.pathname = "/platform-admin";
    return NextResponse.redirect(url);
  }

  const resolvedEnabledModules = activeOrganizationId
    ? await getEnabledModuleKeys(activeOrganizationId)
    : token.enabledModules;

  if (!isModuleEnabledForPath(pathname, resolvedEnabledModules)) {
    const redirectUrl = new URL(getModuleDisabledRedirect(pathname), request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (!canAccessPath(role, pathname, secondaryRole, resolvedEnabledModules)) {
    const url = request.nextUrl.clone();
    url.pathname = platformRole === "PLATFORM_SUPER_ADMIN" ? "/platform-admin" : ROLE_HOME[role];
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)"],
};
