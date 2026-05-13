import { createHash } from "crypto";

export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
