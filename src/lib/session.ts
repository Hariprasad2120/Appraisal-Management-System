import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const DEFAULT_SESSION_TIMEOUT_MINUTES = 10;
export const SESSION_TIMEOUT_SETTING_KEY = "SESSION_TIMEOUT_MINUTES";
export const BROWSER_SESSION_COOKIE_NAME = "ams-browser-session";

function isSecureCookie() {
  return process.env.NODE_ENV === "production";
}

export async function setBrowserSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(BROWSER_SESSION_COOKIE_NAME, "1", {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: isSecureCookie(),
  });
}

export async function clearBrowserSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(BROWSER_SESSION_COOKIE_NAME, "", {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: isSecureCookie(),
    maxAge: 0,
  });
}

export async function hasBrowserSessionCookie() {
  const cookieStore = await cookies();
  return Boolean(cookieStore.get(BROWSER_SESSION_COOKIE_NAME)?.value);
}

export function requestHasBrowserSessionCookie(request: NextRequest) {
  return Boolean(request.cookies.get(BROWSER_SESSION_COOKIE_NAME)?.value);
}

export async function getSessionTimeoutMinutes(organizationId?: string | null) {
  if (!organizationId) return DEFAULT_SESSION_TIMEOUT_MINUTES;
  const setting = await prisma.systemSetting.findFirst({
    where: { organizationId, key: SESSION_TIMEOUT_SETTING_KEY },
    select: { value: true },
  });
  const parsed = setting ? parseInt(setting.value, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : DEFAULT_SESSION_TIMEOUT_MINUTES;
}
