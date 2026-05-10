import type { DealsSectionConfig } from "../settings";

export type DealsValidationWarning = {
  severity?: "info" | "warning" | "critical";
  code:
    | "DUPLICATE_SECTION_ID"
    | "INVALID_SOURCE_TYPE"
    | "INVALID_PRESET"
    | "INVALID_COUNTDOWN_DATE"
    | "INVALID_SCHEDULE"
    | "MISSING_BANNER"
    | "MISSING_PRODUCT_IDS"
    | "MISSING_COUPON_IDS"
    | "EXPIRED_COUPONS";
  message: string;
  sectionId?: string;
  data?: Record<string, unknown>;
};

function isValidIsoDate(value?: string): boolean {
  const v = (value || "").trim();
  if (!v) return true;
  const d = new Date(v);
  return Number.isFinite(d.getTime());
}

const PRESETS = new Set(["flash-sale", "luxury", "tet", "neon", "minimal", "dark-sale"]);
const PRODUCT_SOURCE_TYPES = new Set([
  "sale",
  "featured",
  "trending",
  "newest",
  "under_price",
  "manual",
  "category",
]);

export async function validateDealsSectionsDraft(
  sections: DealsSectionConfig[],
  deps: {
    findExistingProductIds: (ids: string[]) => Promise<Set<string>>;
    findExistingCouponIds: (ids: string[]) => Promise<Set<string>>;
    findExpiredCouponIds: (ids: string[], now: Date) => Promise<Set<string>>;
  },
  schedule?: { publishAt?: string | null; unpublishAt?: string | null },
  now = new Date(),
): Promise<DealsValidationWarning[]> {
  const warnings: DealsValidationWarning[] = [];
  const rows = Array.isArray(sections) ? sections : [];

  if (schedule) {
    const publishAt = (schedule.publishAt || "").trim();
    const unpublishAt = (schedule.unpublishAt || "").trim();
    const p = publishAt ? new Date(publishAt) : null;
    const u = unpublishAt ? new Date(unpublishAt) : null;
    const pOk = !publishAt || Number.isFinite(p!.getTime());
    const uOk = !unpublishAt || Number.isFinite(u!.getTime());
    if (!pOk || !uOk || (p && u && p.getTime() >= u.getTime())) {
      warnings.push({
        severity: "critical",
        code: "INVALID_SCHEDULE",
        message: "Invalid schedule: publishAt/unpublishAt must be valid ISO and publishAt < unpublishAt.",
        data: { publishAt: schedule.publishAt ?? "", unpublishAt: schedule.unpublishAt ?? "" },
      });
    }
  }

  const seen = new Set<string>();
  for (const s of rows) {
    if (!s?.id) continue;
    if (seen.has(s.id)) {
      warnings.push({
        severity: "critical",
        code: "DUPLICATE_SECTION_ID",
        message: `Duplicate section id: ${s.id}`,
        sectionId: s.id,
      });
    }
    seen.add(s.id);

    const st = s.productSource?.type;
    if (st && !PRODUCT_SOURCE_TYPES.has(st)) {
      warnings.push({
        severity: "critical",
        code: "INVALID_SOURCE_TYPE",
        message: `Invalid productSource.type: ${st}`,
        sectionId: s.id,
        data: { type: st },
      });
    }

    const preset = s.theme?.preset;
    if (preset && !PRESETS.has(preset)) {
      warnings.push({
        severity: "warning",
        code: "INVALID_PRESET",
        message: `Invalid theme preset: ${preset}`,
        sectionId: s.id,
        data: { preset },
      });
    }

    const b = s.banner as unknown;
    if (b && typeof b === "object" && !Array.isArray(b)) {
      const bo = b as Record<string, unknown>;
      const d = typeof bo.desktopImage === "string" ? bo.desktopImage : "";
      const m = typeof bo.mobileImage === "string" ? bo.mobileImage : "";
      if (!d.trim() && !m.trim()) {
        warnings.push({
          severity: "info",
          code: "MISSING_BANNER",
          message: "Banner is configured but missing images.",
          sectionId: s.id,
        });
      }
    }

    const c = s.countdown;
    if (c?.enabled) {
      if (!isValidIsoDate(c.startsAt) || !isValidIsoDate(c.endsAt)) {
        warnings.push({
          severity: "critical",
          code: "INVALID_COUNTDOWN_DATE",
          message: "Countdown date is not a valid ISO date string.",
          sectionId: s.id,
          data: { startsAt: c.startsAt ?? "", endsAt: c.endsAt ?? "" },
        });
      }
    }
  }

  const productIds = Array.from(
    new Set(
      rows.flatMap((s) => (s.productSource?.type === "manual" ? (s.productSource.productIds ?? []) : [])),
    ),
  ).filter(Boolean);
  if (productIds.length) {
    const existing = await deps.findExistingProductIds(productIds);
    const missing = productIds.filter((id) => !existing.has(id));
    if (missing.length) {
      warnings.push({
        severity: "critical",
        code: "MISSING_PRODUCT_IDS",
        message: `Missing product IDs: ${missing.slice(0, 20).join(", ")}${missing.length > 20 ? "..." : ""}`,
        data: { missingCount: missing.length },
      });
    }
  }

  const couponIds = Array.from(
    new Set(rows.flatMap((s) => (s.type === "voucher_hot" ? (s.voucherSource?.couponIds ?? []) : []))),
  ).filter(Boolean);
  if (couponIds.length) {
    const existing = await deps.findExistingCouponIds(couponIds);
    const missing = couponIds.filter((id) => !existing.has(id));
    if (missing.length) {
      warnings.push({
        severity: "critical",
        code: "MISSING_COUPON_IDS",
        message: `Missing coupon IDs: ${missing.slice(0, 20).join(", ")}${missing.length > 20 ? "..." : ""}`,
        data: { missingCount: missing.length },
      });
    }

    const expired = await deps.findExpiredCouponIds(couponIds, now);
    if (expired.size) {
      warnings.push({
        severity: "warning",
        code: "EXPIRED_COUPONS",
        message: `Expired/inactive coupons: ${Array.from(expired).slice(0, 20).join(", ")}${expired.size > 20 ? "..." : ""}`,
        data: { expiredCount: expired.size },
      });
    }
  }

  return warnings;
}

