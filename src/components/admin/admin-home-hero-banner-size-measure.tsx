"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HOME_HERO_LAYOUT_CONFIG, HOME_HERO_BANNER_SPECS } from "../../lib/home-hero-banner-specs";

type MeasureKey = "main" | "right-1" | "right-2" | "right-3" | "right-4";

type MeasuredSize = {
  width: number;
  height: number;
};

const MEASURE_ITEMS: Array<{
  key: MeasureKey;
  label: string;
  uploadSize: string;
  note: string;
}> = [
  {
    key: "main",
    label: "Banner Chính",
    uploadSize: HOME_HERO_BANNER_SPECS.main.uploadSize,
    note: HOME_HERO_BANNER_SPECS.main.note,
  },
  ...[1, 2, 3, 4].map((index) => ({
    key: `right-${index}` as MeasureKey,
    label: `Banner Phải ${index}`,
    uploadSize: HOME_HERO_BANNER_SPECS.rightPromo.uploadSize,
    note: "Khuyến nghị upload ảnh đúng kích thước để hiển thị sắc nét nhất.",
  })),
];

function formatSize(size: MeasuredSize | undefined): string {
  if (!size) return "Đang đo...";
  return `${size.width} x ${size.height}px`;
}

function formatAspectRatio(size: MeasuredSize | undefined): string {
  if (!size || size.height <= 0) return "Đang đo...";
  return `${(size.width / size.height).toFixed(3)}:1`;
}

export default function AdminHomeHeroBannerSizeMeasure(): JSX.Element {
  const refs = useRef<Record<MeasureKey, HTMLDivElement | null>>({
    main: null,
    "right-1": null,
    "right-2": null,
    "right-3": null,
    "right-4": null,
  });
  const [sizes, setSizes] = useState<Partial<Record<MeasureKey, MeasuredSize>>>({});

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      setSizes((prev) => {
        const next = { ...prev };
        for (const entry of entries) {
          const key = (entry.target as HTMLElement).dataset.measureKey as MeasureKey | undefined;
          if (!key) continue;
          const rect = entry.contentRect;
          next[key] = {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        }
        return next;
      });
    });

    Object.values(refs.current).forEach((node) => {
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, []);

  const rows = useMemo(
    () =>
      MEASURE_ITEMS.map((item) => ({
        ...item,
        size: sizes[item.key],
      })),
    [sizes],
  );

  return (
    <section className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-semibold text-sky-950">Đo kích thước banner đang render</h2>
        <p className="mt-1 text-sm leading-6 text-sky-800">
          Kích thước bên dưới được đo bằng ResizeObserver từ layout preview dùng cùng cấu hình Hero hiện tại.
        </p>
      </div>

      <div className={HOME_HERO_LAYOUT_CONFIG.desktopGridClassName}>
        <div className="col-span-1 hidden min-h-0 rounded-xl border border-dashed border-sky-200 bg-white/60 lg:block" />
        <div
          ref={(node) => {
            refs.current.main = node;
          }}
          data-measure-key="main"
          className="col-span-5 aspect-[1644/658] rounded-xl border border-sky-200 bg-white shadow-sm lg:col-span-3"
        />
        <div className={`${HOME_HERO_LAYOUT_CONFIG.rightColumnClassName} col-span-5 lg:col-span-1`}>
          <div className={HOME_HERO_LAYOUT_CONFIG.rightPromoGridClassName}>
            {([1, 2, 3, 4] as const).map((index) => {
              const key = `right-${index}` as MeasureKey;
              return (
                <div
                  key={key}
                  ref={(node) => {
                    refs.current[key] = node;
                  }}
                  data-measure-key={key}
                  className="rounded-xl border border-sky-200 bg-white shadow-sm"
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {rows.map((row) => (
          <article key={row.key} className="rounded-xl border border-sky-100 bg-white p-3 shadow-sm">
            <p className="text-sm font-semibold text-slate-950">{row.label}</p>
            <dl className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
              <div className="flex justify-between gap-3">
                <dt>Width</dt>
                <dd className="font-semibold text-slate-900">{row.size ? `${row.size.width}px` : "Đang đo..."}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Height</dt>
                <dd className="font-semibold text-slate-900">{row.size ? `${row.size.height}px` : "Đang đo..."}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Render</dt>
                <dd className="font-semibold text-slate-900">{formatSize(row.size)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Aspect Ratio</dt>
                <dd className="font-semibold text-slate-900">{formatAspectRatio(row.size)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Upload</dt>
                <dd className="text-right font-semibold text-slate-900">{row.uploadSize}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs leading-5 text-slate-500">{row.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
