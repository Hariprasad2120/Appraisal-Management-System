import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { Role } from "@/generated/prisma/enums";
import { canAccessPath, ROLE_HOME } from "@/lib/rbac";

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/logo", "/Logo.png"];

function isPublicAsset(pathname: string) {
  return /\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|webmanifest)$/i.test(pathname);
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isHttps =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || isPublicAsset(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  let token: {
    role?: Role;
    secondaryRole?: Role | null;
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

  if (!token?.role) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const { role, secondaryRole } = token;

  if (pathname === "/" || pathname === "/dashboard") {
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME[role];
    return NextResponse.redirect(url);
  }

  if (!canAccessPath(role, pathname, secondaryRole)) {
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME[role];
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)"],
};
