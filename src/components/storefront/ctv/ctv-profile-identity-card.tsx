"use client";

import Image from "next/image";
import { Check, Copy } from "lucide-react";
import { memo, useEffect, useState, type ChangeEvent, type RefObject } from "react";
import type { CustomerAccountSettings } from "@/lib/settings";
import { clampNextImageQuality } from "@/lib/next-image-quality";
import {
  CTV_HUB_CARD_PAD,
  CTV_HUB_CARD_TITLE,
  CTV_HUB_ACCOUNT_META,
  CTV_HUB_ACCOUNT_NAME,
  CTV_HUB_ACCOUNT_SECONDARY,
  CTV_HUB_IDENTITY_STACK,
  CTV_HUB_INNER_CARD,
  CTV_V2_ACCOUNT_TIER_ACTIONS,
  CTV_V2_AVATAR_IMG_CLASS,
  CTV_V2_AVATAR_IMG_PX,
  CTV_V2_AVATAR_INNER,
  CTV_V2_AVATAR_OUTER,
  CTV_V2_AVATAR_QUALITY,
  CTV_V2_AVATAR_SIZES,
  CTV_V2_MOTION,
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
    rewardPoints: rewardRaw,
  } = props;

  const rewardPoints = Number.isFinite(rewardRaw) ? rewardRaw : 0;
  const hasAvatar = Boolean((currentAvatar || avatarUrl).trim());
  const isCtv = badge.toUpperCase().includes("CTV");

  const [copied, setCopied] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  useEffect(() => {
    setAvatarBroken(false);
  }, [currentAvatar]);

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
      className={[CTV_HUB_INNER_CARD, CTV_HUB_CARD_PAD, "flex min-h-0 min-w-0 flex-col"].join(" ")}
      aria-labelledby="ctv-account-card-heading"
    >
      <h2 id="ctv-account-card-heading" className={CTV_HUB_CARD_TITLE}>
        {accountTitle}
      </h2>

      <div className={CTV_HUB_IDENTITY_STACK}>
        <div className="flex min-w-0 items-start gap-4">
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
                  className={CTV_V2_AVATAR_IMG_CLASS}
                  onError={() => setAvatarBroken(true)}
                />
              ) : (
                <div
                  className={`${CTV_V2_AVATAR_IMG_CLASS} flex items-center justify-center bg-slate-100 text-xl font-bold text-slate-700`}
                  role="img"
                  aria-label={avatarAlt}
                >
                  {(displayName.trim()[0] || "Z").toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className={CTV_HUB_ACCOUNT_NAME}>{displayName}</p>
              <CtvRoleBadge badge={badge} isCtv={isCtv} />
            </div>

            {contactText ? (
              <p className={`${CTV_HUB_ACCOUNT_META} flex min-w-0 items-center gap-1.5`}>
                <span className="truncate">{contactText}</span>
                <CtvVerifiedBadge className="shrink-0" />
              </p>
            ) : null}

            {refCode ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className={`${CTV_HUB_ACCOUNT_SECONDARY} truncate`}>
                  Mã ref: <strong className="font-semibold text-[#0F172A]">{refCode}</strong>
                </span>
                <button
                  type="button"
                  onClick={copyRef}
                  className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-700 hover:bg-[#F8FAFC] ${CTV_V2_MOTION}`}
                  aria-label={copied ? "Đã sao chép mã giới thiệu" : "Sao chép mã giới thiệu"}
                  title={copied ? "Đã sao chép" : "Sao chép mã ref"}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                  )}
                  <span>{copied ? "Đã copy" : "Copy"}</span>
                </button>
              </div>
            ) : null}

            <p className={CTV_HUB_ACCOUNT_SECONDARY}>
              Điểm thưởng:{" "}
              <strong className="font-semibold tabular-nums text-[#0F172A]">{formatRewardPoints(rewardPoints)}</strong>
            </p>
          </div>
        </div>
      </div>

      <div className={CTV_V2_ACCOUNT_TIER_ACTIONS}>
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
