import type { Metadata } from "next";
import { getWebsiteSettings } from "../../../../lib/settings";
import { buildDynamicMetadata } from "../../../../lib/seo";
import { resolveDealsSections } from "../../../../lib/deals/resolve-sections";
import { resolveDealsSectionProducts } from "../../../../lib/deals/resolve-products";
import { resolveDealsSectionCoupons } from "../../../../lib/deals/resolve-vouchers";
import DealsSectionShell from "../../../../components/storefront/deals/DealsSectionShell";
import DealsSectionHeader from "../../../../components/storefront/deals/DealsSectionHeader";
import DealsHeroBanner from "../../../../components/storefront/deals/DealsHeroBanner";
import DealsVoucherRail from "../../../../components/storefront/deals/DealsVoucherRail";
import DealsProductRail from "../../../../components/storefront/deals/DealsProductRail";
import DealsEmptyState from "../../../../components/storefront/deals/DealsEmptyState";
import DealsSectionMetrics from "../../../../components/storefront/deals/DealsSectionMetrics";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import type { DealsSectionConfig } from "../../../../lib/settings";
import DealsPreviewAutoRefresh from "../../../../components/storefront/deals/DealsPreviewAutoRefresh";
import { invalidateDealsCaches } from "../../../../lib/deals/invalidate";
import { parseIsoOrNull } from "../../../../lib/deals/schedule";
import { Prisma } from "@prisma/client";
import { appendDealsAuditEntry } from "../../../../lib/deals/audit";
import { resolveCampaignStatus } from "../../../../lib/deals/schedule";
import { verifyDealsPreviewToken } from "../../../../lib/deals/preview-token";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildDynamicMetadata({
    title: "Ưu đãi | Zendo.vn",
    description: "Khám phá flash sale, voucher và các deal đang diễn ra tại Zendo.vn.",
    path: "/uu-dai",
  });
}

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function runDealsScheduleAutomation(db: Awaited<ReturnType<typeof getDbClient>>): Promise<{
  overrideSections?: DealsSectionConfig[];
}> {
  if (!db) return {};
  const now = new Date();
  const [scheduledRow, metaRow] = await Promise.all([
    db.setting.findUnique({ where: { key: "deals_sections_scheduled" }, select: { value: true } }),
    db.setting.findUnique({ where: { key: "deals_sections_published_meta" }, select: { value: true } }),
  ]);

  const scheduled =
    scheduledRow?.value && typeof scheduledRow.value === "object" && !Array.isArray(scheduledRow.value)
      ? (scheduledRow.value as Record<string, unknown>)
      : null;
  const scheduledPublishAt = parseIsoOrNull((scheduled?.publishAt as string) || "");
  const scheduledSections =
    Array.isArray(scheduled?.sections) ? (scheduled?.sections as unknown as DealsSectionConfig[]) : null;

  const meta =
    metaRow?.value && typeof metaRow.value === "object" && !Array.isArray(metaRow.value)
      ? (metaRow.value as Record<string, unknown>)
      : null;
  const unpublishAt = parseIsoOrNull((meta?.unpublishAt as string) || "");
  const expiredAt = (meta?.expiredAt as string) || "";

  // Auto-activate scheduled campaign when publishAt reached
  if (scheduled && scheduledPublishAt && scheduledSections && now >= scheduledPublishAt) {
    await db.$transaction(async (tx) => {
      const sr = await tx.setting.findUnique({ where: { key: "deals_sections_scheduled" }, select: { value: true } });
      const scheduled2 =
        sr?.value && typeof sr.value === "object" && !Array.isArray(sr.value) ? (sr.value as Record<string, unknown>) : null;
      const publishAt2 = parseIsoOrNull((scheduled2?.publishAt as string) || "");
      const sections2 = Array.isArray(scheduled2?.sections) ? (scheduled2?.sections as unknown as DealsSectionConfig[]) : null;
      if (!scheduled2 || !publishAt2 || !sections2 || now < publishAt2) return;

      const wr = await tx.setting.findUnique({ where: { key: "website_settings" }, select: { value: true } });
      const websiteValue =
        wr?.value && typeof wr.value === "object" && !Array.isArray(wr.value) ? (wr.value as Record<string, unknown>) : {};
      const currentSections = Array.isArray(websiteValue.dealsSections)
        ? (websiteValue.dealsSections as unknown as DealsSectionConfig[])
        : [];

      await tx.setting.upsert({
        where: { key: "website_settings" },
        update: { value: toJson({ ...websiteValue, dealsSections: sections2 }), group: "website", description: "Website settings", isPublic: true },
        create: { key: "website_settings", value: toJson({ ...websiteValue, dealsSections: sections2 }), group: "website", description: "Website settings", isPublic: true },
      });

      await tx.setting.upsert({
        where: { key: "deals_sections_published_meta" },
        update: {
          value: toJson({ publishedAt: now.toISOString(), publishedBy: { id: "system", role: "SYSTEM" }, publishAt: scheduled2?.publishAt ?? null, unpublishAt: scheduled2?.unpublishAt ?? null, prevSections: currentSections }),
          group: "website",
          description: "Deals publish meta",
          isPublic: false,
        },
        create: {
          key: "deals_sections_published_meta",
          value: toJson({ publishedAt: now.toISOString(), publishedBy: { id: "system", role: "SYSTEM" }, publishAt: scheduled2?.publishAt ?? null, unpublishAt: scheduled2?.unpublishAt ?? null, prevSections: currentSections }),
          group: "website",
          description: "Deals publish meta",
          isPublic: false,
        },
      });

      await tx.setting.deleteMany({ where: { key: "deals_sections_scheduled" } });
    });

    invalidateDealsCaches();
    try {
      await appendDealsAuditEntry(db, {
        action: "auto_activate",
        actorId: "system",
        actorName: "SYSTEM",
        metadata: { publishAt: (scheduled?.publishAt as string) || undefined, unpublishAt: (scheduled?.unpublishAt as string) || undefined },
      });
    } catch {
      // ignore
    }
    return { overrideSections: scheduledSections };
  }

  // Auto-expire current campaign when unpublishAt reached
  if (unpublishAt && now > unpublishAt && !expiredAt) {
    await db.$transaction(async (tx) => {
      const mr = await tx.setting.findUnique({ where: { key: "deals_sections_published_meta" }, select: { value: true } });
      const meta2 =
        mr?.value && typeof mr.value === "object" && !Array.isArray(mr.value) ? (mr.value as Record<string, unknown>) : null;
      const unpublishAt2 = parseIsoOrNull((meta2?.unpublishAt as string) || "");
      const expiredAt2 = (meta2?.expiredAt as string) || "";
      const prevSections2 = Array.isArray(meta2?.prevSections) ? (meta2?.prevSections as unknown as DealsSectionConfig[]) : null;
      if (!unpublishAt2 || now <= unpublishAt2 || expiredAt2) return;

      const wr = await tx.setting.findUnique({ where: { key: "website_settings" }, select: { value: true } });
      const websiteValue =
        wr?.value && typeof wr.value === "object" && !Array.isArray(wr.value) ? (wr.value as Record<string, unknown>) : {};

      const restore = prevSections2 ?? [];
      await tx.setting.upsert({
        where: { key: "website_settings" },
        update: { value: toJson({ ...websiteValue, dealsSections: restore }), group: "website", description: "Website settings", isPublic: true },
        create: { key: "website_settings", value: toJson({ ...websiteValue, dealsSections: restore }), group: "website", description: "Website settings", isPublic: true },
      });
      await tx.setting.upsert({
        where: { key: "deals_sections_published_meta" },
        update: { value: toJson({ ...(meta2 ?? {}), expiredAt: now.toISOString() }), group: "website", description: "Deals publish meta", isPublic: false },
        create: { key: "deals_sections_published_meta", value: toJson({ ...(meta2 ?? {}), expiredAt: now.toISOString() }), group: "website", description: "Deals publish meta", isPublic: false },
      });
    });
    invalidateDealsCaches();
    try {
      await appendDealsAuditEntry(db, {
        action: "auto_expire",
        actorId: "system",
        actorName: "SYSTEM",
        metadata: { unpublishAt: (meta?.unpublishAt as string) || undefined },
      });
    } catch {
      // ignore
    }
    return { overrideSections: (Array.isArray(meta?.prevSections) ? (meta?.prevSections as unknown as DealsSectionConfig[]) : []) };
  }

  return {};
}

type DealsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DealsPage({ searchParams }: DealsPageProps): Promise<JSX.Element> {
  const sp = await searchParams;
  const previewTokenRaw = ((): string => {
    const v = sp?.previewToken;
    if (Array.isArray(v)) return v[0] || "";
    return v || "";
  })();
  const tokenCheck = previewTokenRaw ? verifyDealsPreviewToken(previewTokenRaw) : { ok: false as const };
  const tokenPreviewEnabled = Boolean(tokenCheck.ok);
  const isPreviewRequested = ((): boolean => {
    const v = sp?.preview;
    if (Array.isArray(v)) return v[0] === "1";
    return v === "1";
  })();

  const session = isPreviewRequested ? await getServerSession(authOptions) : null;
  const canPreview =
    Boolean(session?.user?.id) &&
    (session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "ADMIN");

  const [website, db] = await Promise.all([getWebsiteSettings(), getDbClient()]);
  const automation = await runDealsScheduleAutomation(db);
  const publishedMetaRow = await db?.setting.findUnique({
    where: { key: "deals_sections_published_meta" },
    select: { value: true },
  });
  const publishedMeta =
    publishedMetaRow?.value && typeof publishedMetaRow.value === "object" && !Array.isArray(publishedMetaRow.value)
      ? (publishedMetaRow.value as Record<string, unknown>)
      : null;
  const publishedCampaignId =
    typeof publishedMeta?.rollbackVersionId === "string" && publishedMeta.rollbackVersionId.trim()
      ? publishedMeta.rollbackVersionId.trim()
      : typeof publishedMeta?.publishedAt === "string"
        ? String(publishedMeta.publishedAt)
        : "";
  const draftRow = (canPreview || tokenPreviewEnabled)
    ? await db?.setting.findUnique({ where: { key: "deals_sections_draft" }, select: { value: true } })
    : null;
  const draftValue = draftRow?.value;
  const previewSectionsRaw =
    draftValue && typeof draftValue === "object" && Array.isArray(draftValue) ? (draftValue as unknown[]) : null;

  const scheduledRow = (canPreview || tokenPreviewEnabled)
    ? await db?.setting.findUnique({ where: { key: "deals_sections_scheduled" }, select: { value: true } })
    : null;
  const scheduledValue =
    scheduledRow?.value && typeof scheduledRow.value === "object" && !Array.isArray(scheduledRow.value)
      ? (scheduledRow.value as Record<string, unknown>)
      : null;
  const scheduledSections =
    Array.isArray(scheduledValue?.sections) ? (scheduledValue?.sections as unknown as DealsSectionConfig[]) : null;

  const allowPreview = (isPreviewRequested && canPreview) || tokenPreviewEnabled;

  const tokenScope = tokenCheck.ok ? tokenCheck.payload.scope : null;
  const previewMode = Boolean(allowPreview && (previewSectionsRaw || scheduledSections));
  const sectionsSource: DealsSectionConfig[] =
    previewMode && previewSectionsRaw && (!tokenScope || tokenScope === "draft")
      ? (previewSectionsRaw as unknown as DealsSectionConfig[])
      : previewMode && scheduledSections && (!tokenScope || tokenScope === "scheduled")
        ? scheduledSections
        : (automation.overrideSections ?? website.dealsSections ?? []);

  const campaignState = ((): string => {
    if (previewMode && previewSectionsRaw) return "draft";
    if (previewMode && scheduledSections) return "scheduled";
    return resolveCampaignStatus({
      now: new Date(),
      publishAt: null,
      unpublishAt: null,
      hasContent: true,
    });
  })();
  const campaignId =
    previewMode && previewSectionsRaw
      ? "draft"
      : previewMode && scheduledSections
        ? "scheduled"
        : publishedCampaignId;
  const effectiveSections = resolveDealsSections(sectionsSource);

  const resolved = await Promise.all(
    effectiveSections.map(async (section) => {
      try {
        const [products, coupons] = await Promise.all([
          resolveDealsSectionProducts(section, { preview: previewMode }),
          resolveDealsSectionCoupons(section, { preview: previewMode }),
        ]);
        return { section, products, coupons, failed: false as const };
      } catch {
        return { section, products: [], coupons: [], failed: true as const };
      }
    }),
  );

  return (
    <div className="min-h-screen bg-[var(--z-bg,#fff)] text-[var(--z-text-main,#0F172A)]">
      <main className="mx-auto w-full max-w-7xl px-4 pt-3 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pb-12">
        <DealsPreviewAutoRefresh enabled={previewMode} />
        <header className="mb-4 space-y-1 pt-[max(0px,env(safe-area-inset-top))]">
          <h1 className="text-xl font-extrabold tracking-tight text-[#0F172A] sm:text-2xl">Ưu đãi</h1>
          <p className="text-sm font-medium text-[#64748B]">Flash sale, voucher và deal đang diễn ra.</p>
        </header>

        <div className="space-y-6">
          {resolved.map(({ section, products, coupons, failed }) => {
            const isVoucher = section.type === "voucher_hot";
            const showProducts = products.length > 0;
            const showCoupons = coupons.length > 0;
            const showSection = isVoucher ? showCoupons || showProducts : showProducts;
            if (!showSection && !failed) return null;

            return (
              <DealsSectionShell
                key={section.id}
                sectionId={section.id}
                sectionType={section.type}
                productSource={section.productSource?.type}
                campaignState={campaignState}
                campaignId={campaignId}
                experimentId={section.experiment?.enabled ? section.experiment.experimentId : ""}
                variantId={section.experiment?.enabled ? section.experiment.variantId : ""}
                themeBackground={section.theme?.background}
                themePreset={section.theme?.preset}
              >
                <DealsSectionMetrics
                  sectionId={section.id}
                  sectionType={section.type}
                  productSource={section.productSource?.type}
                  campaignState={campaignState}
                  campaignId={campaignId}
                />
                <DealsSectionHeader title={section.title} subtitle={section.subtitle} />
                {section.banner ? (
                  <div className="mt-3">
                    <DealsHeroBanner
                      desktopImage={section.banner.desktopImage}
                      mobileImage={section.banner.mobileImage}
                      link={section.banner.link}
                      alt={section.title}
                    />
                  </div>
                ) : null}
                {showCoupons ? <div className="mt-4"><DealsVoucherRail coupons={coupons} /></div> : null}
                {showProducts ? (
                  <div className="mt-4">
                    <DealsProductRail products={products} desktopColumns={website.productGridColumnsDesktop} />
                  </div>
                ) : (
                  <div className="mt-4">
                    <DealsEmptyState />
                  </div>
                )}
              </DealsSectionShell>
            );
          })}
        </div>
      </main>
    </div>
  );
}

