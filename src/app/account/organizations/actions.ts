"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { setActiveOrganizationForUser } from "@/lib/tenant";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function switchActiveOrganizationAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const organizationId = text(formData, "organizationId");
  if (!organizationId) {
    throw new Error("Organization is required.");
  }

  const membership = await setActiveOrganizationForUser(session.user.id, organizationId);
  if (!membership) {
    throw new Error("Organization access not found.");
  }

  redirect("/account/dashboard");
}
