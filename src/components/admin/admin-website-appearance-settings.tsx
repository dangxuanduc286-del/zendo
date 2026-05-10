"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dynamic from "next/dynamic";
import {
  websiteSectionAnalyticsSchema,
  websiteSectionCustomerAccountSchema,
  websiteSectionCommerceSchema,
  websiteSectionFooterSchema,
  websiteSectionGeneralSchema,
  websiteSectionStorefrontSchema,
  websiteSectionTrustSchema,
} from "../../lib/admin-settings";
import { adminMobileMenuItemInactive, adminTabBase, adminTabInactive } from "../../lib/admin-ui";
import type { DealsSectionConfig, WebsiteSettings } from "../../lib/settings";

const AdminImageUploadField = dynamic(() => import("./admin-image-upload-field"), {
  loading: () => <div className="h-11 w-full rounded-xl border border-slate-200 bg-white" />,
});

const TABS = [
  { key: "general", label: "Thông tin website", legacyHash: "section-chung" },
  { key: "storefront", label: "Header / Footer / Banner / CTA nổi", legacyHash: "section-storefront" },
  { key: "footer", label: "Footer & chính sách liên kết", legacyHash: "section-chan-trang" },
  { key: "trust", label: "Topbar tiện ích", legacyHash: "section-trust" },
  { key: "commerce", label: "Sản phẩm / Bảo hành / Pháp lý", legacyHash: "section-thuong-mai" },
  { key: "customerAccount", label: "Tài khoản khách hàng", legacyHash: "section-tai-khoan" },
  { key: "analytics", label: "Tracking / Analytics", legacyHash: "section-analytics" },
] as const;

type SettingsSectionKey = (typeof TABS)[number]["key"];
const DEFAULT_SECTION: SettingsSectionKey = "general";
const SECTION_KEYS = new Set<SettingsSectionKey>(TABS.map((item) => item.key));
const LEGACY_HASH_TO_SECTION = new Map<string, SettingsSectionKey>(
  TABS.map((item) => [item.legacyHash, item.key]),
);
const SECTION_CLASS = "scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-sm";
const SECTION_HEADER_CLASS = "border-b border-slate-200 px-5 py-4 sm:px-6";
const SECTION_TITLE_CLASS = "text-base font-semibold text-slate-900";
const SECTION_DESC_CLASS = "mt-1 text-sm text-slate-500";
const FORM_CLASS =
  "space-y-5 px-5 py-5 sm:px-6 sm:py-6 [&_input:not([type='hidden']):not([type='checkbox'])]:h-11 [&_input:not([type='hidden']):not([type='checkbox'])]:w-full [&_input:not([type='hidden']):not([type='checkbox'])]:rounded-xl [&_input:not([type='hidden']):not([type='checkbox'])]:border [&_input:not([type='hidden']):not([type='checkbox'])]:border-slate-200 [&_input:not([type='hidden']):not([type='checkbox'])]:bg-white [&_input:not([type='hidden']):not([type='checkbox'])]:px-3 [&_input:not([type='hidden']):not([type='checkbox'])]:text-sm [&_input:not([type='hidden']):not([type='checkbox'])]:text-slate-900 [&_input:not([type='hidden']):not([type='checkbox'])]:outline-none [&_input:not([type='hidden']):not([type='checkbox'])]:transition [&_input:not([type='hidden']):not([type='checkbox'])]:focus:border-[#2563EB] [&_input:not([type='hidden']):not([type='checkbox'])]:focus:ring-2 [&_input:not([type='hidden']):not([type='checkbox'])]:focus:ring-[#DBEAFE] [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-slate-200 [&_textarea]:bg-white [&_textarea]:px-3 [&_textarea]:py-2.5 [&_textarea]:text-sm [&_textarea]:text-slate-900 [&_textarea]:outline-none [&_textarea]:transition [&_textarea]:focus:border-[#2563EB] [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-[#DBEAFE]";
const PRIMARY_BUTTON_CLASS =
  "inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#2563EB] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";
const ERROR_ALERT_CLASS = "rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700";
const SUCCESS_ALERT_CLASS = "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700";
const SEARCH_KEYWORDS: Record<SettingsSectionKey, string[]> = {
  general: ["thong tin", "website", "seo", "meta", "logo", "favicon", "lien he"],
  storefront: ["header", "footer", "banner", "cta", "menu", "giao dien", "mau", "topbar", "banner cam ket", "cam ket duoi"],
  footer: ["footer", "chan trang", "chinh sach", "lien ket"],
  trust: ["trust", "topbar", "tien ich", "cam ket"],
  commerce: ["san pham", "bao hanh", "phap ly", "thuong mai", "ma so thue"],
  customerAccount: ["tai khoan", "khach hang", "ho so", "don hang", "lich su", "bao hanh", "doi tra", "affiliate"],
  analytics: ["analytics", "tracking", "pixel", "ga4", "gtm", "clarity", "seo"],
};

function parseSection(raw: string | null): SettingsSectionKey {
  if (!raw) return DEFAULT_SECTION;
  return SECTION_KEYS.has(raw as SettingsSectionKey) ? (raw as SettingsSectionKey) : DEFAULT_SECTION;
}

function padTrust(items: { title: string; description: string }[]): { title: string; description: string }[] {
  const next = [...items];
  while (next.length < 4) next.push({ title: "", description: "" });
  return next.slice(0, 4);
}

function emptyFooterTrustBannerSlot(sortOrder: number): WebsiteSettings["footerTrustBanners"][number] {
  return {
    imageUrl: "",
    link: "",
    title: "",
    altText: "",
    objectPosition: "center center",
    imageFit: "contain",
    enabled: true,
    sortOrder,
  };
}

function normalizeFooterTrustBannersFormState(
  raw: WebsiteSettings["footerTrustBanners"],
): WebsiteSettings["footerTrustBanners"] {
  type Slot = WebsiteSettings["footerTrustBanners"][number];
  const buckets = new Map<number, Slot>();
  for (const item of raw) {
    const slot = Math.min(4, Math.max(1, Math.floor(Number(item.sortOrder)) || 1));
    buckets.set(slot, {
      ...item,
      sortOrder: slot,
      imageFit: item.imageFit === "cover" ? "cover" : "contain",
      objectPosition: item.objectPosition?.trim().toLowerCase() || "center center",
      imageUrl: item.imageUrl ?? "",
      link: item.link ?? "",
      title: item.title ?? "",
      altText: item.altText ?? "",
      enabled: item.enabled ?? true,
    });
  }
  return [1, 2, 3, 4].map((n) => buckets.get(n) ?? emptyFooterTrustBannerSlot(n));
}

function normalizeKeyword(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function patchWebsiteSection(body: unknown): Promise<{ ok: boolean; message?: string }> {
  const response = await fetch("/api/admin/settings/website/section", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as { message?: string };
  if (!response.ok) return { ok: false, message: payload.message ?? "Không thể lưu cài đặt. Vui lòng thử lại." };
  return { ok: true };
}

export default function AdminWebsiteAppearanceSettings(): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<SettingsSectionKey>(() =>
    parseSection(searchParams.get("section")),
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [mediaVersion, setMediaVersion] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const response = await fetch("/api/admin/settings/website", { cache: "no-store" });
    const payload = (await response.json()) as {
      item?: WebsiteSettings & { socialLinksJson?: string; mediaVersion?: string };
      message?: string;
    };
    if (!response.ok || !payload.item) {
      setLoadError(payload.message ?? "Không thể tải cài đặt.");
      setLoading(false);
      return;
    }
    const { socialLinksJson, ...rest } = payload.item;
    void socialLinksJson;
    setMediaVersion(payload.item.mediaVersion ?? "");
    setSettings(rest as WebsiteSettings);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload().catch(() => {
      setLoadError("Có lỗi xảy ra khi tải cài đặt.");
      setLoading(false);
    });
  }, [reload]);

  useEffect(() => {
    const nextSection = parseSection(searchParams.get("section"));
    setActiveSection(nextSection);
  }, [searchParams]);

  useEffect(() => {
    const current = searchParams.get("section");
    if (current) return;
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    const mapped = LEGACY_HASH_TO_SECTION.get(hash) ?? DEFAULT_SECTION;
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", mapped);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleTabChange = (next: SettingsSectionKey) => {
    setActiveSection(next);
    setMobileMenuOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const filteredTabs = useMemo(() => {
    const keyword = normalizeKeyword(searchTerm);
    if (!keyword) return TABS;
    return TABS.filter((item) => {
      const haystack = normalizeKeyword(
        `${item.label} ${item.key} ${(SEARCH_KEYWORDS[item.key] ?? []).join(" ")}`,
      );
      return haystack.includes(keyword);
    });
  }, [searchTerm]);

  const generalDefaults = useMemo(() => {
    if (!settings) return null;
    return {
      section: "general" as const,
      siteName: settings.siteName,
      slogan: settings.slogan,
      shortDescription: settings.shortDescription,
      siteUrl: settings.siteUrl,
      canonicalBaseUrl: settings.canonicalBaseUrl || settings.siteUrl,
      logoUrl: settings.logoUrl,
      footerLogoUrl: settings.footerLogoUrl || settings.logoUrl,
      productPlaceholderImage: settings.productPlaceholderImage,
      faviconUrl: settings.faviconUrl,
      hotline: settings.hotline,
      zalo: settings.zalo,
      email: settings.email,
      address: settings.address,
      defaultSeoTitle: settings.defaultSeoTitle,
      defaultSeoDescription: settings.defaultSeoDescription,
      defaultSeoKeywords: settings.defaultSeoKeywords,
      defaultOgImage: settings.defaultOgImage,
      robotsIndex: settings.robotsIndex,
      robotsFollow: settings.robotsFollow,
      socialLinksJson: JSON.stringify(settings.socialLinks, null, 2),
    };
  }, [settings]);

  if (loading || !settings || !generalDefaults) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        {loadError || "Đang tải cài đặt website & giao diện..."}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 lg:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Mở danh mục cài đặt"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] transition hover:bg-[#EFF6FF]"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm kiếm cài đặt..."
            className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
          />
        </div>
        {mobileMenuOpen ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {filteredTabs.length ? (
              <div className="space-y-1">
                {filteredTabs.map((item) => {
                  const active = activeSection === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleTabChange(item.key)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${
                        active
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                          : adminMobileMenuItemInactive
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="px-2 py-3 text-sm text-slate-500">Không tìm thấy cài đặt phù hợp.</p>
            )}
          </div>
        ) : null}
      </div>

      <nav aria-label="Tab cài đặt website" className="hidden overflow-x-auto rounded-xl lg:block">
        <div className="flex min-w-max gap-2 p-1">
          {TABS.map((item) => {
            const active = activeSection === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleTabChange(item.key)}
                className={`whitespace-nowrap ${adminTabBase} ${
                  active
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm"
                    : adminTabInactive
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="min-w-0">
        {activeSection === "general" ? (
          <GeneralCard defaults={generalDefaults} onSaved={reload} mediaVersion={mediaVersion} />
        ) : null}
        {activeSection === "storefront" ? (
          <StorefrontCard settings={settings} onSaved={reload} mediaVersion={mediaVersion} />
        ) : null}
        {activeSection === "footer" ? <FooterCard settings={settings} onSaved={reload} /> : null}
        {activeSection === "trust" ? <TrustCard settings={settings} onSaved={reload} /> : null}
        {activeSection === "commerce" ? <CommerceCard settings={settings} onSaved={reload} /> : null}
        {activeSection === "customerAccount" ? <CustomerAccountCard settings={settings} onSaved={reload} /> : null}
        {activeSection === "analytics" ? <AnalyticsCard settings={settings} onSaved={reload} /> : null}
      </div>
    </div>
  );
}

function GeneralCard({
  defaults,
  onSaved,
  mediaVersion,
}: {
  defaults: z.infer<typeof websiteSectionGeneralSchema>;
  onSaved: () => Promise<void>;
  mediaVersion: string;
}): JSX.Element {
  type FormValues = z.infer<typeof websiteSectionGeneralSchema>;
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(websiteSectionGeneralSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  const logoPreview = watch("logoUrl");
  const faviconPreview = watch("faviconUrl");
  const footerLogoPreview = watch("footerLogoUrl");
  const productPlaceholderPreview = watch("productPlaceholderImage");

  const onSubmit = async (values: FormValues) => {
    setErr("");
    setOk("");
    const result = await patchWebsiteSection(values);
    if (!result.ok) {
      setErr(result.message ?? "");
      return;
    }
    setOk("Đã lưu cài đặt.");
    await onSaved();
  };

  return (
    <section id="section-chung" className={SECTION_CLASS}>
      <div className={SECTION_HEADER_CLASS}>
        <h2 className={SECTION_TITLE_CLASS}>Chung & thông tin liên hệ</h2>
        <p className={SECTION_DESC_CLASS}>Tên, domain, logo, SEO mặc định và mạng xã hội.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className={FORM_CLASS}>
        <input type="hidden" {...register("section")} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Thông tin nhận diện</h3>
              <p className="mt-1 text-xs text-slate-500">Thiết lập tên website, domain chính và URL canonical.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Tên website *</span>
                <input {...register("siteName")} placeholder="Ví dụ: Zendo.vn" />
                {errors.siteName ? <p className="text-xs text-rose-600">{errors.siteName.message}</p> : null}
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Domain chính *</span>
                <input {...register("siteUrl")} placeholder="https://www.zendo.vn" />
                <p className="text-xs text-slate-500">Local dùng `http://localhost:3000`, production dùng `https://www.zendo.vn`.</p>
                {errors.siteUrl ? <p className="text-xs text-rose-600">{errors.siteUrl.message}</p> : null}
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-zinc-700">Slogan</span>
                <input {...register("slogan")} placeholder="Thông điệp ngắn cho thương hiệu" />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-zinc-700">Mô tả ngắn website</span>
                <textarea {...register("shortDescription")} rows={3} placeholder="Giới thiệu ngắn về website để hiển thị ở nhiều vị trí." />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-zinc-700">Canonical base URL *</span>
                <input {...register("canonicalBaseUrl")} placeholder="https://www.zendo.vn" />
                <p className="text-xs text-slate-500">URL gốc để sinh canonical; local: `http://localhost:3000`, production: `https://www.zendo.vn`.</p>
                {errors.canonicalBaseUrl ? <p className="text-xs text-rose-600">{errors.canonicalBaseUrl.message}</p> : null}
              </label>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">SEO mặc định</h3>
              <p className="mt-1 text-xs text-slate-500">Dùng khi trang không có metadata riêng.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-zinc-700">SEO title mặc định</span>
                <input {...register("defaultSeoTitle")} placeholder="Zendo.vn - Mua sắm đa ngành" />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-zinc-700">SEO description mặc định</span>
                <textarea {...register("defaultSeoDescription")} rows={3} placeholder="Mô tả ngắn cho kết quả tìm kiếm Google." />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-zinc-700">SEO keywords mặc định</span>
                <input {...register("defaultSeoKeywords")} placeholder="ví dụ: zendo, điện tử, phụ kiện" />
              </label>
              <div className="md:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                  <input type="checkbox" {...register("robotsIndex")} className="h-4 w-4 rounded border-zinc-300" />
                  Robots: index
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                  <input type="checkbox" {...register("robotsFollow")} className="h-4 w-4 rounded border-zinc-300" />
                  Robots: follow
                </label>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Logo & hình ảnh</h3>
              <p className="mt-1 text-xs text-slate-500">Ảnh lưu trên Cloudflare R2 theo pipeline media hiện có.</p>
            </div>
            <div className="space-y-4">
              <input type="hidden" {...register("logoUrl")} />
              <div className="space-y-1">
                <AdminImageUploadField
                  label="Logo"
                  value={logoPreview}
                  kind="logo"
                  version={mediaVersion}
                  hint="Khuyến nghị logo ngang 600x180 (hoặc vuông 150x150)."
                  previewClassName="h-16 w-[180px]"
                  onChange={(nextUrl) => setValue("logoUrl", nextUrl, { shouldDirty: true, shouldValidate: true })}
                />
                {errors.logoUrl ? <p className="text-xs text-rose-600">{errors.logoUrl.message}</p> : null}
              </div>

              <input type="hidden" {...register("footerLogoUrl")} />
              <div className="space-y-1">
                <AdminImageUploadField
                  label="Logo footer (nếu trống sẽ dùng logo chính)"
                  value={footerLogoPreview}
                  kind="logo"
                  version={mediaVersion}
                  previewClassName="h-16 w-[180px]"
                  onChange={(nextUrl) => setValue("footerLogoUrl", nextUrl, { shouldDirty: true, shouldValidate: true })}
                />
                {errors.footerLogoUrl ? <p className="text-xs text-rose-600">{errors.footerLogoUrl.message}</p> : null}
              </div>

              <input type="hidden" {...register("faviconUrl")} />
              <div className="space-y-1">
                <AdminImageUploadField
                  label="Favicon"
                  value={faviconPreview}
                  kind="favicon"
                  version={mediaVersion}
                  hint="Khuyến nghị ảnh vuông 256x256."
                  previewClassName="h-14 w-14"
                  onChange={(nextUrl) => setValue("faviconUrl", nextUrl, { shouldDirty: true, shouldValidate: true })}
                />
                {errors.faviconUrl ? <p className="text-xs text-rose-600">{errors.faviconUrl.message}</p> : null}
              </div>

              <input type="hidden" {...register("defaultOgImage")} />
              <div className="space-y-1">
                <AdminImageUploadField
                  label="Ảnh OG mặc định"
                  value={watch("defaultOgImage")}
                  kind="og"
                  version={mediaVersion}
                  hint="Ảnh OG khuyến nghị 1200x630px."
                  previewClassName="h-24 w-full max-w-sm"
                  onChange={(nextUrl) => setValue("defaultOgImage", nextUrl, { shouldDirty: true, shouldValidate: true })}
                />
              </div>

              <input type="hidden" {...register("productPlaceholderImage")} />
              <div className="space-y-1">
                <AdminImageUploadField
                  label="Ảnh placeholder sản phẩm"
                  value={productPlaceholderPreview}
                  kind="product"
                  version={mediaVersion}
                  previewClassName="h-24 w-44"
                  onChange={(nextUrl) =>
                    setValue("productPlaceholderImage", nextUrl, { shouldDirty: true, shouldValidate: true })
                  }
                />
                {errors.productPlaceholderImage ? <p className="text-xs text-rose-600">{errors.productPlaceholderImage.message}</p> : null}
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Liên hệ & mạng xã hội</h3>
              <p className="mt-1 text-xs text-slate-500">Thông tin liên hệ hiển thị ở header/footer và JSON social links.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Hotline</span>
                <input {...register("hotline")} placeholder="Ví dụ: 1900 6868" />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Zalo</span>
                <input {...register("zalo")} placeholder="Số điện thoại hoặc link Zalo OA" />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-zinc-700">Email hỗ trợ</span>
                <input {...register("email")} type="email" placeholder="support@zendo.vn" />
                {errors.email ? <p className="text-xs text-rose-600">{errors.email.message}</p> : null}
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-zinc-700">Địa chỉ</span>
                <input {...register("address")} placeholder="Ví dụ: 01 Nguyễn Văn Linh, Quận 7, TP. HCM" />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-zinc-700">Liên kết mạng xã hội (JSON)</span>
                <textarea {...register("socialLinksJson")} rows={6} className="font-mono text-xs" placeholder='[{"platform":"facebook","label":"Facebook","url":"https://facebook.com/..."}]' />
                <p className="text-xs text-slate-500">Giữ định dạng JSON hợp lệ để không làm mất liên kết mạng xã hội hiện có.</p>
                {errors.socialLinksJson ? <p className="text-xs text-rose-600">{errors.socialLinksJson.message}</p> : null}
              </label>
            </div>
          </section>
        </div>
        {err ? <p className={ERROR_ALERT_CLASS}>{err}</p> : null}
        {ok ? <p className={SUCCESS_ALERT_CLASS}>{ok}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className={PRIMARY_BUTTON_CLASS}
        >
          {isSubmitting ? "Đang lưu..." : "Lưu phần này"}
        </button>
      </form>
    </section>
  );
}

function StorefrontCard({
  settings,
  onSaved,
  mediaVersion,
}: {
  settings: WebsiteSettings;
  onSaved: () => Promise<void>;
  mediaVersion: string;
}): JSX.Element {
  type FormValues = z.infer<typeof websiteSectionStorefrontSchema>;
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [dealsLifecycle, setDealsLifecycle] = useState<Record<string, unknown> | null>(null);
  const [dealsWarnings, setDealsWarnings] = useState<string[]>([]);
  const [publishAt, setPublishAt] = useState("");
  const [unpublishAt, setUnpublishAt] = useState("");
  const [dealsAudit, setDealsAudit] = useState<unknown[]>([]);
  const [dealsHealth, setDealsHealth] = useState<Record<string, unknown> | null>(null);
  const [previewToken, setPreviewToken] = useState("");
  const [dealsPerf, setDealsPerf] = useState<Record<string, unknown> | null>(null);
  const [dealsEvents, setDealsEvents] = useState<unknown[]>([]);
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [compareResult, setCompareResult] = useState<Record<string, unknown> | null>(null);
  const [attrSummary, setAttrSummary] = useState<Record<string, unknown> | null>(null);
  const footerTrustDefaults = normalizeFooterTrustBannersFormState(settings.footerTrustBanners);
  const [dealsSections, setDealsSections] = useState<DealsSectionConfig[]>(settings.dealsSections);

  const form = useForm<FormValues>({
    resolver: zodResolver(websiteSectionStorefrontSchema),
    defaultValues: {
      section: "storefront",
      showAnnouncementBar: settings.showAnnouncementBar,
      announcementText: settings.announcementText,
      showStorefrontTopbar: settings.showStorefrontTopbar,
      topbarLeftText: settings.topbarLeftText,
      topbarShippingText: settings.topbarShippingText,
      topbarCommitmentText: settings.topbarCommitmentText,
      showHeaderSearch: settings.showHeaderSearch,
      showHeaderCartIcon: settings.showHeaderCartIcon,
      showHeaderAdminMenu: settings.showHeaderAdminMenu,
      headerDesktopCategoryLimit: settings.headerDesktopCategoryLimit,
      headerMobileCategoryLimit: settings.headerMobileCategoryLimit,
      showTopHighlights: settings.showTopHighlights,
      showHomeFeatureBlocks: settings.showHomeFeatureBlocks,
      showBottomTrustBlock: settings.showBottomTrustBlock,
      showHomeWhyChoose: settings.showHomeWhyChoose,
      showFooterLinkGroups: settings.showFooterLinkGroups,
      productGridColumnsDesktop: settings.productGridColumnsDesktop,
      homeInfoCardsJson: JSON.stringify(settings.homeInfoCards, null, 2),
      homeQuickChipsJson: JSON.stringify(settings.homeQuickChips, null, 2),
      homeCategoryChipsJson: JSON.stringify(settings.homeCategoryChips, null, 2),
      dealsSectionsJson: JSON.stringify(settings.dealsSections, null, 2),
      headerMenuJson: JSON.stringify(settings.headerNavItems, null, 2),
      footerGroupsJson: JSON.stringify(settings.footerLinkGroups, null, 2),
      floatingCtasJson: JSON.stringify(settings.floatingCtas, null, 2),
      productDetailEnabled: settings.productDetailSettings.enabled,
      buyNowLabel: settings.productDetailSettings.buyNowLabel,
      addToCartLabel: settings.productDetailSettings.addToCartLabel,
      showBestPriceNote: settings.productDetailSettings.showBestPriceNote,
      bestPriceLabel: settings.productDetailSettings.bestPriceLabel,
      showDiscountBadge: settings.productDetailSettings.showDiscountBadge,
      descriptionTitle: settings.productDetailSettings.descriptionTitle,
      readMoreLabel: settings.productDetailSettings.readMoreLabel,
      reviewTitle: settings.productDetailSettings.reviewTitle,
      reviewEmptyText: settings.productDetailSettings.reviewEmptyText,
      verifiedPurchaseLabel: settings.productDetailSettings.verifiedPurchaseLabel,
      soldLabel: settings.productDetailSettings.soldLabel,
      ratingLabel: settings.productDetailSettings.ratingLabel,
      policyOfficialLabel: settings.productDetailSettings.policyOfficialLabel,
      policyReturnLabel: settings.productDetailSettings.policyReturnLabel,
      policyShippingLabel: settings.productDetailSettings.policyShippingLabel,
      policyWarrantyLabel: settings.productDetailSettings.policyWarrantyLabel,
      showPolicyRow: settings.productDetailSettings.showPolicyRow,
      showReviewSection: settings.productDetailSettings.showReviewSection,
      showRelatedProducts: settings.productDetailSettings.showRelatedProducts,
      hideTechnicalSpecs: settings.productDetailSettings.hideTechnicalSpecs,
      footerTrustBanners: footerTrustDefaults,
    },
  });

  useEffect(() => {
    const nextFooterTrust = normalizeFooterTrustBannersFormState(settings.footerTrustBanners);
    form.reset({
      section: "storefront",
      showAnnouncementBar: settings.showAnnouncementBar,
      announcementText: settings.announcementText,
      showStorefrontTopbar: settings.showStorefrontTopbar,
      topbarLeftText: settings.topbarLeftText,
      topbarShippingText: settings.topbarShippingText,
      topbarCommitmentText: settings.topbarCommitmentText,
      showHeaderSearch: settings.showHeaderSearch,
      showHeaderCartIcon: settings.showHeaderCartIcon,
      showHeaderAdminMenu: settings.showHeaderAdminMenu,
      headerDesktopCategoryLimit: settings.headerDesktopCategoryLimit,
      headerMobileCategoryLimit: settings.headerMobileCategoryLimit,
      showTopHighlights: settings.showTopHighlights,
      showHomeFeatureBlocks: settings.showHomeFeatureBlocks,
      showBottomTrustBlock: settings.showBottomTrustBlock,
      showHomeWhyChoose: settings.showHomeWhyChoose,
      showFooterLinkGroups: settings.showFooterLinkGroups,
      productGridColumnsDesktop: settings.productGridColumnsDesktop,
      homeInfoCardsJson: JSON.stringify(settings.homeInfoCards, null, 2),
      homeQuickChipsJson: JSON.stringify(settings.homeQuickChips, null, 2),
      homeCategoryChipsJson: JSON.stringify(settings.homeCategoryChips, null, 2),
      dealsSectionsJson: JSON.stringify(settings.dealsSections, null, 2),
      headerMenuJson: JSON.stringify(settings.headerNavItems, null, 2),
      footerGroupsJson: JSON.stringify(settings.footerLinkGroups, null, 2),
      floatingCtasJson: JSON.stringify(settings.floatingCtas, null, 2),
      productDetailEnabled: settings.productDetailSettings.enabled,
      buyNowLabel: settings.productDetailSettings.buyNowLabel,
      addToCartLabel: settings.productDetailSettings.addToCartLabel,
      showBestPriceNote: settings.productDetailSettings.showBestPriceNote,
      bestPriceLabel: settings.productDetailSettings.bestPriceLabel,
      showDiscountBadge: settings.productDetailSettings.showDiscountBadge,
      descriptionTitle: settings.productDetailSettings.descriptionTitle,
      readMoreLabel: settings.productDetailSettings.readMoreLabel,
      reviewTitle: settings.productDetailSettings.reviewTitle,
      reviewEmptyText: settings.productDetailSettings.reviewEmptyText,
      verifiedPurchaseLabel: settings.productDetailSettings.verifiedPurchaseLabel,
      soldLabel: settings.productDetailSettings.soldLabel,
      ratingLabel: settings.productDetailSettings.ratingLabel,
      policyOfficialLabel: settings.productDetailSettings.policyOfficialLabel,
      policyReturnLabel: settings.productDetailSettings.policyReturnLabel,
      policyShippingLabel: settings.productDetailSettings.policyShippingLabel,
      policyWarrantyLabel: settings.productDetailSettings.policyWarrantyLabel,
      showPolicyRow: settings.productDetailSettings.showPolicyRow,
      showReviewSection: settings.productDetailSettings.showReviewSection,
      showRelatedProducts: settings.productDetailSettings.showRelatedProducts,
      hideTechnicalSpecs: settings.productDetailSettings.hideTechnicalSpecs,
      footerTrustBanners: nextFooterTrust,
    });
  }, [settings, form]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings/deals-lifecycle");
        const json = (await res.json()) as unknown;
        if (res.ok && json && typeof json === "object") setDealsLifecycle(json as Record<string, unknown>);
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings/deals-audit");
        const json = (await res.json()) as unknown;
        const obj = json && typeof json === "object" ? (json as Record<string, unknown>) : null;
        const items = Array.isArray(obj?.items) ? (obj?.items as unknown[]) : [];
        setDealsAudit(items);
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings/deals-events");
        const json = (await res.json()) as unknown;
        const obj = json && typeof json === "object" ? (json as Record<string, unknown>) : null;
        const items = Array.isArray(obj?.items) ? (obj.items as unknown[]) : [];
        setDealsEvents(items);
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings/deals-health");
        const json = (await res.json()) as unknown;
        if (res.ok && json && typeof json === "object") setDealsHealth(json as Record<string, unknown>);
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings/deals-performance?days=7");
        const json = (await res.json()) as unknown;
        if (res.ok && json && typeof json === "object") setDealsPerf(json as Record<string, unknown>);
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    setDealsSections(settings.dealsSections);
    form.setValue("dealsSectionsJson", JSON.stringify(settings.dealsSections, null, 2), {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [form, settings.dealsSections]);

  const onSubmit = async (values: FormValues) => {
    setErr("");
    setOk("");
    const result = await patchWebsiteSection(values);
    if (!result.ok) {
      setErr(result.message ?? "");
      return;
    }
    setOk("Đã lưu cài đặt.");
    await onSaved();
  };

  return (
    <section id="section-storefront" className={SECTION_CLASS}>
      <div className={SECTION_HEADER_CLASS}>
        <h2 className={SECTION_TITLE_CLASS}>Header / Topbar / Trang chủ / CTA nổi</h2>
        <p className={SECTION_DESC_CLASS}>Quản lý thanh thông báo, block trang chủ, nhóm footer link và CTA nổi.</p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className={FORM_CLASS}>
        <input type="hidden" {...form.register("section")} />
        <textarea {...form.register("dealsSectionsJson")} className="hidden" readOnly rows={1} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Header</h3>
              <p className="mt-1 text-xs text-slate-500">Bật/tắt thành phần header và giới hạn danh mục theo thiết bị.</p>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                <input type="checkbox" {...form.register("showHeaderSearch")} className="h-4 w-4 rounded border-zinc-300" />
                Bật ô tìm kiếm
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                <input type="checkbox" {...form.register("showHeaderCartIcon")} className="h-4 w-4 rounded border-zinc-300" />
                Bật biểu tượng giỏ hàng
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                <input type="checkbox" {...form.register("showHeaderAdminMenu")} className="h-4 w-4 rounded border-zinc-300" />
                Bật menu tài khoản / quản trị
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Số danh mục desktop</span>
                <input type="number" min={1} max={20} {...form.register("headerDesktopCategoryLimit", { valueAsNumber: true })} placeholder="10" />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Số danh mục mobile</span>
                <input type="number" min={1} max={30} {...form.register("headerMobileCategoryLimit", { valueAsNumber: true })} placeholder="12" />
              </label>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Topbar & thông báo</h3>
              <p className="mt-1 text-xs text-slate-500">Thiết lập thanh thông báo và nội dung topbar hiển thị phía trên header.</p>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                <input type="checkbox" {...form.register("showAnnouncementBar")} className="h-4 w-4 rounded border-zinc-300" />
                Bật thanh thông báo
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Nội dung thanh thông báo</span>
                <input {...form.register("announcementText")} placeholder="Ví dụ: Miễn phí vận chuyển cho đơn từ 500.000đ" />
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                <input type="checkbox" {...form.register("showStorefrontTopbar")} className="h-4 w-4 rounded border-zinc-300" />
                Bật topbar storefront
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Nội dung topbar bên trái</span>
                <input {...form.register("topbarLeftText")} placeholder="Ví dụ: Đa ngành uy tín, trọng tâm điện tử" />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Thông điệp giao hàng</span>
                <input {...form.register("topbarShippingText")} placeholder="Ví dụ: Giao nhanh • COD tiện lợi" />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Thông điệp cam kết</span>
                <input {...form.register("topbarCommitmentText")} placeholder="Ví dụ: Đổi trả lỗi theo chính sách" />
              </label>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Trang chủ</h3>
              <p className="mt-1 text-xs text-slate-500">Bật/tắt các khối hiển thị chính của storefront.</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                <input type="checkbox" {...form.register("showTopHighlights")} className="h-4 w-4 rounded border-zinc-300" />
                Bật thanh ưu điểm đầu trang
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                <input type="checkbox" {...form.register("showHomeFeatureBlocks")} className="h-4 w-4 rounded border-zinc-300" />
                Bật khối lợi ích + chip dưới banner
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                <input type="checkbox" {...form.register("showBottomTrustBlock")} className="h-4 w-4 rounded border-zinc-300" />
                Bật khối cam kết cuối trang
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                <input type="checkbox" {...form.register("showHomeWhyChoose")} className="h-4 w-4 rounded border-zinc-300" />
                Bật khối “Vì sao chọn Zendo”
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                <input type="checkbox" {...form.register("showFooterLinkGroups")} className="h-4 w-4 rounded border-zinc-300" />
                Bật nhóm liên kết footer nâng cao
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Số sản phẩm mỗi hàng trên desktop</span>
                <input
                  type="number"
                  min={4}
                  max={6}
                  {...form.register("productGridColumnsDesktop", { valueAsNumber: true })}
                  placeholder="6"
                />
              </label>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Banner cam kết dưới trang</h3>
              <p className="mt-1 text-xs text-slate-500">
                Bốn ảnh hiển thị phía trên footer storefront. Khác với thẻ lợi ích trong JSON và khác nhóm banner dưới hero.
              </p>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Kích thước ảnh khuyến nghị: 1280 × 640 px, tỷ lệ 2:1. Có ảnh thì storefront chỉ hiển thị ảnh full khung, không hiện
                chữ/icon đè lên. Hãy thiết kế sẵn chữ trong ảnh. Nên dùng chế độ Hiển thị đủ ảnh nếu ảnh có chữ.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[0, 1, 2, 3].map((idx) => {
                const bannerUrlPreview = form.watch(`footerTrustBanners.${idx}.imageUrl`);
                const fitPreview =
                  form.watch(`footerTrustBanners.${idx}.imageFit`) === "cover" ? "cover" : "contain";
                return (
                  <div
                    key={idx}
                    className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5"
                  >
                    <p className="text-xs font-semibold text-zinc-600">Banner cam kết {idx + 1}</p>
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                      <input
                        type="checkbox"
                        {...form.register(`footerTrustBanners.${idx}.enabled`)}
                        className="h-4 w-4 rounded border-zinc-300"
                      />
                      Bật hiển thị ô này
                    </label>
                    <input type="hidden" {...form.register(`footerTrustBanners.${idx}.imageUrl`)} />
                    <AdminImageUploadField
                      label="Ảnh banner"
                      value={bannerUrlPreview ?? ""}
                      kind="banner"
                      version={mediaVersion}
                      quality={90}
                      hint="Tỷ lệ khung storefront: ~2:1 (vd. 1280×640)."
                      previewClassName="aspect-[2/1] w-full"
                      previewImageClassName={
                        fitPreview === "cover" ? "object-cover object-center" : "object-contain object-center"
                      }
                      onChange={(nextUrl) =>
                        form.setValue(`footerTrustBanners.${idx}.imageUrl`, nextUrl, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    />
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-zinc-700">Link khi bấm (tuỳ chọn)</span>
                      <input
                        {...form.register(`footerTrustBanners.${idx}.link`)}
                        placeholder="/cua-hang hoặc https://..."
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-zinc-700">Tiêu đề nội bộ</span>
                      <input {...form.register(`footerTrustBanners.${idx}.title`)} placeholder="Ghi nhận trong admin" />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-zinc-700">Alt SEO</span>
                      <input {...form.register(`footerTrustBanners.${idx}.altText`)} placeholder="Mô tả ảnh cho SEO" />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-zinc-700">Trọng tâm ảnh</span>
                      <select {...form.register(`footerTrustBanners.${idx}.objectPosition`)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]">
                        <option value="center center">Giữa ảnh (center center)</option>
                        <option value="left center">Lệch trái (left center)</option>
                        <option value="right center">Lệch phải (right center)</option>
                        <option value="center top">Lệch trên (center top)</option>
                        <option value="center bottom">Lệch dưới (center bottom)</option>
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-zinc-700">Chế độ hiển thị ảnh</span>
                      <select {...form.register(`footerTrustBanners.${idx}.imageFit`)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]">
                        <option value="contain">Hiển thị đủ ảnh (không crop)</option>
                        <option value="cover">Phủ đầy khung (có thể crop)</option>
                      </select>
                    </label>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">CTA nổi</h3>
              <p className="mt-1 text-xs text-slate-500">Cấu hình các CTA nổi như gọi điện, Zalo, Messenger, mua ngay hoặc tư vấn.</p>
            </div>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">JSON CTA nổi bên phải</span>
              <textarea {...form.register("floatingCtasJson")} rows={6} className="font-mono text-xs" placeholder='[{"label":"Gọi hotline","href":"tel:19006868","enabled":true,"sortOrder":1}]' />
              <p className="text-xs text-slate-500">Chỉ chỉnh khi bạn hiểu cấu trúc dữ liệu. Sai JSON có thể làm lỗi hiển thị.</p>
              {form.formState.errors.floatingCtasJson ? (
                <p className="text-xs text-rose-600">{form.formState.errors.floatingCtasJson.message}</p>
              ) : null}
            </label>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Product detail settings</h3>
              <p className="mt-1 text-xs text-slate-500">Nhãn nút/tiêu đề/chính sách cho trang chi tiết sản phẩm.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                <input type="checkbox" {...form.register("productDetailEnabled")} className="h-4 w-4 rounded border-zinc-300" />
                Bật trang chi tiết sản phẩm
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                <input type="checkbox" {...form.register("showPolicyRow")} className="h-4 w-4 rounded border-zinc-300" />
                Hiển thị hàng chính sách nhanh
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                <input type="checkbox" {...form.register("showReviewSection")} className="h-4 w-4 rounded border-zinc-300" />
                Hiển thị khu vực đánh giá
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                <input type="checkbox" {...form.register("showRelatedProducts")} className="h-4 w-4 rounded border-zinc-300" />
                Hiển thị sản phẩm liên quan
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                <input type="checkbox" {...form.register("showBestPriceNote")} className="h-4 w-4 rounded border-zinc-300" />
                Hiển thị ghi chú giá tốt nhất
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                <input type="checkbox" {...form.register("showDiscountBadge")} className="h-4 w-4 rounded border-zinc-300" />
                Hiển thị badge phần trăm giảm giá
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700 md:col-span-2">
                <input type="checkbox" {...form.register("hideTechnicalSpecs")} className="h-4 w-4 rounded border-zinc-300" />
                Ẩn thông số kỹ thuật
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Nhãn nút Mua ngay</span>
                <input {...form.register("buyNowLabel")} />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Nhãn nút Thêm vào giỏ</span>
                <input {...form.register("addToCartLabel")} />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-zinc-700">Nhãn dòng giá tốt nhất</span>
                <input {...form.register("bestPriceLabel")} />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Tiêu đề mô tả</span>
                <input {...form.register("descriptionTitle")} />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Nhãn xem thêm</span>
                <input {...form.register("readMoreLabel")} />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Tiêu đề đánh giá</span>
                <input {...form.register("reviewTitle")} />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Text khi chưa có đánh giá</span>
                <input {...form.register("reviewEmptyText")} />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Nhãn đã mua hàng</span>
                <input {...form.register("verifiedPurchaseLabel")} />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Nhãn đã bán</span>
                <input {...form.register("soldLabel")} />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Nhãn rating</span>
                <input {...form.register("ratingLabel")} />
              </label>
              <div />
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Policy chính hãng</span>
                <input {...form.register("policyOfficialLabel")} />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Policy đổi trả</span>
                <input {...form.register("policyReturnLabel")} />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Policy vận chuyển</span>
                <input {...form.register("policyShippingLabel")} />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Policy bảo hành</span>
                <input {...form.register("policyWarrantyLabel")} />
              </label>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Cấu hình nâng cao (JSON)</h3>
              <p className="mt-1 text-xs text-slate-500">Dành cho trường hợp cần tinh chỉnh cấu trúc hiển thị storefront.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 xl:col-span-2">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Ưu đãi (Deals) — Visual editor</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Cấu hình trang <span className="font-mono">/uu-dai</span>. Không cần sửa JSON tay.
                  </p>
                  {form.formState.errors.dealsSectionsJson ? (
                    <p className="mt-2 text-xs text-rose-600">{form.formState.errors.dealsSectionsJson.message}</p>
                  ) : null}
                </div>

                {(() => {
                  const lifecycle = dealsLifecycle;
                  const meta = lifecycle && typeof lifecycle.meta === "object" ? (lifecycle.meta as Record<string, unknown>) : null;
                  const metaValue =
                    meta && meta.value && typeof meta.value === "object"
                      ? (meta.value as Record<string, unknown>)
                      : null;
                  const publishedAt = (metaValue?.publishedAt as string) || "";
                  const publishedBy =
                    metaValue?.publishedBy && typeof metaValue.publishedBy === "object"
                      ? (metaValue.publishedBy as Record<string, unknown>)
                      : null;
                  const publishedById = (publishedBy?.id as string) || "";
                  const publishedByRole = (publishedBy?.role as string) || "";
                  const draftDiffers = Boolean(lifecycle?.draftDiffersFromPublished);
                  const draftInfo =
                    lifecycle?.draft && typeof lifecycle.draft === "object"
                      ? (lifecycle.draft as Record<string, unknown>)
                      : null;
                  const draftUpdatedAt = (draftInfo?.updatedAt as string) || "";

                  const versionsInfo =
                    lifecycle?.versions && typeof lifecycle.versions === "object"
                      ? (lifecycle.versions as Record<string, unknown>)
                      : null;
                  const versionsRaw = (versionsInfo?.value as unknown) ?? [];
                  const versions = Array.isArray(versionsRaw) ? versionsRaw : [];
                  const scheduledInfo =
                    lifecycle?.scheduled && typeof lifecycle.scheduled === "object"
                      ? (lifecycle.scheduled as Record<string, unknown>)
                      : null;
                  const scheduledValue =
                    scheduledInfo?.value && typeof scheduledInfo.value === "object"
                      ? (scheduledInfo.value as Record<string, unknown>)
                      : null;
                  const scheduledPublishAt = (scheduledValue?.publishAt as string) || "";
                  const scheduledUnpublishAt = (scheduledValue?.unpublishAt as string) || "";
                  const diffs = lifecycle && typeof lifecycle.diffs === "object" ? (lifecycle.diffs as Record<string, unknown>) : null;
                  const draftDiff = Array.isArray(diffs?.draftVsPublished) ? (diffs?.draftVsPublished as string[]) : [];
                  const scheduledDiff = Array.isArray(diffs?.scheduledVsPublished) ? (diffs?.scheduledVsPublished as string[]) : [];

                  return (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
                      <div className="flex flex-wrap items-center gap-3">
                        <div>
                          <span className="font-semibold">Last published</span>{" "}
                          <span className="font-mono">{publishedAt || "(chưa có)"}</span>
                        </div>
                        <div>
                          <span className="font-semibold">By</span>{" "}
                          <span className="font-mono">
                            {publishedById || "(unknown)"} {publishedByRole ? `(${publishedByRole})` : ""}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold">Draft</span>{" "}
                          <span className="font-mono">{draftUpdatedAt || "(none)"}</span>
                        </div>
                        <div className={draftDiffers ? "font-semibold text-amber-700" : "text-slate-500"}>
                          {draftDiffers ? "Draft differs from published" : "Draft matches published"}
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className="space-y-1">
                          <span className="font-semibold">Publish at (ISO UTC)</span>
                          <input
                            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs"
                            placeholder="2026-05-06T12:00:00.000Z"
                            value={publishAt}
                            onChange={(e) => setPublishAt(e.target.value)}
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="font-semibold">Unpublish at (ISO UTC)</span>
                          <input
                            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs"
                            placeholder="2026-05-07T12:00:00.000Z"
                            value={unpublishAt}
                            onChange={(e) => setUnpublishAt(e.target.value)}
                          />
                        </label>
                      </div>

                      {scheduledValue ? (
                        <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 p-2 text-indigo-900">
                          <div className="font-semibold">Scheduled</div>
                          <div className="mt-1 font-mono">
                            publishAt: {scheduledPublishAt || "(none)"}{" "}
                            <br />
                            unpublishAt: {scheduledUnpublishAt || "(none)"}
                          </div>
                        </div>
                      ) : null}

                      {draftDiff.length ? (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-900">
                          <div className="font-semibold">Diff (Draft vs Published)</div>
                          <ul className="mt-1 list-disc pl-5 font-mono">
                            {draftDiff.slice(0, 8).map((l, i) => (
                              <li key={i}>{l}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {scheduledDiff.length ? (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-900">
                          <div className="font-semibold">Diff (Scheduled vs Published)</div>
                          <ul className="mt-1 list-disc pl-5 font-mono">
                            {scheduledDiff.slice(0, 8).map((l, i) => (
                              <li key={i}>{l}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {dealsAudit.length ? (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2 text-slate-900">
                          <div className="font-semibold">Campaign activity timeline</div>
                          <div className="mt-1 space-y-1">
                            {dealsAudit.slice(0, 8).map((row, idx) => {
                              const obj = row && typeof row === "object" ? (row as Record<string, unknown>) : null;
                              const action = String(obj?.action ?? "");
                              const actorName = String(obj?.actorName ?? "");
                              const createdAt = String(obj?.createdAt ?? "");
                              return (
                                <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="font-mono font-semibold">{action}</div>
                                    <div className="font-mono text-slate-600">{createdAt}</div>
                                  </div>
                                  <div className="text-slate-700">{actorName}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      {dealsHealth ? (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2 text-slate-900">
                          <div className="font-semibold">Deals health summary</div>
                          <div className="mt-1">
                            {(() => {
                              const s =
                                dealsHealth.summary && typeof dealsHealth.summary === "object"
                                  ? (dealsHealth.summary as Record<string, unknown>)
                                  : null;
                              const totals =
                                s?.totals && typeof s.totals === "object" ? (s.totals as Record<string, unknown>) : null;
                              const items = Array.isArray(s?.items) ? (s?.items as unknown[]) : [];
                              return (
                                <div className="space-y-2">
                                  <div className="flex flex-wrap gap-2 font-mono text-xs">
                                    <span>critical: {String(totals?.critical ?? 0)}</span>
                                    <span>warning: {String(totals?.warning ?? 0)}</span>
                                    <span>info: {String(totals?.info ?? 0)}</span>
                                  </div>
                                  <div className="space-y-1">
                                    {items.slice(0, 6).map((it, idx) => {
                                      const o = it && typeof it === "object" ? (it as Record<string, unknown>) : null;
                                      const sev = String(o?.severity ?? "");
                                      const title = String(o?.title ?? "");
                                      const count = String(o?.count ?? "");
                                      return (
                                        <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs">
                                          [{sev}] {title} — {count}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2 text-slate-900">
                        <div className="font-semibold">Shareable preview link</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold"
                            onClick={async () => {
                              const res = await fetch("/api/admin/settings/deals-preview-token", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ scope: "draft", hours: 6 }),
                              });
                              const json = (await res.json()) as unknown;
                              const j =
                                (json && typeof json === "object" ? (json as Record<string, unknown>) : null) ?? null;
                              if (!res.ok) {
                                setErr((j?.message as string) ?? "Không thể tạo preview token.");
                                return;
                              }
                              setPreviewToken(String(j?.token ?? ""));
                              setOk("Đã tạo preview token (6h).");
                            }}
                          >
                            Generate token (draft, 6h)
                          </button>
                          <a
                            href={previewToken ? `/uu-dai?previewToken=${encodeURIComponent(previewToken)}` : "/uu-dai"}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold"
                          >
                            Open preview link
                          </a>
                        </div>
                        {previewToken ? (
                          <input
                            className="mt-2 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs"
                            value={previewToken}
                            readOnly
                          />
                        ) : null}
                      </div>

                      {dealsPerf ? (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2 text-slate-900">
                          <div className="font-semibold">Campaign performance (last 7 days)</div>
                          {(() => {
                            const perf =
                              dealsPerf.performance && typeof dealsPerf.performance === "object"
                                ? (dealsPerf.performance as Record<string, unknown>)
                                : null;
                            const top = Array.isArray(perf?.topSections) ? (perf?.topSections as unknown[]) : [];
                            const worst = Array.isArray(perf?.worstCtrSections) ? (perf?.worstCtrSections as unknown[]) : [];
                            return (
                              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                                  <div className="text-xs font-semibold">Top sections</div>
                                  <div className="mt-1 space-y-1 font-mono text-xs">
                                    {top.slice(0, 5).map((r, i) => {
                                      const o = r && typeof r === "object" ? (r as Record<string, unknown>) : null;
                                      return (
                                        <div key={i}>
                                          {String(o?.sectionId ?? "")} score={String(o?.score ?? "")} ctr=
                                          {String(o?.ctr ?? "")}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                                  <div className="text-xs font-semibold">Worst CTR</div>
                                  <div className="mt-1 space-y-1 font-mono text-xs">
                                    {worst.slice(0, 5).map((r, i) => {
                                      const o = r && typeof r === "object" ? (r as Record<string, unknown>) : null;
                                      return (
                                        <div key={i}>
                                          {String(o?.sectionId ?? "")} ctr={String(o?.ctr ?? "")} imp=
                                          {String(o?.impressions ?? "")}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : null}

                      <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2 text-slate-900">
                        <div className="font-semibold">Campaign comparison</div>
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <input
                            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs"
                            placeholder="campaignId A"
                            value={compareA}
                            onChange={(e) => setCompareA(e.target.value)}
                          />
                          <input
                            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs"
                            placeholder="campaignId B"
                            value={compareB}
                            onChange={(e) => setCompareB(e.target.value)}
                          />
                          <button
                            type="button"
                            className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold"
                            onClick={async () => {
                              setCompareResult(null);
                              const a = compareA.trim();
                              const b = compareB.trim();
                              if (!a || !b) {
                                setErr("Nhập campaignId A/B để so sánh.");
                                return;
                              }
                              const res = await fetch(`/api/admin/settings/deals-compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}&days=7`);
                              const json = (await res.json()) as unknown;
                              if (!res.ok || !json || typeof json !== "object") {
                                setErr("Không thể compare campaigns.");
                                return;
                              }
                              setCompareResult(json as Record<string, unknown>);
                            }}
                          >
                            Compare
                          </button>
                        </div>
                        {compareResult ? (
                          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs">
                            {(() => {
                              const r =
                                compareResult.result && typeof compareResult.result === "object"
                                  ? (compareResult.result as Record<string, unknown>)
                                  : null;
                              const aObj = r?.a && typeof r.a === "object" ? (r.a as Record<string, unknown>) : null;
                              const bObj = r?.b && typeof r.b === "object" ? (r.b as Record<string, unknown>) : null;
                              return (
                                <div>
                                  winner: {String(r?.winner ?? "")} ctrA={String(aObj?.ctr ?? "")} ctrB=
                                  {String(bObj?.ctr ?? "")}
                                </div>
                              );
                            })()}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2 text-slate-900">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold">Attribution summary (last 7 days)</div>
                          <button
                            type="button"
                            className="h-8 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold"
                            onClick={async () => {
                              setAttrSummary(null);
                              const res = await fetch("/api/admin/settings/deals-attribution?days=7");
                              const json = (await res.json()) as unknown;
                              if (!res.ok || !json || typeof json !== "object") {
                                setErr("Không thể tải attribution summary.");
                                return;
                              }
                              setAttrSummary(json as Record<string, unknown>);
                            }}
                          >
                            Refresh
                          </button>
                        </div>
                        {attrSummary ? (
                          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                              <div className="text-xs font-semibold">Top referrers</div>
                              <div className="mt-1 space-y-1 font-mono text-xs">
                                {(() => {
                                  const s =
                                    attrSummary.summary && typeof attrSummary.summary === "object"
                                      ? (attrSummary.summary as Record<string, unknown>)
                                      : null;
                                  const sObj = s ?? {};
                                  const top = (sObj as Record<string, unknown>).topReferrers;
                                  const rows = Array.isArray(top) ? (top as unknown[]) : [];
                                  return rows.slice(0, 6).map((r, idx) => {
                                    const o = r && typeof r === "object" ? (r as Record<string, unknown>) : null;
                                    return (
                                      <div key={idx}>
                                        {String(o?.referrer ?? "")} clk={String(o?.clicks ?? "")} ctr={String(o?.ctr ?? "")}
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                              <div className="text-xs font-semibold">Top campaigns</div>
                              <div className="mt-1 space-y-1 font-mono text-xs">
                                {(() => {
                                  const s =
                                    attrSummary.summary && typeof attrSummary.summary === "object"
                                      ? (attrSummary.summary as Record<string, unknown>)
                                      : null;
                                  const sObj = s ?? {};
                                  const top = (sObj as Record<string, unknown>).topCampaigns;
                                  const rows = Array.isArray(top) ? (top as unknown[]) : [];
                                  return rows.slice(0, 6).map((r, idx) => {
                                    const o = r && typeof r === "object" ? (r as Record<string, unknown>) : null;
                                    return (
                                      <div key={idx}>
                                        {String(o?.campaignId ?? "")} clk={String(o?.clicks ?? "")} ctr={String(o?.ctr ?? "")}
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {dealsEvents.length ? (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2 text-slate-900">
                          <div className="font-semibold">Recent deals events (debug)</div>
                          <div className="mt-2 space-y-1 font-mono text-xs">
                            {dealsEvents.slice(0, 8).map((e, idx) => {
                              const o = e && typeof e === "object" ? (e as Record<string, unknown>) : null;
                              const name = String(o?.eventName ?? "");
                              const createdAt = String(o?.createdAt ?? "");
                              const ctx = o?.ctx && typeof o.ctx === "object" ? (o.ctx as Record<string, unknown>) : null;
                              return (
                                <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
                                  {createdAt} {name} sec={String(ctx?.sectionId ?? "")} prod={String(ctx?.productId ?? "")}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      {dealsWarnings.length ? (
                        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-900">
                          <div className="font-semibold">Warnings ({dealsWarnings.length})</div>
                          <ul className="mt-1 list-disc pl-5">
                            {dealsWarnings.slice(0, 10).map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {versions.length ? (
                        <div className="mt-2">
                          <div className="font-semibold">Versions</div>
                          <div className="mt-1 space-y-1">
                            {versions.slice(0, 5).map((v) => {
                              const obj = v && typeof v === "object" ? (v as Record<string, unknown>) : null;
                              const id = (obj?.id as string) || "";
                              const capturedAt = (obj?.capturedAt as string) || "";
                              return (
                                <div
                                  key={id || capturedAt}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2"
                                >
                                  <div className="min-w-0">
                                    <div className="truncate font-mono">{capturedAt || id}</div>
                                  </div>
                                  <button
                                    type="button"
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold"
                                    onClick={async () => {
                                      if (!id) return;
                                      const okConfirm = window.confirm("Restore this version?");
                                      if (!okConfirm) return;
                                      const res = await fetch("/api/admin/settings/deals-lifecycle", {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ action: "rollback", versionId: id }),
                                      });
                                      const json = (await res.json()) as unknown;
                                      const j =
                                        (json && typeof json === "object"
                                          ? (json as Record<string, unknown>)
                                          : null) ?? null;
                                      if (!res.ok || !j?.success) {
                                        setErr((j?.message as string) ?? "Rollback thất bại.");
                                        return;
                                      }
                                      setOk("Đã rollback version.");
                                    }}
                                  >
                                    Restore
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"
                    onClick={async () => {
                      const payload = { dealsSectionsJson: form.getValues("dealsSectionsJson") };
                      const res = await fetch("/api/admin/settings/deals-draft", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                      });
                      if (!res.ok) {
                        setErr("Không thể lưu nháp Ưu đãi. Vui lòng thử lại.");
                        return;
                      }
                      setOk("Đã lưu nháp Ưu đãi.");
                    }}
                  >
                    Lưu nháp Ưu đãi
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
                    onClick={async () => {
                      setDealsWarnings([]);
                      const res = await fetch("/api/admin/settings/deals-lifecycle", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "schedule",
                          publishAt: publishAt || null,
                          unpublishAt: unpublishAt || null,
                        }),
                      });
                      const json = (await res.json()) as unknown;
                      const j = (json && typeof json === "object" ? (json as Record<string, unknown>) : null) ?? null;
                      if (!res.ok) {
                        setErr((j?.message as string) ?? "Không thể schedule campaign.");
                        return;
                      }
                      if (j?.success === false && Array.isArray(j?.warnings) && (j.warnings as unknown[]).length) {
                        const msgs = (j.warnings as unknown[])
                          .map((w) => (w && typeof w === "object" ? String((w as Record<string, unknown>).message ?? "") : ""))
                          .filter(Boolean);
                        setDealsWarnings(msgs);
                        setErr(msgs[0] || "Schedule không hợp lệ.");
                        return;
                      }
                      setOk("Đã schedule campaign (chờ auto publish).");
                    }}
                  >
                    Schedule publish
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900"
                    onClick={async () => {
                      const confirmed = window.confirm("Cancel scheduled campaign?");
                      if (!confirmed) return;
                      const res = await fetch("/api/admin/settings/deals-lifecycle", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "cancelSchedule" }),
                      });
                      const json = (await res.json()) as unknown;
                      const j = (json && typeof json === "object" ? (json as Record<string, unknown>) : null) ?? null;
                      if (!res.ok || !j?.success) {
                        setErr((j?.message as string) ?? "Không thể cancel schedule.");
                        return;
                      }
                      setOk("Đã cancel schedule.");
                    }}
                  >
                    Cancel schedule
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                    onClick={async () => {
                      setDealsWarnings([]);
                      const res = await fetch("/api/admin/settings/deals-lifecycle", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "publish", publishAt: publishAt || null, unpublishAt: unpublishAt || null }),
                      });
                      const json = (await res.json()) as unknown;
                      const j = (json && typeof json === "object" ? (json as Record<string, unknown>) : null) ?? null;
                      if (!res.ok) {
                        setErr((j?.message as string) ?? "Không thể publish Ưu đãi.");
                        return;
                      }
                      if (j?.success === false && Array.isArray(j?.warnings) && (j.warnings as unknown[]).length) {
                        const msgs = (j.warnings as unknown[]).map((w) => {
                          if (w && typeof w === "object") return String((w as Record<string, unknown>).message ?? "");
                          return "";
                        }).filter(Boolean);
                        setDealsWarnings(msgs);
                        const confirmed = window.confirm(
                          `Có ${(j.warnings as unknown[]).length} cảnh báo. Publish vẫn tiếp tục?`,
                        );
                        if (!confirmed) return;
                        const res2 = await fetch("/api/admin/settings/deals-lifecycle", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "publish", force: true, publishAt: publishAt || null, unpublishAt: unpublishAt || null }),
                        });
                        const json2 = (await res2.json()) as unknown;
                        const j2 =
                          (json2 && typeof json2 === "object" ? (json2 as Record<string, unknown>) : null) ?? null;
                        if (!res2.ok || !j2?.success) {
                          setErr((j2?.message as string) ?? "Publish Ưu đãi thất bại.");
                          return;
                        }
                        setOk("Đã publish Ưu đãi.");
                        return;
                      }
                      setOk("Đã publish Ưu đãi.");
                    }}
                  >
                    Publish now
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
                    onClick={async () => {
                      const confirmed = window.confirm("Discard draft Ưu đãi?");
                      if (!confirmed) return;
                      const res = await fetch("/api/admin/settings/deals-lifecycle", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "discard" }),
                      });
                      const json = (await res.json()) as unknown;
                      const j = (json && typeof json === "object" ? (json as Record<string, unknown>) : null) ?? null;
                      if (!res.ok || !j?.success) {
                        setErr((j?.message as string) ?? "Không thể discard draft Ưu đãi.");
                        return;
                      }
                      setOk("Đã discard draft Ưu đãi.");
                    }}
                  >
                    Discard draft
                  </button>
                  <a
                    href="/uu-dai?preview=1"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900"
                  >
                    Mở preview
                  </a>
                </div>

                <div className="space-y-3">
                  {dealsSections.map((s, idx) => {
                    const update = (patch: Partial<DealsSectionConfig>) => {
                      const next = dealsSections.map((row, i) => (i === idx ? { ...row, ...patch } : row));
                      setDealsSections(next);
                      form.setValue("dealsSectionsJson", JSON.stringify(next, null, 2), {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                    };
                    const isVoucher = s.type === "voucher_hot";
                    return (
                      <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
                                <input
                                  type="checkbox"
                                  checked={Boolean(s.enabled)}
                                  onChange={(e) => update({ enabled: e.target.checked })}
                                  className="h-4 w-4 rounded border-zinc-300"
                                />
                                Bật
                              </label>
                              <select
                                value={s.type}
                                onChange={(e) => update({ type: e.target.value as DealsSectionConfig["type"] })}
                                className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-800"
                              >
                                <option value="flash_sale">Flash Sale</option>
                                <option value="voucher_hot">Voucher hot</option>
                                <option value="deal_under_99k">Deal dưới 99k</option>
                                <option value="freeship">Freeship</option>
                                <option value="trending">Trending</option>
                                <option value="deep_discount">Giảm sâu</option>
                              </select>
                              <input
                                value={s.title}
                                onChange={(e) => update({ title: e.target.value })}
                                className="h-9 min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"
                                placeholder="Tiêu đề"
                              />
                            </div>
                            <input
                              value={s.subtitle ?? ""}
                              onChange={(e) => update({ subtitle: e.target.value })}
                              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                              placeholder="Mô tả (tuỳ chọn)"
                            />

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <label className="space-y-1.5">
                                <span className="text-xs font-semibold text-slate-700">Thứ tự</span>
                                <input
                                  type="number"
                                  value={Number(s.sortOrder ?? idx + 1)}
                                  onChange={(e) => update({ sortOrder: Number(e.target.value || 0) })}
                                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                />
                              </label>
                              <label className="space-y-1.5">
                                <span className="text-xs font-semibold text-slate-700">Màu nền (hex/CSS)</span>
                                <input
                                  value={s.theme?.background ?? ""}
                                  onChange={(e) => update({ theme: { ...(s.theme ?? {}), background: e.target.value } })}
                                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                  placeholder="#F8FAFC"
                                />
                              </label>
                              <label className="space-y-1.5 sm:col-span-2">
                                <span className="text-xs font-semibold text-slate-700">Theme preset</span>
                                <select
                                  value={s.theme?.preset ?? ""}
                                  onChange={(e) =>
                                    update({
                                      theme: {
                                        ...(s.theme ?? {}),
                                        preset: (e.target.value || undefined) as DealsSectionConfig["theme"]["preset"],
                                      },
                                    })
                                  }
                                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm font-semibold"
                                >
                                  <option value="">(không dùng preset)</option>
                                  <option value="flash-sale">flash-sale</option>
                                  <option value="dark-sale">dark-sale</option>
                                  <option value="luxury">luxury</option>
                                  <option value="tet">tet</option>
                                  <option value="neon">neon</option>
                                  <option value="minimal">minimal</option>
                                </select>
                              </label>
                              <label className="space-y-1.5 sm:col-span-2">
                                <span className="text-xs font-semibold text-slate-700">Banner mobile (media URL)</span>
                                <input
                                  value={s.banner?.mobileImage ?? ""}
                                  onChange={(e) =>
                                    update({ banner: { ...(s.banner ?? {}), mobileImage: e.target.value } })
                                  }
                                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                  placeholder="https://media.zendo.vn/..."
                                />
                              </label>
                            </div>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                              <label className="space-y-1.5 sm:col-span-2">
                                <span className="text-xs font-semibold text-slate-700">Banner desktop (media URL)</span>
                                <input
                                  value={s.banner?.desktopImage ?? ""}
                                  onChange={(e) =>
                                    update({ banner: { ...(s.banner ?? {}), desktopImage: e.target.value } })
                                  }
                                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                  placeholder="https://media.zendo.vn/..."
                                />
                              </label>
                              <label className="space-y-1.5">
                                <span className="text-xs font-semibold text-slate-700">Link banner</span>
                                <input
                                  value={s.banner?.link ?? ""}
                                  onChange={(e) => update({ banner: { ...(s.banner ?? {}), link: e.target.value } })}
                                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                  placeholder="/uu-dai"
                                />
                              </label>
                            </div>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                              <label className="inline-flex items-center gap-2 pt-5">
                                <input
                                  type="checkbox"
                                  checked={Boolean(s.countdown?.enabled)}
                                  onChange={(e) =>
                                    update({ countdown: { ...(s.countdown ?? { enabled: false }), enabled: e.target.checked } })
                                  }
                                  className="h-4 w-4 rounded border-zinc-300"
                                />
                                <span className="text-xs font-semibold text-slate-700">Bật countdown</span>
                              </label>
                              <label className="space-y-1.5">
                                <span className="text-xs font-semibold text-slate-700">StartsAt (ISO)</span>
                                <input
                                  value={s.countdown?.startsAt ?? ""}
                                  onChange={(e) =>
                                    update({ countdown: { ...(s.countdown ?? { enabled: false }), startsAt: e.target.value } })
                                  }
                                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                  placeholder="2026-05-06T00:00:00+07:00"
                                />
                              </label>
                              <label className="space-y-1.5">
                                <span className="text-xs font-semibold text-slate-700">EndsAt (ISO)</span>
                                <input
                                  value={s.countdown?.endsAt ?? ""}
                                  onChange={(e) =>
                                    update({ countdown: { ...(s.countdown ?? { enabled: false }), endsAt: e.target.value } })
                                  }
                                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                  placeholder="2026-05-06T23:59:59+07:00"
                                />
                              </label>
                            </div>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                              <label className="space-y-1.5">
                                <span className="text-xs font-semibold text-slate-700">Nguồn sản phẩm</span>
                                <select
                                  value={s.productSource?.type ?? ""}
                                  onChange={(e) =>
                                    update({
                                      productSource: e.target.value
                                        ? {
                                            ...(s.productSource ?? { type: "sale", limit: 12 }),
                                            type: e.target.value as DealsSectionConfig["productSource"]["type"],
                                          }
                                        : undefined,
                                    })
                                  }
                                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm font-semibold"
                                >
                                  <option value="">(tắt)</option>
                                  <option value="sale">Sale</option>
                                  <option value="featured">Featured</option>
                                  <option value="newest">Newest</option>
                                  <option value="trending">Trending</option>
                                  <option value="under_price">Under price</option>
                                  <option value="category">Category</option>
                                  <option value="manual">Manual</option>
                                </select>
                              </label>
                              <label className="space-y-1.5">
                                <span className="text-xs font-semibold text-slate-700">Limit</span>
                                <input
                                  type="number"
                                  value={s.productSource?.limit ?? 12}
                                  onChange={(e) =>
                                    update({
                                      productSource: s.productSource
                                        ? { ...s.productSource, limit: Number(e.target.value || 0) || 0 }
                                        : undefined,
                                    })
                                  }
                                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                />
                              </label>
                              <label className="space-y-1.5">
                                <span className="text-xs font-semibold text-slate-700">Max price (VND)</span>
                                <input
                                  type="number"
                                  value={s.productSource?.maxPrice ?? ""}
                                  onChange={(e) =>
                                    update({
                                      productSource: s.productSource
                                        ? {
                                            ...s.productSource,
                                            maxPrice: e.target.value ? Number(e.target.value) : undefined,
                                          }
                                        : undefined,
                                    })
                                  }
                                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                  placeholder="99000"
                                />
                              </label>
                              <label className="space-y-1.5 sm:col-span-3">
                                <span className="text-xs font-semibold text-slate-700">Manual productIds (comma-separated)</span>
                                <input
                                  value={(s.productSource?.productIds ?? []).join(",")}
                                  onChange={(e) =>
                                    update({
                                      productSource: s.productSource
                                        ? {
                                            ...s.productSource,
                                            productIds: e.target.value
                                              .split(",")
                                              .map((v) => v.trim())
                                              .filter(Boolean)
                                              .slice(0, 200),
                                          }
                                        : undefined,
                                    })
                                  }
                                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                  placeholder="cuid1,cuid2,..."
                                />
                              </label>
                            </div>

                            {isVoucher ? (
                              <label className="space-y-1.5">
                                <span className="text-xs font-semibold text-slate-700">Voucher couponIds (comma-separated)</span>
                                <input
                                  value={(s.voucherSource?.couponIds ?? []).join(",")}
                                  onChange={(e) =>
                                    update({
                                      voucherSource: {
                                        couponIds: e.target.value
                                          .split(",")
                                          .map((v) => v.trim())
                                          .filter(Boolean)
                                          .slice(0, 50),
                                      },
                                    })
                                  }
                                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                  placeholder="cuid1,cuid2,..."
                                />
                              </label>
                            ) : null}
                          </div>

                          <div className="shrink-0 space-y-2">
                            <button
                              type="button"
                              className="w-10 rounded-xl border border-slate-200 bg-white py-2 text-sm font-bold"
                              disabled={idx === 0}
                              onClick={() => {
                                if (idx === 0) return;
                                const next = [...dealsSections];
                                const tmp = next[idx - 1];
                                next[idx - 1] = next[idx];
                                next[idx] = tmp;
                                setDealsSections(next);
                                form.setValue("dealsSectionsJson", JSON.stringify(next, null, 2), {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                              }}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="w-10 rounded-xl border border-slate-200 bg-white py-2 text-sm font-bold"
                              disabled={idx === dealsSections.length - 1}
                              onClick={() => {
                                if (idx === dealsSections.length - 1) return;
                                const next = [...dealsSections];
                                const tmp = next[idx + 1];
                                next[idx + 1] = next[idx];
                                next[idx] = tmp;
                                setDealsSections(next);
                                form.setValue("dealsSectionsJson", JSON.stringify(next, null, 2), {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                              }}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className="w-10 rounded-xl border border-rose-200 bg-rose-50 py-2 text-sm font-bold text-rose-700"
                              onClick={() => {
                                const next = dealsSections.filter((_, i) => i !== idx);
                                setDealsSections(next);
                                form.setValue("dealsSectionsJson", JSON.stringify(next, null, 2), {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                              }}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"
                  onClick={() => {
                    const next: DealsSectionConfig[] = [
                      ...dealsSections,
                      {
                        id: `custom_${Date.now()}`,
                        type: "flash_sale",
                        enabled: false,
                        title: "Section mới",
                        subtitle: "",
                        sortOrder: (dealsSections[dealsSections.length - 1]?.sortOrder ?? dealsSections.length) + 1,
                        theme: { background: "" },
                        banner: { desktopImage: "", mobileImage: "", link: "" },
                        countdown: { enabled: false, startsAt: "", endsAt: "" },
                        productSource: { type: "sale", limit: 12, minDiscountPercent: 10 },
                      },
                    ];
                    setDealsSections(next);
                    form.setValue("dealsSectionsJson", JSON.stringify(next, null, 2), {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                >
                  + Thêm section
                </button>
              </div>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">JSON menu điều hướng header</span>
                <textarea {...form.register("headerMenuJson")} rows={6} className="font-mono text-xs" />
                <p className="text-xs text-slate-500">Chỉ chỉnh khi bạn hiểu cấu trúc dữ liệu. Sai JSON có thể làm lỗi hiển thị.</p>
                {form.formState.errors.headerMenuJson ? (
                  <p className="text-xs text-rose-600">{form.formState.errors.headerMenuJson.message}</p>
                ) : null}
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">JSON thẻ lợi ích trang chủ</span>
                <textarea {...form.register("homeInfoCardsJson")} rows={6} className="font-mono text-xs" />
                <p className="text-xs text-slate-500">Chỉ chỉnh khi bạn hiểu cấu trúc dữ liệu. Sai JSON có thể làm lỗi hiển thị.</p>
                {form.formState.errors.homeInfoCardsJson ? (
                  <p className="text-xs text-rose-600">{form.formState.errors.homeInfoCardsJson.message}</p>
                ) : null}
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">JSON chip “Ưu đãi nhanh”</span>
                <textarea {...form.register("homeQuickChipsJson")} rows={6} className="font-mono text-xs" />
                <p className="text-xs text-slate-500">Chỉ chỉnh khi bạn hiểu cấu trúc dữ liệu. Sai JSON có thể làm lỗi hiển thị.</p>
                {form.formState.errors.homeQuickChipsJson ? (
                  <p className="text-xs text-rose-600">{form.formState.errors.homeQuickChipsJson.message}</p>
                ) : null}
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">JSON chip “Danh mục”</span>
                <textarea {...form.register("homeCategoryChipsJson")} rows={6} className="font-mono text-xs" />
                <p className="text-xs text-slate-500">Chỉ chỉnh khi bạn hiểu cấu trúc dữ liệu. Sai JSON có thể làm lỗi hiển thị.</p>
                {form.formState.errors.homeCategoryChipsJson ? (
                  <p className="text-xs text-rose-600">{form.formState.errors.homeCategoryChipsJson.message}</p>
                ) : null}
              </label>
              <label className="space-y-1.5 xl:col-span-2">
                <span className="text-sm font-medium text-zinc-700">JSON nhóm link footer</span>
                <textarea {...form.register("footerGroupsJson")} rows={7} className="font-mono text-xs" />
                <p className="text-xs text-slate-500">Chỉ chỉnh khi bạn hiểu cấu trúc dữ liệu. Sai JSON có thể làm lỗi hiển thị.</p>
                {form.formState.errors.footerGroupsJson ? (
                  <p className="text-xs text-rose-600">{form.formState.errors.footerGroupsJson.message}</p>
                ) : null}
              </label>
            </div>
          </section>
        </div>
        {form.formState.errors.announcementText ? (
          <p className="text-xs text-rose-600">{form.formState.errors.announcementText.message}</p>
        ) : null}
        {err ? <p className={ERROR_ALERT_CLASS}>{err}</p> : null}
        {ok ? <p className={SUCCESS_ALERT_CLASS}>{ok}</p> : null}
        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className={PRIMARY_BUTTON_CLASS}
        >
          {form.formState.isSubmitting ? "Đang lưu..." : "Lưu phần này"}
        </button>
      </form>
    </section>
  );
}

function FooterCard({
  settings,
  onSaved,
}: {
  settings: WebsiteSettings;
  onSaved: () => Promise<void>;
}): JSX.Element {
  type FormValues = z.infer<typeof websiteSectionFooterSchema>;
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const form = useForm<FormValues>({
    resolver: zodResolver(websiteSectionFooterSchema),
    defaultValues: {
      section: "footer",
      footerBrandName: settings.footerBrandName,
      footerBrandDescription: settings.footerBrandDescription,
      hotline: settings.hotline,
      email: settings.email,
      address: settings.address,
      footerText: settings.footerText,
      showFooterSocialLinks: settings.showFooterSocialLinks,
      footerFacebookUrl: settings.footerFacebookUrl,
      footerInstagramUrl: settings.footerInstagramUrl,
      footerTiktokUrl: settings.footerTiktokUrl,
      footerYoutubeUrl: settings.footerYoutubeUrl,
      footerZaloUrl: settings.footerZaloUrl,
      footerHtml: settings.footerHtml,
    },
  });

  useEffect(() => {
    form.reset({
      section: "footer",
      footerBrandName: settings.footerBrandName,
      footerBrandDescription: settings.footerBrandDescription,
      hotline: settings.hotline,
      email: settings.email,
      address: settings.address,
      footerText: settings.footerText,
      showFooterSocialLinks: settings.showFooterSocialLinks,
      footerFacebookUrl: settings.footerFacebookUrl,
      footerInstagramUrl: settings.footerInstagramUrl,
      footerTiktokUrl: settings.footerTiktokUrl,
      footerYoutubeUrl: settings.footerYoutubeUrl,
      footerZaloUrl: settings.footerZaloUrl,
      footerHtml: settings.footerHtml,
    });
  }, [settings, form]);

  const onSubmit = async (values: FormValues) => {
    setErr("");
    setOk("");
    const result = await patchWebsiteSection(values);
    if (!result.ok) {
      setErr(result.message ?? "");
      return;
    }
    setOk("Đã lưu cài đặt.");
    await onSaved();
  };

  return (
    <section id="section-chan-trang" className={SECTION_CLASS}>
      <div className={SECTION_HEADER_CLASS}>
        <h2 className={SECTION_TITLE_CLASS}>Footer & chính sách link hệ thống</h2>
        <p className={SECTION_DESC_CLASS}>Bản quyền dạng text, khối HTML và liên kết chính sách qua cấu hình storefront.</p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className={FORM_CLASS}>
        <input type="hidden" {...form.register("section")} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Thương hiệu footer</h3>
              <p className="mt-1 text-xs text-slate-500">Thông tin thương hiệu và nội dung hiển thị ở chân trang.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-zinc-700">Tên thương hiệu footer</span>
                <input {...form.register("footerBrandName")} placeholder="Ví dụ: Zendo.vn" />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-zinc-700">Mô tả footer</span>
                <textarea {...form.register("footerBrandDescription")} rows={3} placeholder="Mô tả ngắn thương hiệu hiển thị ở footer." />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-zinc-700">Text copyright/footer</span>
                <textarea {...form.register("footerText")} rows={3} placeholder="Ví dụ: © 2026 Zendo.vn. Đã đăng ký bản quyền." />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Hotline</span>
                <input {...form.register("hotline")} placeholder="Ví dụ: 1900 6868" />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Email</span>
                <input {...form.register("email")} placeholder="support@zendo.vn" />
                {form.formState.errors.email ? <p className="text-xs text-rose-600">{form.formState.errors.email.message}</p> : null}
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-zinc-700">Địa chỉ</span>
                <input {...form.register("address")} placeholder="Ví dụ: 01 Nguyễn Văn Linh, Quận 7, TP. HCM" />
              </label>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Mạng xã hội footer</h3>
              <p className="mt-1 text-xs text-slate-500">Bật/tắt hiển thị và cập nhật liên kết mạng xã hội ở chân trang.</p>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                <input type="checkbox" {...form.register("showFooterSocialLinks")} className="h-4 w-4 rounded border-zinc-300" />
                Bật hiển thị mạng xã hội ở footer
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Facebook</span>
                <input {...form.register("footerFacebookUrl")} placeholder="https://facebook.com/ten-trang" />
                {form.formState.errors.footerFacebookUrl ? <p className="text-xs text-rose-600">{form.formState.errors.footerFacebookUrl.message}</p> : null}
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Instagram</span>
                <input {...form.register("footerInstagramUrl")} placeholder="https://instagram.com/ten-trang" />
                {form.formState.errors.footerInstagramUrl ? <p className="text-xs text-rose-600">{form.formState.errors.footerInstagramUrl.message}</p> : null}
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">TikTok</span>
                <input {...form.register("footerTiktokUrl")} placeholder="https://www.tiktok.com/@ten-trang" />
                {form.formState.errors.footerTiktokUrl ? <p className="text-xs text-rose-600">{form.formState.errors.footerTiktokUrl.message}</p> : null}
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">YouTube</span>
                <input {...form.register("footerYoutubeUrl")} placeholder="https://www.youtube.com/@ten-kenh" />
                {form.formState.errors.footerYoutubeUrl ? <p className="text-xs text-rose-600">{form.formState.errors.footerYoutubeUrl.message}</p> : null}
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Zalo</span>
                <input {...form.register("footerZaloUrl")} placeholder="https://zalo.me/..." />
                {form.formState.errors.footerZaloUrl ? <p className="text-xs text-rose-600">{form.formState.errors.footerZaloUrl.message}</p> : null}
              </label>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Nhóm liên kết footer</h3>
              <p className="mt-1 text-xs text-slate-500">Cấu hình nhóm link nhanh ở footer (dữ liệu website settings).</p>
            </div>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">JSON nhóm liên kết footer</span>
              <textarea
                value={JSON.stringify(settings.footerLinkGroups, null, 2)}
                readOnly
                rows={9}
                className="font-mono text-xs"
              />
              <p className="text-xs text-slate-500">Chỉ chỉnh khi bạn hiểu cấu trúc dữ liệu. Sai JSON có thể làm lỗi footer.</p>
              <p className="text-xs text-slate-500">Nhóm này hiện được chỉnh trong tab “Header / Footer / Banner / CTA nổi”.</p>
            </label>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Nội dung HTML footer nâng cao</h3>
              <p className="mt-1 text-xs text-slate-500">Dùng khi cần nhúng khối HTML tùy chỉnh cho footer.</p>
            </div>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">Footer HTML (tuỳ chọn)</span>
              <textarea
                {...form.register("footerHtml")}
                rows={7}
                className="font-mono text-xs"
                placeholder="<div>...</div>"
              />
              <span className="text-xs text-slate-500">Chỉ dùng khi cần nhúng nội dung HTML tùy chỉnh. Không nhập script lạ.</span>
            </label>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Chính sách liên kết</h3>
              <p className="mt-1 text-xs text-slate-500">
                Hiện chưa có field riêng cho chính sách đổi trả/bảo hành/vận chuyển/bảo mật/điều khoản trong section `footer`.
              </p>
            </div>
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              TODO: Nếu bổ sung field chính sách riêng trong schema `websiteSectionFooterSchema` ở bước sau, hiển thị tại card này.
            </p>
          </section>
        </div>
        {err ? <p className={ERROR_ALERT_CLASS}>{err}</p> : null}
        {ok ? <p className={SUCCESS_ALERT_CLASS}>{ok}</p> : null}
        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className={PRIMARY_BUTTON_CLASS}
        >
          {form.formState.isSubmitting ? "Đang lưu..." : "Lưu phần này"}
        </button>
      </form>
    </section>
  );
}

function TrustCard({
  settings,
  onSaved,
}: {
  settings: WebsiteSettings;
  onSaved: () => Promise<void>;
}): JSX.Element {
  type FormValues = z.infer<typeof websiteSectionTrustSchema>;
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const form = useForm<FormValues>({
    resolver: zodResolver(websiteSectionTrustSchema),
    defaultValues: {
      section: "trust",
      trustBarItems: padTrust(settings.trustBarItems),
    },
  });

  useEffect(() => {
    form.reset({ section: "trust", trustBarItems: padTrust(settings.trustBarItems) });
  }, [settings, form]);

  const onSubmit = async (values: FormValues) => {
    setErr("");
    setOk("");
    const result = await patchWebsiteSection(values);
    if (!result.ok) {
      setErr(result.message ?? "");
      return;
    }
    setOk("Đã lưu cài đặt.");
    await onSaved();
  };

  return (
    <section id="section-trust" className={SECTION_CLASS}>
      <div className={SECTION_HEADER_CLASS}>
        <h2 className={SECTION_TITLE_CLASS}>Header tiện ích / Topbar</h2>
        <p className={SECTION_DESC_CLASS}>Tối đa 4 ô ngắn hiển thị trên đầu storefront.</p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className={FORM_CLASS}>
        <input type="hidden" {...form.register("section")} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Trạng thái hiển thị</h3>
              <p className="mt-1 text-xs text-slate-500">
                Một số công tắc hiển thị nằm trong tab “Header / Footer / Banner / CTA nổi”.
              </p>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                <p className="font-medium text-slate-900">
                  Topbar storefront: {settings.showStorefrontTopbar ? "Bật" : "Tắt"}
                </p>
                <p className="mt-1 text-xs text-slate-500">Thiết lập tại tab Header / Footer / Banner / CTA nổi.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                <p className="font-medium text-slate-900">
                  Thanh ưu điểm đầu trang: {settings.showTopHighlights ? "Bật" : "Tắt"}
                </p>
                <p className="mt-1 text-xs text-slate-500">Thiết lập tại tab Header / Footer / Banner / CTA nổi.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                <p className="font-medium text-slate-900">Nội dung topbar trái: {settings.topbarLeftText || "Chưa có"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                <p className="font-medium text-slate-900">
                  Thông điệp giao hàng: {settings.topbarShippingText || "Chưa có"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                <p className="font-medium text-slate-900">
                  Thông điệp cam kết: {settings.topbarCommitmentText || "Chưa có"}
                </p>
              </div>
              <a
                href="?section=storefront"
                className="inline-flex items-center rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700"
              >
                Mở tab Header / Footer / Banner / CTA nổi
              </a>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Nội dung topbar / trust bar</h3>
              <p className="mt-1 text-xs text-slate-500">Mỗi mục nên ngắn gọn, dễ hiểu, hiển thị tốt trên mobile.</p>
            </div>
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="mb-2 text-xs font-semibold text-zinc-600">Mục {index + 1}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs font-medium text-zinc-700">Tiêu đề</span>
                    <input {...form.register(`trustBarItems.${index}.title`)} placeholder="Ví dụ: Cam kết chính hãng" />
                  </label>
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-xs font-medium text-zinc-700">Mô tả</span>
                    <input {...form.register(`trustBarItems.${index}.description`)} placeholder="Ví dụ: Sản phẩm rõ nguồn gốc, bảo hành minh bạch" />
                  </label>
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Gợi ý nội dung chuẩn ecommerce</h3>
              <p className="mt-1 text-xs text-slate-500">
                Đây chỉ là gợi ý hiển thị, không ghi đè dữ liệu nếu bạn chưa bấm lưu.
              </p>
            </div>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">Cam kết chính hãng</li>
              <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">Giao nhanh toàn quốc</li>
              <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">Kiểm tra hàng trước khi nhận</li>
              <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">Đổi trả nếu lỗi theo chính sách</li>
            </ul>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Preview nhanh</h3>
              <p className="mt-1 text-xs text-slate-500">Xem trước dữ liệu trust bar đang nhập (dữ liệu thật từ form hiện tại).</p>
            </div>
            <div className="space-y-2">
              {form.watch("trustBarItems").map((item, index) => {
                const title = item.title?.trim() || `Mục ${index + 1}`;
                const description = item.description?.trim() || "Chưa có mô tả";
                return (
                  <div key={`${index}-${title}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-sm font-semibold text-slate-900">{title}</p>
                    <p className="mt-1 text-xs text-slate-600">{description}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
        {err ? <p className={ERROR_ALERT_CLASS}>{err}</p> : null}
        {ok ? <p className={SUCCESS_ALERT_CLASS}>{ok}</p> : null}
        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className={PRIMARY_BUTTON_CLASS}
        >
          {form.formState.isSubmitting ? "Đang lưu..." : "Lưu phần này"}
        </button>
      </form>
    </section>
  );
}

function CommerceCard({
  settings,
  onSaved,
}: {
  settings: WebsiteSettings;
  onSaved: () => Promise<void>;
}): JSX.Element {
  type FormValues = z.infer<typeof websiteSectionCommerceSchema>;
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const form = useForm<FormValues>({
    resolver: zodResolver(websiteSectionCommerceSchema),
    defaultValues: {
      section: "commerce",
      businessHours: settings.businessHours,
      mapUrl: settings.mapUrl,
      taxCode: settings.taxCode,
      defaultProductWarranty: settings.defaultProductWarranty,
    },
  });

  useEffect(() => {
    form.reset({
      section: "commerce",
      businessHours: settings.businessHours,
      mapUrl: settings.mapUrl,
      taxCode: settings.taxCode,
      defaultProductWarranty: settings.defaultProductWarranty,
    });
  }, [settings, form]);

  const onSubmit = async (values: FormValues) => {
    setErr("");
    setOk("");
    const result = await patchWebsiteSection(values);
    if (!result.ok) {
      setErr(result.message ?? "");
      return;
    }
    setOk("Đã lưu cài đặt.");
    await onSaved();
  };

  return (
    <section id="section-thuong-mai" className={SECTION_CLASS}>
      <div className={SECTION_HEADER_CLASS}>
        <h2 className={SECTION_TITLE_CLASS}>Sản phẩm / liên hệ / pháp lý</h2>
        <p className={SECTION_DESC_CLASS}>Cấu hình bảo hành mặc định cho sản phẩm, giờ làm việc, map và mã số thuế.</p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className={FORM_CLASS}>
        <input type="hidden" {...form.register("section")} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Bảo hành mặc định</h3>
              <p className="mt-1 text-xs text-slate-500">
                Tự điền khi tạo sản phẩm mới. Không ghi đè bảo hành riêng khi sửa sản phẩm.
              </p>
            </div>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">Bảo hành mặc định cho sản phẩm</span>
              <textarea
                {...form.register("defaultProductWarranty")}
                rows={5}
                placeholder="Ví dụ: Bảo hành 12 tháng, 1 đổi 1 trong 7 ngày nếu lỗi nhà sản xuất."
              />
              {form.formState.errors.defaultProductWarranty ? (
                <p className="text-xs text-rose-600">{form.formState.errors.defaultProductWarranty.message}</p>
              ) : null}
            </label>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Nhãn nút & hiển thị sản phẩm</h3>
              <p className="mt-1 text-xs text-slate-500">
                Các field nhãn nút (Thêm vào giỏ hàng / Mua ngay) hiện đang nằm ở tab giao diện nếu có.
              </p>
            </div>
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              TODO: Nếu bổ sung schema `addToCartLabel`, `buyNowLabel`, product card compact/display settings trong section commerce
              thì hiển thị ở card này.
            </p>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Thông tin thương mại / pháp lý</h3>
              <p className="mt-1 text-xs text-slate-500">Cấu hình giờ làm việc, mã số thuế và bản đồ liên hệ.</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Giờ làm việc</span>
                <textarea {...form.register("businessHours")} rows={3} placeholder="Ví dụ: Thứ 2 - Chủ nhật: 08:00 - 22:00" />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Mã số thuế</span>
                <input {...form.register("taxCode")} placeholder="Nhập mã số thuế doanh nghiệp" />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Map iframe hoặc link Google Maps</span>
                <textarea
                  {...form.register("mapUrl")}
                  rows={4}
                  placeholder="https://maps.google.com/... hoặc <iframe ...>"
                />
                <p className="text-xs text-slate-500">Dùng link công khai hoặc iframe hợp lệ để hiển thị vị trí trên storefront.</p>
              </label>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Cảnh báo tồn kho / vận hành</h3>
              <p className="mt-1 text-xs text-slate-500">Thiết lập ngưỡng vận hành sản phẩm nếu schema có hỗ trợ.</p>
            </div>
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              TODO: Chưa có field `stockThreshold` hoặc field vận hành riêng trong schema section commerce.
            </p>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Preview nhanh</h3>
              <p className="mt-1 text-xs text-slate-500">Xem trước dữ liệu hiện tại từ form trước khi lưu.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bảo hành mặc định</p>
                <p className="mt-1 text-sm text-slate-900">
                  {form.watch("defaultProductWarranty")?.trim() || "Chưa cấu hình"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Giờ làm việc</p>
                <p className="mt-1 text-sm text-slate-900">{form.watch("businessHours")?.trim() || "Chưa cấu hình"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mã số thuế</p>
                <p className="mt-1 text-sm text-slate-900">{form.watch("taxCode")?.trim() || "Chưa cấu hình"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bản đồ liên hệ</p>
                <p className="mt-1 text-sm text-slate-900">{form.watch("mapUrl")?.trim() || "Chưa cấu hình"}</p>
              </div>
            </div>
          </section>
        </div>
        {err ? <p className={ERROR_ALERT_CLASS}>{err}</p> : null}
        {ok ? <p className={SUCCESS_ALERT_CLASS}>{ok}</p> : null}
        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className={PRIMARY_BUTTON_CLASS}
        >
          {form.formState.isSubmitting ? "Đang lưu..." : "Lưu phần này"}
        </button>
      </form>
    </section>
  );
}

function CustomerAccountCard({
  settings,
  onSaved,
}: {
  settings: WebsiteSettings;
  onSaved: () => Promise<void>;
}): JSX.Element {
  type FormValues = z.infer<typeof websiteSectionCustomerAccountSchema>;
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const form = useForm<FormValues>({
    resolver: zodResolver(websiteSectionCustomerAccountSchema),
    defaultValues: {
      section: "customerAccount",
      ...settings.customerAccountSettings,
      bannerEnabled: settings.customerAccountSettings.banner.enabled,
      bannerTitle: settings.customerAccountSettings.banner.title,
      bannerSubtitle: settings.customerAccountSettings.banner.subtitle,
      bannerImageUrl: settings.customerAccountSettings.banner.imageUrl,
      bannerButtonText: settings.customerAccountSettings.banner.buttonText,
      bannerButtonUrl: settings.customerAccountSettings.banner.buttonUrl,
    },
  });

  useEffect(() => {
    form.reset({
      section: "customerAccount",
      ...settings.customerAccountSettings,
      bannerEnabled: settings.customerAccountSettings.banner.enabled,
      bannerTitle: settings.customerAccountSettings.banner.title,
      bannerSubtitle: settings.customerAccountSettings.banner.subtitle,
      bannerImageUrl: settings.customerAccountSettings.banner.imageUrl,
      bannerButtonText: settings.customerAccountSettings.banner.buttonText,
      bannerButtonUrl: settings.customerAccountSettings.banner.buttonUrl,
    });
  }, [settings, form]);

  const onSubmit = async (values: FormValues) => {
    setErr("");
    setOk("");
    const result = await patchWebsiteSection(values);
    if (!result.ok) {
      setErr(result.message ?? "");
      return;
    }
    setOk("Đã lưu cài đặt.");
    await onSaved();
  };

  return (
    <section id="section-tai-khoan" className={SECTION_CLASS}>
      <div className={SECTION_HEADER_CLASS}>
        <h2 className={SECTION_TITLE_CLASS}>Tài khoản khách hàng</h2>
        <p className={SECTION_DESC_CLASS}>Quản lý hiển thị, nội dung và CTA cho khu vực `/tai-khoan`.</p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className={FORM_CLASS}>
        <input type="hidden" {...form.register("section")} />
        <label className="hidden" aria-hidden>
          <input type="checkbox" {...form.register("showSupport")} />
        </label>
        <label className="hidden" aria-hidden>
          <input type="checkbox" {...form.register("affiliateShowSupport")} />
        </label>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Bật/tắt module</h3>
            <div className="grid grid-cols-1 gap-2">
              {[
                ["showOverview", "Tổng quan tài khoản"],
                ["showOrders", "Đơn hàng"],
                ["showOrderTimeline", "Timeline đơn hàng"],
                ["showProfile", "Hồ sơ cá nhân"],
                ["showAddresses", "Sổ địa chỉ"],
                ["showCoupons", "Mã giảm giá"],
                ["showNotifications", "Thông báo"],
                ["showWarranty", "Bảo hành"],
                ["showReturnRequest", "Yêu cầu đổi trả"],
                ["showWishlist", "Yêu thích"],
                ["showRecentlyViewed", "Đã xem gần đây"],
                ["showRecommendedProducts", "Gợi ý sản phẩm"],
                ["showAffiliate", "Cộng tác viên"],
                ["showSecurity", "Bảo mật"],
                ["showPurchaseHistory", "Lịch sử mua hàng"],
              ].map(([field, label]) => (
                <label key={field} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                  <input type="checkbox" {...form.register(field as keyof FormValues)} className="h-4 w-4 rounded border-zinc-300" />
                  {label}
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Nội dung hiển thị</h3>
            <div className="grid grid-cols-1 gap-3">
              <input {...form.register("accountTitle")} placeholder="Tiêu đề trang tài khoản" />
              <textarea {...form.register("accountSubtitle")} rows={2} placeholder="Mô tả ngắn khu vực tài khoản" />
              <input {...form.register("welcomeMessage")} placeholder="Thông điệp chào mừng" />
              <input {...form.register("emptyOrderText")} placeholder="Nội dung khi chưa có đơn" />
              <input {...form.register("shoppingCtaText")} placeholder="Nhãn nút mua sắm" />
              <input {...form.register("notificationTitle")} placeholder="Tiêu đề thông báo" />
              <input {...form.register("couponTitle")} placeholder="Tiêu đề coupon" />
              <input {...form.register("supportTitle")} placeholder="Tiêu đề hỗ trợ" />
              <input {...form.register("warrantyTitle")} placeholder="Tiêu đề bảo hành" />
              <input {...form.register("returnRequestTitle")} placeholder="Tiêu đề đổi trả" />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Lịch sử mua hàng (PROMAX)</h3>
            <p className="text-xs text-slate-500">
              Cấu hình nền cho danh sách đơn trên `/tai-khoan`. Giao diện chi tiết sẽ bổ sung ở phase sau.
            </p>
            <div className="grid grid-cols-1 gap-3">
              <input {...form.register("purchaseHistoryTitle")} placeholder="Tiêu đề vùng lịch sử" />
              <textarea {...form.register("emptyPurchaseHistoryText")} rows={2} placeholder="Nội dung khi không có đơn phù hợp bộ lọc" />
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-slate-700">Số đơn mỗi trang (5–100)</span>
                <input
                  type="number"
                  min={5}
                  max={100}
                  {...form.register("purchaseHistoryPageSize", { valueAsNumber: true })}
                />
              </label>
              <input {...form.register("orderDetailTitle")} placeholder="Tiêu đề chi tiết đơn" />
              <textarea {...form.register("orderSupportText")} rows={2} placeholder="Gợi ý liên hệ hỗ trợ đơn hàng" />
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-slate-700">Thời hạn hủy đơn (phút, 0 = không giới hạn)</span>
                <input
                  type="number"
                  min={0}
                  max={10080}
                  {...form.register("cancelOrderTimeLimitMinutes", { valueAsNumber: true })}
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                ["enableOrderDetail", "Chi tiết đơn"],
                ["enableCancelOrder", "Hủy đơn"],
                ["enableReorder", "Mua lại"],
                ["enableReviewAfterPurchase", "Đánh giá sau mua"],
                ["enableOrderSearch", "Tìm kiếm đơn"],
                ["enableOrderDateFilter", "Lọc theo ngày"],
                ["enableOrderStatusFilter", "Lọc theo trạng thái"],
              ].map(([field, label]) => (
                <label
                  key={field}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700"
                >
                  <input type="checkbox" {...form.register(field as keyof FormValues)} className="h-4 w-4 rounded border-zinc-300" />
                  {label}
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
            <h3 className="text-sm font-semibold text-slate-900">CTV / Affiliate — hành vi storefront</h3>
            <p className="text-xs text-slate-500">
              Điều khiển quyền mua và tab mặc định cho tài khoản CTV đang hoạt động (`/tai-khoan`, checkout). Khách không phải CTV không bị ảnh hưởng.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                <input type="checkbox" {...form.register("affiliateCanBuy")} className="h-4 w-4 rounded border-zinc-300" />
                Cho phép CTV đặt hàng (checkout)
              </label>
              {(
                [
                  ["affiliateShowPurchaseHistory", "CTV: Hiện tab lịch sử mua hàng"],
                  ["affiliateShowBuyerStats", "CTV: Hiện ô thống kê đơn (dashboard)"],
                  ["affiliateShowShoppingCta", "CTV: Hiện nút CTA “mua sắm / tiếp tục”"],
                  ["affiliateShowVoucher", "CTV: Hiện kho voucher & voucher tổng quan"],
                  ["affiliateShowAddressBook", "CTV: Hiện sổ địa chỉ"],
                  ["affiliateShowWithdrawals", "CTV: Hiện tab rút tiền (Affiliate)"],
                  ["affiliateShowGuide", "CTV: Hiện tab hướng dẫn (Affiliate)"],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                  <input type="checkbox" {...form.register(field)} className="h-4 w-4 rounded border-zinc-300" />
                  {label}
                </label>
              ))}
            </div>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Tab mặc định cho CTV đang đăng nhập</span>
              <select {...form.register("affiliateDefaultTab")} className="w-full max-w-md rounded-lg border border-slate-300 px-2 py-2 text-sm">
                <option value="affiliate">CTV / Affiliate</option>
                <option value="overview">Tổng quan</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Thông báo khi chặn checkout (CTV không được mua)</span>
              <textarea {...form.register("affiliateBlockCheckoutMessage")} rows={2} placeholder="Hiển thị khi CTV không có quyền đặt hàng." />
            </label>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Link / CTA</h3>
            <div className="grid grid-cols-1 gap-3">
              <input {...form.register("continueShoppingUrl")} placeholder="/cua-hang" />
              <input {...form.register("orderLookupUrl")} placeholder="/tra-cuu-don-hang" />
              <input {...form.register("supportPhone")} placeholder="1900 6868" />
              <input {...form.register("supportZaloUrl")} placeholder="https://zalo.me/..." />
              <input {...form.register("supportMessengerUrl")} placeholder="https://m.me/..." />
              <input {...form.register("returnPolicyUrl")} placeholder="/chinh-sach-doi-tra" />
              <input {...form.register("warrantyPolicyUrl")} placeholder="/chinh-sach-bao-hanh" />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Banner tài khoản</h3>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
              <input type="checkbox" {...form.register("bannerEnabled")} className="h-4 w-4 rounded border-zinc-300" />
              Bật banner
            </label>
            <input {...form.register("bannerTitle")} placeholder="Tiêu đề banner" />
            <textarea {...form.register("bannerSubtitle")} rows={2} placeholder="Mô tả banner" />
            <input {...form.register("bannerImageUrl")} placeholder="https://media.zendo.vn/.../banner.webp" />
            <input {...form.register("bannerButtonText")} placeholder="Nhãn nút banner" />
            <input {...form.register("bannerButtonUrl")} placeholder="/cua-hang hoặc https://..." />
          </section>
        </div>
        {err ? <p className={ERROR_ALERT_CLASS}>{err}</p> : null}
        {ok ? <p className={SUCCESS_ALERT_CLASS}>{ok}</p> : null}
        <button type="submit" disabled={form.formState.isSubmitting} className={PRIMARY_BUTTON_CLASS}>
          {form.formState.isSubmitting ? "Đang lưu..." : "Lưu phần này"}
        </button>
      </form>
    </section>
  );
}

function AnalyticsCard({
  settings,
  onSaved,
}: {
  settings: WebsiteSettings;
  onSaved: () => Promise<void>;
}): JSX.Element {
  type FormValues = z.infer<typeof websiteSectionAnalyticsSchema>;
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const form = useForm<FormValues>({
    resolver: zodResolver(websiteSectionAnalyticsSchema),
    defaultValues: {
      section: "analytics",
      trackingEnabled: settings.trackingEnabled,
      ga4ScriptEnabled: settings.ga4ScriptEnabled,
      metaPixelScriptEnabled: settings.metaPixelScriptEnabled,
      remarketingEventsEnabled: settings.remarketingEventsEnabled,
      popupEnabled: settings.popupEnabled,
      popupTitle: settings.popupTitle,
      popupContent: settings.popupContent,
      popupImageUrl: settings.popupImageUrl,
      popupLink: settings.popupLink,
      popupDelayMs: settings.popupDelayMs,
      popupFrequencyHours: settings.popupFrequencyHours,
      gtmContainerId: settings.gtmContainerId,
      ga4MeasurementId: settings.ga4MeasurementId,
      metaPixelId: settings.metaPixelId,
      clarityProjectId: settings.clarityProjectId,
      headScripts: settings.headScripts,
      bodyScripts: settings.bodyScripts,
    },
  });

  useEffect(() => {
    form.reset({
      section: "analytics",
      trackingEnabled: settings.trackingEnabled,
      ga4ScriptEnabled: settings.ga4ScriptEnabled,
      metaPixelScriptEnabled: settings.metaPixelScriptEnabled,
      remarketingEventsEnabled: settings.remarketingEventsEnabled,
      popupEnabled: settings.popupEnabled,
      popupTitle: settings.popupTitle,
      popupContent: settings.popupContent,
      popupImageUrl: settings.popupImageUrl,
      popupLink: settings.popupLink,
      popupDelayMs: settings.popupDelayMs,
      popupFrequencyHours: settings.popupFrequencyHours,
      gtmContainerId: settings.gtmContainerId,
      ga4MeasurementId: settings.ga4MeasurementId,
      metaPixelId: settings.metaPixelId,
      clarityProjectId: settings.clarityProjectId,
      headScripts: settings.headScripts,
      bodyScripts: settings.bodyScripts,
    });
  }, [settings, form]);

  const onSubmit = async (values: FormValues) => {
    setErr("");
    setOk("");
    const result = await patchWebsiteSection(values);
    if (!result.ok) {
      setErr(result.message ?? "");
      return;
    }
    setOk("Đã lưu cài đặt.");
    await onSaved();
  };

  return (
    <section id="section-analytics" className={SECTION_CLASS}>
      <div className={SECTION_HEADER_CLASS}>
        <h2 className={SECTION_TITLE_CLASS}>Tracking / Analytics / script</h2>
        <p className={SECTION_DESC_CLASS}>Bật/tắt tracking, remarketing và script phân tích toàn storefront.</p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className={FORM_CLASS}>
        <input type="hidden" {...form.register("section")} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Trạng thái Analytics</h3>
              <p className="mt-1 text-xs text-slate-500">
                Tắt tracking sẽ ngừng ghi dữ liệu truy cập mới. Dashboard vẫn đọc dữ liệu cũ.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${settings.analyticsEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                Analytics đang {settings.analyticsEnabled ? "bật" : "tắt"}
              </span>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${form.watch("trackingEnabled") ? "bg-sky-100 text-sky-700" : "bg-slate-200 text-slate-700"}`}>
                Tracking đang {form.watch("trackingEnabled") ? "bật" : "tắt"}
              </span>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                <input type="checkbox" {...form.register("trackingEnabled")} className="h-4 w-4 rounded border-zinc-300" />
                Bật tracking toàn site
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                <input type="checkbox" {...form.register("remarketingEventsEnabled")} className="h-4 w-4 rounded border-zinc-300" />
                Bật sự kiện remarketing
              </label>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Google / GA4 / GTM</h3>
              <p className="mt-1 text-xs text-slate-500">
                GA4 chỉ hoạt động khi Tracking đang bật và Measurement ID hợp lệ.
              </p>
            </div>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
              <input type="checkbox" {...form.register("ga4ScriptEnabled")} className="h-4 w-4 rounded border-zinc-300" />
              Bật script GA4
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">GA4 Measurement ID</span>
              <input {...form.register("ga4MeasurementId")} placeholder="G-XXXXXXXXXX" />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">Google Tag Manager Container ID</span>
              <input {...form.register("gtmContainerId")} placeholder="GTM-XXXXXXX" />
            </label>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Meta / TikTok / Zalo Pixel</h3>
              <p className="mt-1 text-xs text-slate-500">Chỉ bật pixel khi đã nhập đúng ID.</p>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700">
                <input type="checkbox" {...form.register("metaPixelScriptEnabled")} className="h-4 w-4 rounded border-zinc-300" />
                Bật Meta Pixel
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Meta Pixel ID</span>
                <input {...form.register("metaPixelId")} placeholder="Nhập Meta Pixel ID" />
              </label>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                <p className="font-medium text-slate-900">TikTok Pixel: {settings.tiktokPixelEnabled ? "Đang bật" : "Đang tắt"}</p>
                <p className="mt-1 text-xs text-slate-500">{settings.tiktokPixelId || "Chưa có TikTok Pixel ID"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                <p className="font-medium text-slate-900">Zalo Pixel: {settings.zaloPixelEnabled ? "Đang bật" : "Đang tắt"}</p>
                <p className="mt-1 text-xs text-slate-500">{settings.zaloPixelId || "Chưa có Zalo Pixel ID"}</p>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Clarity / script nâng cao</h3>
              <p className="mt-1 text-xs text-slate-500">Không nhập script lạ hoặc mã không rõ nguồn gốc.</p>
            </div>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">Microsoft Clarity Project ID</span>
              <input {...form.register("clarityProjectId")} placeholder="Nhập Clarity Project ID" />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">Script chèn vào &lt;head&gt;</span>
              <textarea {...form.register("headScripts")} rows={6} className="font-mono text-xs" />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">Script chèn trước &lt;/body&gt;</span>
              <textarea {...form.register("bodyScripts")} rows={6} className="font-mono text-xs" />
            </label>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Timezone & tiền tệ</h3>
              <p className="mt-1 text-xs text-slate-500">Analytics và doanh thu sẽ ưu tiên timezone/tiền tệ này.</p>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timezone</p>
                <p className="mt-1 font-medium text-slate-900">{settings.timezone || "Asia/Ho_Chi_Minh"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tiền tệ</p>
                <p className="mt-1 font-medium text-slate-900">{settings.currency || "VND"}</p>
              </div>
              <p className="text-xs text-slate-500">
                Trường timezone/currency hiện chưa nằm trong section analytics schema nên hiển thị dạng readonly.
              </p>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Popup / remarketing</h3>
              <p className="mt-1 text-xs text-slate-500">Cấu hình popup cho storefront và tham số hiển thị.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-zinc-700 md:col-span-2">
                <input type="checkbox" {...form.register("popupEnabled")} className="h-4 w-4 rounded border-zinc-300" />
                Bật popup trang chủ / storefront
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-zinc-700">Tiêu đề popup</span>
                <input {...form.register("popupTitle")} placeholder="Ví dụ: Ưu đãi dành cho bạn hôm nay" />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-zinc-700">Nội dung popup</span>
                <textarea {...form.register("popupContent")} rows={3} placeholder="Nội dung ngắn gọn, rõ CTA." />
              </label>
              <input type="hidden" {...form.register("popupImageUrl")} />
              <div className="space-y-1 md:col-span-2">
                <AdminImageUploadField
                  label="Ảnh popup"
                  value={form.watch("popupImageUrl")}
                  kind="banner"
                  onChange={(nextUrl) => form.setValue("popupImageUrl", nextUrl, { shouldDirty: true, shouldValidate: true })}
                  previewClassName="h-24 w-full max-w-sm"
                />
              </div>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-zinc-700">Link popup</span>
                <input {...form.register("popupLink")} placeholder="/cua-hang hoặc https://..." />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Delay hiển thị (ms)</span>
                <input type="number" min={0} max={30000} {...form.register("popupDelayMs", { valueAsNumber: true })} />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">Tần suất lặp (giờ)</span>
                <input type="number" min={1} max={168} {...form.register("popupFrequencyHours", { valueAsNumber: true })} />
              </label>
            </div>
          </section>
        </div>
        {err ? <p className={ERROR_ALERT_CLASS}>{err}</p> : null}
        {ok ? <p className={SUCCESS_ALERT_CLASS}>{ok}</p> : null}
        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className={PRIMARY_BUTTON_CLASS}
        >
          {form.formState.isSubmitting ? "Đang lưu..." : "Lưu phần này"}
        </button>
      </form>
    </section>
  );
}
