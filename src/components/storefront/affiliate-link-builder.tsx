"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { resolveAffiliatePublicOrigin } from "../../lib/affiliate-public-origin";

type LinkType = "home" | "product" | "category" | "custom";

type HistoryItem = {
  type: LinkType;
  url: string;
  createdAt: number;
};

type ProductOption = {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl: string;
};

const STORAGE_KEY = "zendo_affiliate_recent_links_v1";

function sanitizeInternalPath(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return null;
  if (text.startsWith("/")) return text;
  try {
    const parsed = new URL(text);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    if (!parsed.hostname.endsWith("zendo.vn")) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function sanitizeSlug(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, "");
}

export default function AffiliateLinkBuilder({
  refCode,
}: {
  refCode: string;
}): JSX.Element {
  const [linkType, setLinkType] = useState<LinkType>("home");
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<ProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const [categorySlug, setCategorySlug] = useState("");
  const [customPath, setCustomPath] = useState("");
  const [campaign, setCampaign] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const baseOrigin = useMemo(() => resolveAffiliatePublicOrigin(), []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as HistoryItem[];
      if (Array.isArray(parsed)) {
        setHistory(parsed.slice(0, 20));
      }
    } catch {
      // ignore localStorage failures
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 20)));
    } catch {
      // ignore localStorage failures
    }
  }, [history]);

  useEffect(() => {
    if (linkType !== "product") return;
    const q = productQuery.trim();
    if (q.length < 2) {
      setProductResults([]);
      setProductLoading(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setProductLoading(true);
      fetch(`/api/storefront/products/search?q=${encodeURIComponent(q)}`)
        .then(async (res) => {
          if (!res.ok) return { items: [] as ProductOption[] };
          return (await res.json()) as { items?: ProductOption[] };
        })
        .then((payload) => {
          const items = Array.isArray(payload.items) ? payload.items : [];
          setProductResults(items.slice(0, 12));
        })
        .catch(() => {
          setProductResults([]);
        })
        .finally(() => {
          setProductLoading(false);
        });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [linkType, productQuery]);

  const buildLink = () => {
    setError("");
    const params = new URLSearchParams();
    params.set("ref", refCode);
    const safeCampaign = campaign.trim();
    if (safeCampaign) {
      params.set("utm_source", "affiliate");
      params.set("utm_medium", "ctv");
      params.set("utm_campaign", safeCampaign);
    }

    let path = "/";
    if (linkType === "product") {
      const slug = sanitizeSlug(selectedProduct?.slug || "");
      if (!slug) {
        setError("Vui lòng chọn sản phẩm hợp lệ.");
        return;
      }
      path = `/san-pham/${slug}`;
    } else if (linkType === "category") {
      const slug = sanitizeSlug(categorySlug);
      if (!slug) {
        setError("Vui lòng nhập slug danh mục.");
        return;
      }
      path = `/danh-muc/${slug}`;
    } else if (linkType === "custom") {
      const safePath = sanitizeInternalPath(customPath);
      if (!safePath) {
        setError("Link tùy chỉnh không hợp lệ. Chỉ chấp nhận path nội bộ hoặc URL zendo.vn.");
        return;
      }
      path = safePath;
    }

    const hasQuery = path.includes("?");
    const nextUrl = `${baseOrigin}${path}${hasQuery ? "&" : "?"}${params.toString()}`;
    setOutputUrl(nextUrl);
    setHistory((prev) => [{ type: linkType, url: nextUrl, createdAt: Date.now() }, ...prev.filter((item) => item.url !== nextUrl)].slice(0, 20));
  };

  const copyLink = (url: string) => {
    setCopyError("");
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }).catch(() => {
      setCopyError("Không thể sao chép, vui lòng copy thủ công.");
    });
  };

  return (
    <section className="mt-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 sm:p-4">
      <h4 className="text-sm font-semibold text-[#0F172A]">Bộ tạo link giới thiệu</h4>
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs text-[#64748B]">Loại link</span>
          <select
            value={linkType}
            onChange={(event) => setLinkType(event.target.value as LinkType)}
            className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
          >
            <option value="home">Trang chủ</option>
            <option value="product">Sản phẩm</option>
            <option value="category">Danh mục</option>
            <option value="custom">Link tùy chỉnh</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-[#64748B]">UTM Campaign (tùy chọn)</span>
          <input
            value={campaign}
            onChange={(event) => setCampaign(event.target.value)}
            placeholder="vd: sale-thang-5"
            className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
          />
        </label>
        {linkType === "product" ? (
          <label className="space-y-1 lg:col-span-2">
            <span className="text-xs text-[#64748B]">Tìm sản phẩm</span>
            <input
              value={productQuery}
              onChange={(event) => {
                setProductQuery(event.target.value);
                setSelectedProduct(null);
              }}
              placeholder="Tìm sản phẩm để tạo link giới thiệu..."
              className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
            />
            {selectedProduct ? (
              <div className="mt-2 flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#EFF6FF] px-3 py-2">
                <p className="min-w-0 truncate text-xs font-semibold text-[#0F172A]">
                  Đã chọn: {selectedProduct.name} ({selectedProduct.slug})
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="ml-2 rounded-md border border-[#E2E8F0] bg-white px-2 py-1 text-[11px] font-medium text-[#0F172A]"
                >
                  Xóa
                </button>
              </div>
            ) : null}
            {selectedProduct && linkType === "product" ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    const slug = sanitizeSlug(selectedProduct.slug || "");
                    if (!slug) {
                      setError("Vui lòng chọn sản phẩm hợp lệ.");
                      return;
                    }
                    const params = new URLSearchParams();
                    params.set("ref", refCode);
                    const safeCampaign = campaign.trim();
                    if (safeCampaign) {
                      params.set("utm_source", "affiliate");
                      params.set("utm_medium", "ctv");
                      params.set("utm_campaign", safeCampaign);
                    }
                    const path = `/san-pham/${slug}`;
                    const built = `${baseOrigin}${path}?${params.toString()}`;
                    setOutputUrl(built);
                    setHistory((prev) =>
                      [{ type: "product" as const, url: built, createdAt: Date.now() }, ...prev.filter((item) => item.url !== built)].slice(0, 20),
                    );
                    copyLink(built);
                  }}
                  className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg bg-[#0F172A] px-3 py-2 text-xs font-semibold text-white sm:flex-none"
                >
                  Sao chép link sản phẩm
                </button>
              </div>
            ) : null}
            <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-[#E2E8F0] bg-white">
              {productLoading ? (
                <p className="px-3 py-2 text-xs text-[#64748B]">Đang tìm sản phẩm...</p>
              ) : productQuery.trim().length >= 2 ? (
                productResults.length ? (
                  <div className="divide-y divide-[#E2E8F0]">
                    {productResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedProduct(item);
                          setProductQuery(item.name);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#F8FAFC]"
                      >
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-md border border-[#E2E8F0] object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-md border border-[#E2E8F0] bg-[#F8FAFC]" />
                        )}
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-xs font-semibold text-[#0F172A]">{item.name}</p>
                          <p className="line-clamp-1 text-[11px] text-[#64748B]">
                            {new Intl.NumberFormat("vi-VN").format(item.price || 0)}đ • {item.slug}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="px-3 py-2 text-xs text-[#64748B]">Không tìm thấy sản phẩm phù hợp.</p>
                )
              ) : (
                <p className="px-3 py-2 text-xs text-[#64748B]">Nhập ít nhất 2 ký tự để tìm sản phẩm.</p>
              )}
            </div>
          </label>
        ) : null}
        {linkType === "category" ? (
          <label className="space-y-1 lg:col-span-2">
            <span className="text-xs text-[#64748B]">Slug danh mục</span>
            <input
              value={categorySlug}
              onChange={(event) => setCategorySlug(event.target.value)}
              placeholder="dien-tu"
              className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
            />
          </label>
        ) : null}
        {linkType === "custom" ? (
          <label className="space-y-1 lg:col-span-2">
            <span className="text-xs text-[#64748B]">Path / URL tùy chỉnh</span>
            <input
              value={customPath}
              onChange={(event) => setCustomPath(event.target.value)}
              placeholder="/khuyen-mai hoặc https://www.zendo.vn/khuyen-mai"
              className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
            />
          </label>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={buildLink}
          className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
        >
          Tạo link
        </button>
        <button
          type="button"
          onClick={() => copyLink(outputUrl)}
          disabled={!outputUrl}
          className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A] disabled:opacity-50"
        >
          Sao chép link
        </button>
        <LinkButton href={outputUrl}>Mở link</LinkButton>
      </div>
      <div className="mt-3">
        <label className="space-y-1">
          <span className="text-xs text-[#64748B]">Link đầu ra</span>
          <input
            readOnly
            value={outputUrl}
            className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs text-[#0F172A] outline-none"
          />
        </label>
      </div>
      {copied ? <p className="mt-2 text-xs font-medium text-emerald-700">Đã sao chép</p> : null}
      {copyError ? <p className="mt-2 text-xs font-medium text-rose-700">{copyError}</p> : null}
      {error ? <p className="mt-2 text-xs font-medium text-rose-700">{error}</p> : null}
      <div className="mt-4">
        <p className="text-xs font-semibold text-[#0F172A]">Lịch sử link gần đây</p>
        {history.length ? (
          <div className="mt-2 space-y-2">
            {history.map((item, index) => (
              <div key={`${item.url}-${item.createdAt}-${index}`} className="rounded-lg border border-[#E2E8F0] bg-white p-2.5">
                <p className="text-xs text-[#64748B]">
                  {item.type === "home"
                    ? "Trang chủ"
                    : item.type === "product"
                      ? "Sản phẩm"
                      : item.type === "category"
                        ? "Danh mục"
                        : "Tùy chỉnh"}{" "}
                  • {new Date(item.createdAt).toLocaleString("vi-VN")}
                </p>
                <p className="mt-1 break-all text-xs text-[#0F172A]">{item.url}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copyLink(item.url)}
                    className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs text-[#0F172A]"
                  >
                    Sao chép link
                  </button>
                  <LinkButton href={item.url}>Mở link</LinkButton>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-[#64748B]">Chưa có link nào được tạo gần đây.</p>
        )}
      </div>
    </section>
  );
}

function LinkButton({
  href,
  children,
}: {
  href: string;
  children: string;
}): JSX.Element {
  if (!href) {
    return (
      <button
        type="button"
        disabled
        className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A] opacity-50"
      >
        {children}
      </button>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A]"
    >
      {children}
    </a>
  );
}
