/** Cookie HTTP-only do server set sau khi ?ref= hợp lệ — client không spoof được. */

export const ZENDO_AF_REF_COOKIE = "zendo_af_ref";

/** Max-age tính từ số ngày cookie của chương trình AFF (clamp 1–365). */
export function referralCookieMaxAgeSeconds(cookieDurationDays: number): number {
  const d = Math.min(365, Math.max(1, Math.floor(cookieDurationDays || 30)));
  return d * 24 * 60 * 60;
}
