"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { clampNextImageQuality } from "@/lib/next-image-quality";

import { CtvRoleBadge, CtvVerifiedBadge } from "../ctv/ctv-profile-badges";
import type { ChangeEvent, RefObject } from "react";
import type { CustomerAccountSettings } from "../../../lib/settings";
import { CtvFormattedValue } from "../ctv/ctv-formatted-value";
import { CTV_MOBILE_KPI_GRID } from "../ctv/ctv-ui-tokens";
import {
  CTV_CTA_ACCENT,
  CTV_CTA_PRIMARY,
  CTV_CTA_SECONDARY,
  CTV_PROFILE_SHELL,
  CTV_TYPE_BODY,
  CTV_TYPE_EYEBROW,
  CTV_TYPE_TITLE,
} from "./affiliate-ctv-account-ui-tokens";

export type CtvQuickStatCard = {
  key: string;
  label: string;
  value: string | number;
};

type AffiliateCtvAccountProfileHeroProps = {
  variant: "mobile" | "desktop";
  accountSettings: CustomerAccountSettings;
  accountSubtitle: string;
  displayName: string;
  contactText: string;
  badge: string;
  currentAvatar: string;
  avatarUrl: string;
  avatarInputRef: RefObject<HTMLInputElement | null>;
  avatarUploading: boolean;
  avatarMessage: string;
  avatarError: string;
  onPickAvatar: () => void;
  onAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
  onEditProfile?: () => void;
  showProfileLink: boolean;
  showShoppingCta: boolean;
  shoppingHomeHref: string;
  orderLookupHref: string;
  quickCards: CtvQuickStatCard[];
  statsGridId?: string;
  refCode?: string;
};

function formatStatValue(value: string | number): string {
  return typeof value === "number" ? value.toLocaleString("vi-VN") : value;
}

export function AffiliateCtvAccountProfileHero({
  variant,
  accountSettings,
  accountSubtitle,
  displayName,
  contactText,
  badge,
  currentAvatar,
  avatarUrl,
  avatarInputRef,
  avatarUploading,
  avatarMessage,
  avatarError,
  onPickAvatar,
  onAvatarFileChange,
  onRemoveAvatar,
  onEditProfile,
  showProfileLink,
  showShoppingCta,
  shoppingHomeHref,
  orderLookupHref,
  quickCards,
  statsGridId = "tong-quan-stats",
  refCode = "",
}: AffiliateCtvAccountProfileHeroProps): JSX.Element {
  const [avatarBroken, setAvatarBroken] = useState(false);
  useEffect(() => {
    setAvatarBroken(false);
  }, [currentAvatar]);

  const isDesktop = variant === "desktop";
  const avatarQuality = clampNextImageQuality(85);
  const isCtv = badge.toUpperCase().includes("CTV");

  const shellClass = isDesktop
    ? CTV_PROFILE_SHELL
    : "w-full min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-6";

  const avatarSize = isDesktop
    ? "h-14 w-14 lg:h-16 lg:w-16"
    : "h-12 w-12 sm:h-14 sm:w-14 lg:h-[72px] lg:w-[72px] lg:text-lg";

  const innerLayout = isDesktop ? (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-5">
        <div className="relative shrink-0 justify-self-start">
          {currentAvatar && !avatarBroken ? (
            <Image
              src={currentAvatar}
              alt=""
              width={64}
              height={64}
              quality={avatarQuality}
              className={`${avatarSize} rounded-full object-cover ring-2 ring-slate-100`}
              onError={() => setAvatarBroken(true)}
            />
          ) : (
            <div
              className={`inline-flex ${avatarSize} items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 text-lg font-bold text-blue-700 ring-2 ring-slate-100`}
              aria-hidden
            >
              {(displayName.trim()[0] || "Z").toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className={CTV_TYPE_EYEBROW}>{accountSettings.accountTitle || "Tài khoản của tôi"}</p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
            <h2 className={`${CTV_TYPE_TITLE} min-w-0 truncate antialiased`}>{displayName}</h2>
            <CtvRoleBadge badge={badge} isCtv={isCtv} />
          </div>
          {contactText ? (
            <p className={`${CTV_TYPE_BODY} mt-0.5 flex min-w-0 items-center gap-1.5`}>
              <span className="truncate antialiased">{contactText}</span>
              {isCtv ? <CtvVerifiedBadge /> : null}
            </p>
          ) : null}
          {refCode ? (
            <p className="mt-2 text-xs text-slate-500">
              Mã ref: <span className="font-semibold text-slate-800">{refCode}</span>
            </p>
          ) : null}
        </div>
      </div>

      {quickCards.length > 0 ? (
        <div
          id={statsGridId}
          className={CTV_MOBILE_KPI_GRID}
          role="list"
          aria-label="Chỉ số nhanh tài khoản"
        >
          {quickCards.slice(0, 4).map((card) => (
            <article
              key={card.key}
              role="listitem"
              className={`@container/metric flex min-h-[4.5rem] flex-col justify-center overflow-hidden rounded-xl px-4 py-3 ${
                card.key === "rewards"
                  ? "bg-emerald-50/90 ring-1 ring-emerald-100/90"
                  : "bg-slate-50/95 ring-1 ring-slate-100/90"
              }`}
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{card.label}</p>
              <CtvFormattedValue value={formatStatValue(card.value)} variant="auto" className="mt-1" />
            </article>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <input
          id="affiliate-profile-hero-avatar-desktop"
          name="avatar"
          ref={avatarInputRef}
          type="file"
          accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.heic"
          className="hidden"
          onChange={onAvatarFileChange}
        />
        <button type="button" onClick={onPickAvatar} disabled={avatarUploading} className={CTV_CTA_SECONDARY}>
          {avatarUrl ? "Đổi ảnh" : "Tải ảnh"}
        </button>
        {avatarUrl ? (
          <button
            type="button"
            onClick={onRemoveAvatar}
            disabled={avatarUploading}
            className={`${CTV_CTA_SECONDARY} !text-rose-700 hover:!bg-rose-50`}
          >
            Xóa ảnh
          </button>
        ) : null}
        <Link href={orderLookupHref} className={CTV_CTA_PRIMARY}>
          Đơn hàng của tôi
        </Link>
        {showProfileLink && onEditProfile ? (
          <button type="button" onClick={onEditProfile} className={CTV_CTA_SECONDARY}>
            Chỉnh sửa hồ sơ
          </button>
        ) : null}
        {showShoppingCta ? (
          <Link href={shoppingHomeHref} className={CTV_CTA_ACCENT}>
            {accountSettings.shoppingCtaText || "Tiếp tục mua sắm"}
          </Link>
        ) : null}
      </div>

      {(avatarUploading || avatarMessage || avatarError) ? (
        <div className="text-xs" role="status" aria-live="polite">
          {avatarUploading ? <p className="text-slate-500">Đang tải ảnh…</p> : null}
          {avatarMessage ? <p className="text-emerald-700">{avatarMessage}</p> : null}
          {avatarError ? <p className="text-rose-700">{avatarError}</p> : null}
        </div>
      ) : null}
    </div>
  ) : (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(14rem,1fr)] lg:items-start lg:gap-6 xl:gap-8">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-3 lg:gap-4">
          {currentAvatar && !avatarBroken ? (
            <Image
              src={currentAvatar}
              alt=""
              width={72}
              height={72}
              quality={avatarQuality}
              className={`${avatarSize} shrink-0 rounded-full border border-[#E2E8F0] object-cover`}
              onError={() => setAvatarBroken(true)}
            />
          ) : (
            <div
              className={`inline-flex ${avatarSize} shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] font-bold text-[#1D4ED8]`}
              aria-hidden
            >
              {(displayName.trim()[0] || "Z").toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
              {accountSettings.accountTitle || "Tài khoản của tôi"}
            </p>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2 className="min-w-0 truncate text-lg font-semibold text-[#0f172a] antialiased">{displayName}</h2>
              <CtvRoleBadge badge={badge} isCtv={isCtv} />
            </div>
            {contactText ? (
              <p className="flex min-w-0 items-center gap-1.5 text-sm text-[#64748B]">
                <span className="truncate antialiased">{contactText}</span>
                {isCtv ? <CtvVerifiedBadge /> : null}
              </p>
            ) : null}
            <p className="mt-0.5 line-clamp-1 text-xs text-[#64748B]">{accountSubtitle}</p>
            {showProfileLink && onEditProfile ? (
              <button
                type="button"
                onClick={onEditProfile}
                className="mt-1 text-xs font-medium text-[#2563EB] hover:text-[#1D4ED8]"
              >
                Chỉnh sửa hồ sơ
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="affiliate-profile-hero-avatar-mobile"
            name="avatar"
            ref={avatarInputRef}
            type="file"
            accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.heic"
            className="hidden"
            onChange={onAvatarFileChange}
          />
          <button type="button" onClick={onPickAvatar} disabled={avatarUploading} className={CTV_CTA_SECONDARY}>
            {avatarUrl ? "Đổi ảnh" : "Tải ảnh lên"}
          </button>
          {avatarUrl ? (
            <button
              type="button"
              onClick={onRemoveAvatar}
              disabled={avatarUploading}
              className={`${CTV_CTA_SECONDARY} text-rose-600 hover:bg-rose-50`}
            >
              Xóa ảnh
            </button>
          ) : null}
          {avatarUploading ? <p className="text-xs text-[#64748B]">Đang tải ảnh...</p> : null}
          {avatarMessage ? <p className="text-xs text-emerald-700">{avatarMessage}</p> : null}
          {avatarError ? <p className="text-xs text-rose-700">{avatarError}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={orderLookupHref} className={CTV_CTA_PRIMARY}>
            Đơn hàng của tôi
          </Link>
          {showShoppingCta ? (
            <Link href={shoppingHomeHref} className={CTV_CTA_ACCENT}>
              {accountSettings.shoppingCtaText || "Tiếp tục mua sắm"}
            </Link>
          ) : null}
        </div>
      </div>
      {quickCards.length > 0 ? (
        <div
          id={statsGridId}
          className="grid min-w-0 w-full grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] sm:gap-2.5 lg:gap-3"
          role="region"
          aria-label="Thống kê tài khoản"
        >
          {quickCards.map((card) => (
            <article
              key={card.key}
              className="@container/metric overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2 shadow-sm sm:px-3 sm:py-2.5"
            >
              <p className="text-[10px] font-medium leading-snug text-slate-500 lg:text-[11px]">{card.label}</p>
              <CtvFormattedValue value={formatStatValue(card.value)} variant="auto" className="mt-0.5" />
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <section className={shellClass} aria-label="Thông tin tài khoản CTV">
      {innerLayout}
    </section>
  );
}
