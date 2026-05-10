"use client";

import { useMemo, useState } from "react";
import type { ThemeSettings, HomeHeroBannerItem, HomePromoCardItem } from "../../lib/settings";
import type { ThemeSettingsFormValues } from "../../lib/admin-settings";
import { themeSettingsToFormValues } from "../../lib/admin-theme-form-values";
import AdminImageUploadField from "./admin-image-upload-field";
import { adminPrimaryButton } from "../../lib/admin-ui";

type BannerEditorStatus = "idle" | "saving";

type MainBannerDraft = HomeHeroBannerItem;

type PromoCardDraft = HomePromoCardItem;

const MAIN_MAX = 4;
const RIGHT_MAX = 4;
const BOTTOM_MAX = 5;
const BOTTOM_DEFAULT_LINKS = [
  "/danh-muc/dien-tu",
  "/danh-muc/phu-kien",
  "/danh-muc/dien-tu-gia-dung",
  "/danh-muc/nha-cua-doi-song",
  "/cua-hang",
] as const;
const LEGACY_BOTTOM_LINKS = new Set([
  "/danh-muc/gia-dung",
  "/danh-muc/nha-cuaoi-song",
]);

const MAIN_BANNER_OBJECT_POSITIONS: Array<{ value: string; label: string }> = [
  { value: "center center", label: "Giữa" },
  { value: "left center", label: "Trái giữa" },
  { value: "right center", label: "Phải giữa" },
  { value: "center top", label: "Trên giữa" },
  { value: "center bottom", label: "Dưới giữa" },
];

const MAIN_BANNER_POS_SET = new Set(MAIN_BANNER_OBJECT_POSITIONS.map((p) => p.value));

function sanitizeMainBannerObjectPosition(value: string | undefined): string {
  const v = (value || "center center").toLowerCase().trim();
  return MAIN_BANNER_POS_SET.has(v) ? v : "center center";
}

function getBottomDefaultLinkBySortOrder(sortOrder: number): string {
  return BOTTOM_DEFAULT_LINKS[sortOrder - 1] ?? "/cua-hang";
}

function normalizeBottomDraftLink(link: string, sortOrder: number): string {
  const trimmed = link.trim();
  if (!trimmed) return getBottomDefaultLinkBySortOrder(sortOrder);
  if (LEGACY_BOTTOM_LINKS.has(trimmed)) return getBottomDefaultLinkBySortOrder(sortOrder);
  return trimmed;
}

function emptyMainBannerDraft(sortOrder: number): MainBannerDraft {
  return {
    imageUrl: "",
    mobileImageUrl: "",
    link: "",
    title: "",
    subtitle: "",
    ctaLabel: "",
    ctaHref: "",
    enabled: false,
    sortOrder,
    altText: "",
    imageFit: "contain",
    objectPosition: "center center",
    mobileImageFit: "contain",
    mobileObjectPosition: "center center",
  };
}

function emptyPromoCardDraft(sortOrder: number): PromoCardDraft {
  const defaultLink = getBottomDefaultLinkBySortOrder(sortOrder);
  return {
    imageUrl: "",
    link: defaultLink,
    title: "",
    description: "",
    altText: "",
    objectPosition: "center center",
    imageFit: "contain",
    enabled: false,
    sortOrder,
  };
}

export default function AdminHomeBannersEditor({
  themeSettings,
}: {
  themeSettings: ThemeSettings;
}): JSX.Element {
  const [values, setValues] = useState<ThemeSettingsFormValues>(() => themeSettingsToFormValues(themeSettings));
  const [status, setStatus] = useState<BannerEditorStatus>("idle");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [mainDrafts, setMainDrafts] = useState<MainBannerDraft[]>(() => {
    const items = (themeSettings.homeBanners ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .slice(0, MAIN_MAX);
    return Array.from({ length: MAIN_MAX }, (_, i) => {
      const raw = items[i];
      if (!raw) return emptyMainBannerDraft(i + 1);
      return {
        ...raw,
        imageFit: raw.imageFit === "cover" ? "cover" : "contain",
        objectPosition: sanitizeMainBannerObjectPosition(raw.objectPosition),
        mobileImageFit: raw.mobileImageFit === "cover" ? "cover" : "contain",
        mobileObjectPosition: sanitizeMainBannerObjectPosition(raw.mobileObjectPosition),
      };
    });
  });

  const [rightDrafts, setRightDrafts] = useState<PromoCardDraft[]>(() => {
    const items = (themeSettings.homeRightPromoCards ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .slice(0, RIGHT_MAX);
    return Array.from({ length: RIGHT_MAX }, (_, i) => items[i] ?? emptyPromoCardDraft(i + 1));
  });

  const [bottomDrafts, setBottomDrafts] = useState<PromoCardDraft[]>(() => {
    const items = (themeSettings.homeBottomPromoCards ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .slice(0, BOTTOM_MAX);
    return Array.from({ length: BOTTOM_MAX }, (_, i) => {
      const slot = items[i];
      if (!slot) return emptyPromoCardDraft(i + 1);
      return {
        ...slot,
        imageFit: slot.imageFit === "cover" ? "cover" : "contain",
        link: normalizeBottomDraftLink(slot.link || "", slot.sortOrder || i + 1),
      };
    });
  });

  const saveAll = async () => {
    setError("");
    setSuccess("");
    setStatus("saving");

    try {
      const payload: ThemeSettingsFormValues = {
        ...values,
        homeBannersJson: JSON.stringify(mainDrafts, null, 2),
        homeRightPromoCardsJson: JSON.stringify(rightDrafts, null, 2),
        homeBottomPromoCardsJson: JSON.stringify(bottomDrafts, null, 2),
      };

      const response = await fetch("/api/admin/settings/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? "Không thể lưu banner.");
        setStatus("idle");
        return;
      }

      setSuccess("Đã lưu cấu hình banner trang chủ.");
      setStatus("idle");
      setValues(payload);
    } catch {
      setError("Có lỗi xảy ra khi lưu banner.");
      setStatus("idle");
    }
  };

  const hasMain = useMemo(() => mainDrafts.some((d) => d.enabled && Boolean(d.imageUrl)), [mainDrafts]);

  return (
    <section className="space-y-5">
      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          {success}
        </p>
      ) : null}

      {/* A. Main banner */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[#0F172A]">Banner chính homepage</h2>
          <p className="text-sm text-[#64748B]">
            Tối đa {MAIN_MAX} ảnh; desktop carousel, mobile cùng khung 1644×658. Khung chuẩn 2.498:1 — nếu ảnh khác tỷ lệ: chọn{" "}
            <strong>Phủ kín khung</strong> (cover) để không hở viền (có thể cắt mép, cần safe-zone trong ảnh), hoặc{" "}
            <strong>Hiển thị đủ ảnh</strong> (contain) để không cắt nội dung (sẽ có hở viền trong khung — đó là hành vi đúng, không phải lỗi crop).
          </p>
        </div>

        <div className="space-y-4">
          {mainDrafts.map((slot, index) => (
            <div key={`main-${index}`} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700">
                  <input
                    type="checkbox"
                    checked={slot.enabled}
                    onChange={(e) =>
                      setMainDrafts((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, enabled: e.target.checked } : item)),
                      )
                    }
                  />
                  Đang bật
                </label>

                <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700">
                  <span>Thứ tự</span>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    className="h-9 w-24 rounded-md border border-zinc-300 px-2 text-sm outline-none focus:border-zinc-500"
                    value={slot.sortOrder}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setMainDrafts((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, sortOrder: Number.isFinite(next) ? next : item.sortOrder } : item)),
                      );
                    }}
                  />
                </label>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AdminImageUploadField
                  label={`Ảnh desktop ${index + 1} (1644×658)`}
                  value={slot.imageUrl}
                  kind="banner"
                  previewClassName="aspect-[1644/658] w-full"
                  previewFrameClassName={`rounded-3xl ${slot.imageFit === "contain" ? "bg-white" : ""}`}
                  previewImageClassName="absolute inset-0 h-full w-full"
                  previewImageStyle={{
                    objectFit: slot.imageFit === "cover" ? "cover" : "contain",
                    objectPosition: sanitizeMainBannerObjectPosition(slot.objectPosition),
                  }}
                  previewSizes="(max-width: 768px) 100vw, 720px"
                  quality={90}
                  hint="Khuyến nghị 1644×658 px (2.498:1). Cover = phủ kín khung; contain = đủ ảnh, có thể hở viền nếu ảnh lệch tỷ lệ."
                  onChange={(nextUrl) =>
                    setMainDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, imageUrl: nextUrl } : item)))
                  }
                />
                <AdminImageUploadField
                  label={`Ảnh mobile ${index + 1} (tùy chọn)`}
                  value={slot.mobileImageUrl}
                  kind="banner"
                  previewClassName="aspect-[1644/658] w-full"
                  previewFrameClassName={`rounded-3xl ${slot.mobileImageFit === "contain" ? "bg-white" : ""}`}
                  previewImageClassName="absolute inset-0 h-full w-full"
                  previewImageStyle={{
                    objectFit: slot.mobileImageFit === "cover" ? "cover" : "contain",
                    objectPosition: sanitizeMainBannerObjectPosition(slot.mobileObjectPosition),
                  }}
                  previewSizes="(max-width: 768px) 100vw, 720px"
                  quality={90}
                  hint="Trống = dùng ảnh desktop. Cùng khung 1644×658 như storefront; chọn cover/contain bên dưới giống bản mobile thật."
                  onChange={(nextUrl) =>
                    setMainDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, mobileImageUrl: nextUrl } : item)))
                  }
                />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-zinc-700">Desktop — chế độ hiển thị</span>
                  <select
                    className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500"
                    value={slot.imageFit === "cover" ? "cover" : "contain"}
                    onChange={(e) => {
                      const v = e.target.value === "cover" ? "cover" : "contain";
                      setMainDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, imageFit: v } : item)));
                    }}
                  >
                    <option value="contain">Hiển thị đủ ảnh — không cắt, có thể hở viền (contain)</option>
                    <option value="cover">Phủ kín khung — không hở viền, có thể cắt mép (cover)</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-zinc-700">Desktop — trọng tâm ảnh</span>
                  <select
                    className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500"
                    value={sanitizeMainBannerObjectPosition(slot.objectPosition)}
                    onChange={(e) => {
                      const v = sanitizeMainBannerObjectPosition(e.target.value);
                      setMainDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, objectPosition: v } : item)));
                    }}
                  >
                    {MAIN_BANNER_OBJECT_POSITIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-zinc-700">Mobile — chế độ hiển thị</span>
                  <select
                    className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500"
                    value={slot.mobileImageFit === "cover" ? "cover" : "contain"}
                    onChange={(e) => {
                      const v = e.target.value === "cover" ? "cover" : "contain";
                      setMainDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, mobileImageFit: v } : item)));
                    }}
                  >
                    <option value="contain">Hiển thị đủ ảnh — không cắt, có thể hở viền (contain)</option>
                    <option value="cover">Phủ kín khung — không hở viền, có thể cắt mép (cover)</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-zinc-700">Mobile — trọng tâm ảnh</span>
                  <select
                    className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500"
                    value={sanitizeMainBannerObjectPosition(slot.mobileObjectPosition)}
                    onChange={(e) => {
                      const v = sanitizeMainBannerObjectPosition(e.target.value);
                      setMainDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, mobileObjectPosition: v } : item)));
                    }}
                  >
                    {MAIN_BANNER_OBJECT_POSITIONS.map((p) => (
                      <option key={`m-${p.value}`} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-zinc-700">Alt SEO (ảnh banner)</span>
                  <input
                    value={slot.altText ?? ""}
                    onChange={(e) => {
                      const next = e.target.value;
                      setMainDrafts((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, altText: next, title: next || item.title } : item,
                        ),
                      );
                    }}
                    className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
                    placeholder="Ví dụ: Flash Sale"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-zinc-700">Link khi click</span>
                  <input
                    value={slot.link}
                    onChange={(e) => {
                      const next = e.target.value;
                      setMainDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, link: next } : item)));
                    }}
                    className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
                    placeholder="/flash-sale hoặc https://..."
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* B. Right desktop cards — cùng dữ liệu homeRightPromoCards */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[#0F172A]">Banner phải 1–4 (hero desktop)</h2>
          <p className="text-sm text-[#64748B]">
            Chỉ desktop. Khi có ảnh, ảnh phủ full khung bằng <code className="rounded bg-slate-100 px-1">object-cover</code>,{" "}
            <code className="rounded bg-slate-100 px-1">object-position: center</code>. Khi chưa có ảnh, hiển thị icon + chữ như mặc định.
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-medium leading-relaxed text-amber-950">
          Kích thước khuyến nghị: 1280 × 280 px. Tỷ lệ 4.57:1. Khung hiển thị desktop khoảng 320 × 70 px. Có ảnh thì storefront chỉ hiển thị ảnh full khung, không hiện chữ/icon đè lên. Hãy thiết kế sẵn chữ trong ảnh.
        </div>

        <div className="space-y-4">
          {rightDrafts.map((slot, index) => (
            <div key={`right-${index}`} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700">
                  <input
                    type="checkbox"
                    checked={slot.enabled}
                    onChange={(e) =>
                      setRightDrafts((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, enabled: e.target.checked } : item)),
                      )
                    }
                  />
                  Đang bật
                </label>

                <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700">
                  <span>Thứ tự</span>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    className="h-9 w-24 rounded-md border border-zinc-300 px-2 text-sm outline-none focus:border-zinc-500"
                    value={slot.sortOrder}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setRightDrafts((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, sortOrder: Number.isFinite(next) ? next : item.sortOrder } : item,
                        ),
                      );
                    }}
                  />
                </label>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AdminImageUploadField
                  label={`Banner phải ${index + 1}`}
                  value={slot.imageUrl}
                  kind="banner"
                  hint="Nên dùng ảnh 1280 × 280 px, tỷ lệ 4.57:1, nội dung chính đặt giữa ảnh."
                  previewClassName="aspect-[1280/280] w-full"
                  previewFrameClassName="rounded-xl"
                  previewImageClassName="object-cover object-center"
                  previewSizes="(max-width: 768px) 100vw, 640px"
                  quality={90}
                  onChange={(nextUrl) =>
                    setRightDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, imageUrl: nextUrl } : item)))
                  }
                />

                <label className="space-y-1">
                  <span className="text-sm font-medium text-zinc-700">Link khi click</span>
                  <input
                    value={slot.link}
                    onChange={(e) => {
                      const next = e.target.value;
                      setRightDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, link: next } : item)));
                    }}
                    className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
                    placeholder="/voucher hoặc https://..."
                  />
                </label>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-zinc-700">Title</span>
                  <input
                    value={slot.title}
                    onChange={(e) => {
                      const next = e.target.value;
                      setRightDrafts((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, title: next } : item)),
                      );
                    }}
                    className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
                    placeholder="Ví dụ: Thu thập voucher"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-zinc-700">Alt SEO (ảnh card)</span>
                  <input
                    value={slot.altText ?? ""}
                    onChange={(e) => {
                      const next = e.target.value;
                      setRightDrafts((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, altText: next } : item)),
                      );
                    }}
                    className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
                    placeholder="Nếu trống sẽ fallback về title"
                  />
                </label>
              </div>

              <label className="mt-3 space-y-1">
                <span className="text-sm font-medium text-zinc-700">Mô tả</span>
                <textarea
                  value={slot.description}
                  onChange={(e) => {
                    const next = e.target.value;
                    setRightDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, description: next } : item)));
                  }}
                  rows={3}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                  placeholder="Ví dụ: Nhận ưu đãi mỗi tuần"
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* C. Bottom desktop cards — cùng dữ liệu homeBottomPromoCards */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[#0F172A]">Banner nhỏ dưới hero (5 ảnh)</h2>
          <p className="text-sm text-[#64748B]">
            Khi có ảnh, storefront chỉ hiển thị ảnh trong khung theo chế độ fit bạn chọn; chưa có ảnh thì giữ khung trống sạch.
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-medium leading-relaxed text-amber-950">
          Khung hiển thị desktop thực tế khoảng 245 × 104 px mỗi ô. Tỷ lệ chuẩn khoảng 2.356:1. Kích thước ảnh khuyến nghị: 1470 × 624 px. Với ảnh có sẵn chữ bên trong, nên dùng chế độ “Hiển thị đủ ảnh (không crop)”. Nếu ảnh là banner hoàn chỉnh có chữ và bố cục sẵn, ưu tiên chế độ không crop để tránh mất nội dung. Chừa mép an toàn tối thiểu: trái/phải 90px, trên/dưới 45px.
        </div>

        <div className="space-y-4">
          {bottomDrafts.map((slot, index) => (
            <div key={`bottom-${index}`} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700">
                  <input
                    type="checkbox"
                    checked={slot.enabled}
                    onChange={(e) =>
                      setBottomDrafts((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, enabled: e.target.checked } : item)),
                      )
                    }
                  />
                  Đang bật
                </label>

                <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700">
                  <span>Thứ tự</span>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    className="h-9 w-24 rounded-md border border-zinc-300 px-2 text-sm outline-none focus:border-zinc-500"
                    value={slot.sortOrder}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setBottomDrafts((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, sortOrder: Number.isFinite(next) ? next : item.sortOrder } : item,
                        ),
                      );
                    }}
                  />
                </label>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AdminImageUploadField
                  label={`Banner nhỏ ${index + 1}`}
                  value={slot.imageUrl}
                  kind="banner"
                  hint="Nên dùng ảnh 1470 × 624 px (xấp xỉ 2.356:1), ưu tiên nội dung chính nằm giữa ảnh, tránh sát mép."
                  previewClassName="aspect-[1470/624] w-full"
                  previewImageClassName={`${(slot.imageFit || "contain") === "cover" ? "object-cover" : "object-contain"} object-center`}
                  previewSizes="(max-width: 768px) 100vw, 624px"
                  previewOverlay={
                    <div className="relative h-full w-full">
                      <div className="absolute inset-[7.2%_6.2%] rounded-md border border-white/80 bg-black/5" />
                    </div>
                  }
                  onChange={(nextUrl) =>
                    setBottomDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, imageUrl: nextUrl } : item)))
                  }
                />

                <label className="space-y-1">
                  <span className="text-sm font-medium text-zinc-700">Link khi click</span>
                  <input
                    value={slot.link}
                    onChange={(e) => {
                      const next = e.target.value;
                      setBottomDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, link: next } : item)));
                    }}
                    className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
                    placeholder="VD: /danh-muc/dien-tu hoặc /cua-hang"
                  />
                </label>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-zinc-700">Title</span>
                  <input
                    value={slot.title}
                    onChange={(e) => {
                      const next = e.target.value;
                      setBottomDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, title: next } : item)));
                    }}
                    className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
                    placeholder="Ví dụ: Flash Sale"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-zinc-700">Alt SEO</span>
                  <input
                    value={slot.altText ?? ""}
                    onChange={(e) => {
                      const next = e.target.value;
                      setBottomDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, altText: next } : item)));
                    }}
                    className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
                    placeholder="Nếu trống sẽ fallback về title"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-zinc-700">Trọng tâm ảnh</span>
                  <select
                    value={(slot.objectPosition || "center center").toLowerCase()}
                    onChange={(e) => {
                      const next = e.target.value;
                      setBottomDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, objectPosition: next } : item)));
                    }}
                    className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
                  >
                    <option value="center center">Giữa ảnh (center center)</option>
                    <option value="left center">Lệch trái (left center)</option>
                    <option value="right center">Lệch phải (right center)</option>
                    <option value="center top">Lệch trên (center top)</option>
                    <option value="center bottom">Lệch dưới (center bottom)</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-zinc-700">Chế độ hiển thị ảnh</span>
                  <select
                    value={(slot.imageFit || "contain").toLowerCase() === "cover" ? "cover" : "contain"}
                    onChange={(e) => {
                      const next = e.target.value === "cover" ? "cover" : "contain";
                      setBottomDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, imageFit: next } : item)));
                    }}
                    className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
                  >
                    <option value="contain">Hiển thị đủ ảnh (không crop)</option>
                    <option value="cover">Phủ đầy khung (có thể crop)</option>
                  </select>
                </label>
              </div>

              <label className="mt-3 space-y-1">
                <span className="text-sm font-medium text-zinc-700">Mô tả</span>
                <textarea
                  value={slot.description}
                  onChange={(e) => {
                    const next = e.target.value;
                    setBottomDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, description: next } : item)));
                  }}
                  rows={3}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                  placeholder="Ví dụ: Deal hot hôm nay"
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          {hasMain ? "Đã có banner chính được bật." : "Bạn đang tắt toàn bộ banner chính. Lưu ý storefront sẽ dùng banner fallback."}
        </p>
        <button
          type="button"
          onClick={saveAll}
          disabled={status === "saving"}
          className={adminPrimaryButton}
        >
          {status === "saving" ? "Đang lưu..." : "Lưu"}
        </button>
      </div>
    </section>
  );
}

