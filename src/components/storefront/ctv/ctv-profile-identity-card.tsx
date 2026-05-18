"use client";

import Image from "next/image";
import { Check, Copy } from "lucide-react";
import { memo, useEffect, useState, type ChangeEvent, type RefObject } from "react";
import type { CustomerAccountSettings } from "@/lib/settings";
import { clampNextImageQuality } from "@/lib/next-image-quality";
import {
  CTV_V2_ACCOUNT_TIER_ACTIONS,
  CTV_V2_ACCOUNT_TIER_COMMISSION,
  CTV_V2_ACCOUNT_TIER_IDENTITY,
  CTV_V2_AVATAR_IMG_CLASS,
  CTV_V2_AVATAR_IMG_PX,
  CTV_V2_AVATAR_INNER,
  CTV_V2_AVATAR_OUTER,
  CTV_V2_AVATAR_QUALITY,
  CTV_V2_AVATAR_SIZES,
  CTV_V2_CARD_ACCOUNT,
  CTV_V2_HEADING,
  CTV_V2_MOTION,
  CTV_V2_SECTION_TITLE,
  CTV_V2_STAT_CAPTION,
  CTV_V2_STRIP_COMMISSION,
  CTV_V2_SUBHEADING,
} from "./ctv-ui-tokens";
import { CtvRoleBadge, CtvVerifiedBadge } from "./ctv-profile-badges";
import { CtvProfileQuickActions } from "./ctv-profile-quick-actions";

export type CtvProfileIdentityCardProps = {
  accountSettings: CustomerAccountSettings;
  displayName: string;
  contactText: string;
  refCode: string;
  badge: string;
  currentAvatar: string;
  avatarUrl: string;
  avatarInputRef: RefObject<HTMLInputElement | null>;
  avatarUploading: boolean;
  onPickAvatar: () => void;
  onAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
  onEditProfile?: () => void;
  showProfileLink: boolean;
  orderLookupHref: string;
  commissionAmount: number;
  rewardPoints: number;
  loyaltyPoints: number;
};

const money = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n)}₫`;

const accountTitleFallback = "Tài khoản của tôi";

const formatRewardPoints = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

function CtvProfileIdentityCardInner(props: CtvProfileIdentityCardProps): JSX.Element {
  const {
    accountSettings,
    displayName,
    contactText,
    refCode,
    badge,
    currentAvatar,
    avatarUrl,
    avatarInputRef,
    avatarUploading,
    onPickAvatar,
    onAvatarFileChange,
    onRemoveAvatar,
    onEditProfile,
    showProfileLink,
    orderLookupHref,
    commissionAmount: commissionRaw,
    rewardPoints: rewardRaw,
  } = props;

  const commissionAmount = Number.isFinite(commissionRaw) ? commissionRaw : 0;
  const rewardPoints = Number.isFinite(rewardRaw) ? rewardRaw : 0;
  const hasAvatar = Boolean((currentAvatar || avatarUrl).trim());

  const [copied, setCopied] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  useEffect(() => {
    setAvatarBroken(false);
  }, [currentAvatar]);

  const isCtv = badge.toUpperCase().includes("CTV");
  const accountTitle = accountSettings.accountTitle?.trim() || accountTitleFallback;
  const avatarAlt = displayName.trim()
    ? `Ảnh đại diện ${displayName.trim()}`
    : "Ảnh đại diện tài khoản CTV";

  const copyRef = () => {
    if (!refCode) return;
    navigator.clipboard
      ?.writeText(refCode)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  };

  return (
    <article
      className={`${CTV_V2_CARD_ACCOUNT} h-full`}
      aria-labelledby="ctv-account-card-heading"
    >
      <h3 id="ctv-account-card-heading" className={CTV_V2_SECTION_TITLE}>
        {accountTitle}
      </h3>

      <div className={CTV_V2_ACCOUNT_TIER_IDENTITY}>
        <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
          <div className={CTV_V2_AVATAR_OUTER}>
            <div className={CTV_V2_AVATAR_INNER}>
              {currentAvatar && !avatarBroken ? (
                <Image
                  src={currentAvatar}
                  alt={avatarAlt}
                  width={CTV_V2_AVATAR_IMG_PX}
                  height={CTV_V2_AVATAR_IMG_PX}
                  quality={clampNextImageQuality(CTV_V2_AVATAR_QUALITY)}
                  sizes={CTV_V2_AVATAR_SIZES}
                  priority
                  className={CTV_V2_AVATAR_IMG_CLASS}
                  onError={() => setAvatarBroken(true)}
                />
              ) : (
                <div
                  className={`${CTV_V2_AVATAR_IMG_CLASS} flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-blue-50 text-2xl font-bold text-[#1A1A1A] lg:text-3xl`}
                  role="img"
                  aria-label={avatarAlt}
                >
                  {(displayName.trim()[0] || "Z").toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
              <h2 className={`${CTV_V2_HEADING} min-w-0 truncate`}>{displayName}</h2>
              <CtvRoleBadge badge={badge} isCtv={isCtv} />
            </div>
            {contactText ? (
              <p className={`${CTV_V2_SUBHEADING} flex min-w-0 items-center gap-1.5`}>
                <span className="truncate antialiased">{contactText}</span>
                <CtvVerifiedBadge className="shrink-0" />
              </p>
            ) : null}
            {refCode ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2 pt-0.5">
                <span className="truncate text-[12px] text-[#6B7280] sm:text-[13px]">
                  Mã ref: <strong className="font-semibold text-[#1A1A1A]">{refCode}</strong>
                </span>
                <button
                  type="button"
                  onClick={copyRef}
                  className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-white px-2.5 text-[12px] font-semibold text-[#1A1A1A] shadow-sm ring-1 ring-slate-200/90 hover:bg-blue-50 hover:ring-blue-200/80 ${CTV_V2_MOTION}`}
                  aria-label={copied ? "Đã sao chép mã giới thiệu" : "Sao chép mã giới thiệu"}
                  title={copied ? "Đã sao chép" : "Sao chép mã ref"}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-[#6B7280]" aria-hidden />
                  )}
                  <span>{copied ? "Đã copy" : "Copy"}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <section
        className={`${CTV_V2_STRIP_COMMISSION} ${CTV_V2_ACCOUNT_TIER_COMMISSION}`}
        aria-labelledby="ctv-commission-points-heading"
      >
        <h4
          id="ctv-commission-points-heading"
          className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#6B7280]"
        >
          Hoa hồng / Điểm
        </h4>
        <dl className="mt-2 grid grid-cols-2 gap-3 sm:mt-2.5 sm:gap-4">
          <div className="min-w-0 border-r border-blue-100/80 pr-3 sm:pr-4">
            <dd className="text-lg font-bold tabular-nums text-[#1A1A1A] sm:text-xl">
              <strong>{money(commissionAmount)}</strong>
            </dd>
            <dt className={`${CTV_V2_STAT_CAPTION} mt-1 text-[11px]`}>Hoa hồng đã duyệt</dt>
          </div>
          <div className="min-w-0 pl-1 sm:pl-2">
            <dd className="text-lg font-bold tabular-nums text-[#1A1A1A] sm:text-xl">
              <strong>{formatRewardPoints(rewardPoints)}</strong>
            </dd>
            <dt className={`${CTV_V2_STAT_CAPTION} mt-1 text-[11px]`}>Điểm thưởng</dt>
          </div>
        </dl>
      </section>

      <div className={`${CTV_V2_ACCOUNT_TIER_ACTIONS} mt-auto`}>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.heic"
          className="hidden"
          onChange={onAvatarFileChange}
          aria-label="Chọn ảnh đại diện"
        />
        <CtvProfileQuickActions
          hasAvatar={hasAvatar}
          avatarUploading={avatarUploading}
          orderLookupHref={orderLookupHref}
          showProfileLink={showProfileLink}
          onPickAvatar={onPickAvatar}
          onRemoveAvatar={onRemoveAvatar}
          onEditProfile={onEditProfile}
        />
      </div>
    </article>
  );
}

export const CtvProfileIdentityCard = memo(CtvProfileIdentityCardInner);
