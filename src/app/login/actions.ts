"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

type LoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; message: string };

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
  const userAgent = formData.get("userAgent");
  const redirectTo = sanitizeCallbackUrl(formData.get("callbackUrl"));

  if (typeof email !== "string" || typeof password !== "string") {
    return { ok: false, message: "Enter your email and password." };
  }

  try {
    const result = await signIn("credentials", {
      email,
      password,
      userAgent: typeof userAgent === "string" ? userAgent : "",
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
