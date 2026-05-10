import type { DealsValidationWarning } from "./validate";
import { validateDealsSectionsDraft } from "./validate";
import type { DealsSectionConfig } from "../settings";
import { CouponStatus } from "@prisma/client";

export type HealthSeverity = "info" | "warning" | "critical";

export type DealsHealthItem = {
  severity: HealthSeverity;
  title: string;
  count: number;
  details?: string[];
};

export type DealsHealthSummary = {
  generatedAt: string;
  items: DealsHealthItem[];
  totals: { info: number; warning: number; critical: number };
};

export async function getDealsHealthSummary(db: {
  setting: { findUnique: (args: Record<string, unknown>) => Promise<{ value?: unknown } | null> };
  product: { findMany: (args: Record<string, unknown>) => Promise<Array<{ id: string }>> };
  coupon: { findMany: (args: Record<string, unknown>) => Promise<Array<{ id: string }>> };
}): Promise<DealsHealthSummary> {
  const now = new Date();
  const [publishedRow, draftRow, scheduledRow, metaRow] = await Promise.all([
    db.setting.findUnique({ where: { key: "website_settings" }, select: { value: true } }),
    db.setting.findUnique({ where: { key: "deals_sections_draft" }, select: { value: true } }),
    db.setting.findUnique({ where: { key: "deals_sections_scheduled" }, select: { value: true } }),
    db.setting.findUnique({ where: { key: "deals_sections_published_meta" }, select: { value: true } }),
  ]);

  const publishedValue =
    publishedRow?.value && typeof publishedRow.value === "object" && !Array.isArray(publishedRow.value)
      ? (publishedRow.value as Record<string, unknown>)
      : {};
  const publishedSections = (Array.isArray(publishedValue.dealsSections) ? publishedValue.dealsSections : []) as DealsSectionConfig[];

  const draftSections = (Array.isArray(draftRow?.value) ? draftRow?.value : []) as DealsSectionConfig[];

  const scheduledValue =
    scheduledRow?.value && typeof scheduledRow.value === "object" && !Array.isArray(scheduledRow.value)
      ? (scheduledRow.value as Record<string, unknown>)
      : null;
  const scheduledSections = (Array.isArray(scheduledValue?.sections) ? scheduledValue?.sections : []) as DealsSectionConfig[];
  const scheduledPublishAt = (scheduledValue?.publishAt as string) || "";
  const scheduledUnpublishAt = (scheduledValue?.unpublishAt as string) || "";

  const meta =
    metaRow?.value && typeof metaRow.value === "object" && !Array.isArray(metaRow.value)
      ? (metaRow.value as Record<string, unknown>)
      : null;
  const metaPublishAt = (meta?.publishAt as string) || "";
  const metaUnpublishAt = (meta?.unpublishAt as string) || "";

  const deps = {
    findExistingProductIds: async (ids: string[]) => {
      const rows = await db.product.findMany({ where: { id: { in: ids } }, select: { id: true } });
      return new Set(rows.map((r) => r.id));
    },
    findExistingCouponIds: async (ids: string[]) => {
      const rows = await db.coupon.findMany({ where: { id: { in: ids } }, select: { id: true } });
      return new Set(rows.map((r) => r.id));
    },
    findExpiredCouponIds: async (ids: string[], nowDate: Date) => {
      const rows = await db.coupon.findMany({
        where: {
          id: { in: ids },
          OR: [{ status: { not: ("ACTIVE" as CouponStatus) } }, { endsAt: { lt: nowDate } }],
        },
        select: { id: true },
      });
      return new Set(rows.map((r) => r.id));
    },
  };

  const issues: DealsValidationWarning[] = [];
  issues.push(...(await validateDealsSectionsDraft(publishedSections, deps, { publishAt: metaPublishAt, unpublishAt: metaUnpublishAt }, now)));
  if (draftSections.length) issues.push(...(await validateDealsSectionsDraft(draftSections, deps, undefined, now)));
  if (scheduledSections.length) issues.push(...(await validateDealsSectionsDraft(scheduledSections, deps, { publishAt: scheduledPublishAt, unpublishAt: scheduledUnpublishAt }, now)));

  const items: DealsHealthItem[] = [];
  const byCode = new Map<string, DealsValidationWarning[]>();
  for (const w of issues) {
    const k = w.code;
    byCode.set(k, [...(byCode.get(k) ?? []), w]);
  }

  const toSeverity = (w: DealsValidationWarning): HealthSeverity => (w.severity ?? "warning") as HealthSeverity;
  for (const [code, list] of byCode) {
    const sev = toSeverity(list[0]!);
    items.push({
      severity: sev,
      title: code,
      count: list.length,
      details: list.slice(0, 5).map((x) => x.message),
    });
  }

  const totals = { info: 0, warning: 0, critical: 0 };
  for (const it of items) totals[it.severity] += it.count;

  return { generatedAt: now.toISOString(), items: items.sort((a, b) => a.severity.localeCompare(b.severity)), totals };
}

