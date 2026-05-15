import { createHash } from "node:crypto";

/** Meta / TikTok user_data — normalized per provider docs (lowercase + trim). */
export function hashNormalizedEmail(email: string | null | undefined): string | null {
  const e = email?.trim().toLowerCase();
  if (!e) return null;
  return createHash("sha256").update(e).digest("hex");
}

/** E.164-style digits only before hash (minimal normalization). */
export function hashNormalizedPhoneDigits(phone: string | null | undefined): string | null {
  const d = phone?.replace(/\D/g, "") ?? "";
  if (d.length < 8) return null;
  return createHash("sha256").update(d).digest("hex");
}
