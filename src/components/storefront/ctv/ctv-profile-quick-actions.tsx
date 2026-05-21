"use client";

import Link from "next/link";
import { Camera, Package, Pencil, Trash2, type LucideIcon } from "lucide-react";
import { memo, useMemo } from "react";
import {
  CTV_V2_PROFILE_ACTION_ICON,
  CTV_V2_PROFILE_ACTION_LABEL,
  CTV_V2_PROFILE_ACTION_TILE,
  CTV_V2_PROFILE_ACTIONS_GRID,
} from "./ctv-ui-tokens";

/** Mobile giữ 24px; desktop thu nhỏ đồng đều 16px */
const ACTION_ICON_CLASS = "h-6 w-6 lg:h-4 lg:w-4";

export type CtvProfileQuickAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  kind: "button" | "link";
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel: string;
  title: string;
  tileClassName?: string;
  iconClassName?: string;
};

export type CtvProfileQuickActionsProps = {
  hasAvatar: boolean;
  avatarUploading: boolean;
  orderLookupHref: string;
  showProfileLink: boolean;
  onPickAvatar: () => void;
  onRemoveAvatar: () => void;
  onEditProfile?: () => void;
};

function buildProfileQuickActions({
  hasAvatar,
  avatarUploading,
  orderLookupHref,
  showProfileLink,
  onPickAvatar,
  onRemoveAvatar,
  onEditProfile,
}: CtvProfileQuickActionsProps): CtvProfileQuickAction[] {
  const uploadLabel = hasAvatar ? "Đổi ảnh" : "Tải ảnh";

  const actions: CtvProfileQuickAction[] = [
    {
      id: "upload-avatar",
      kind: "button",
      icon: Camera,
      label: uploadLabel,
      ariaLabel: hasAvatar ? "Đổi ảnh đại diện" : "Tải ảnh đại diện",
      title: uploadLabel,
      onClick: onPickAvatar,
      disabled: avatarUploading,
    },
    {
      id: "remove-avatar",
      kind: "button",
      icon: Trash2,
      label: "Xóa ảnh",
      ariaLabel: "Xóa ảnh đại diện",
      title: "Xóa ảnh",
      onClick: onRemoveAvatar,
      disabled: avatarUploading || !hasAvatar,
    },
    {
      id: "order-lookup",
      kind: "link",
      icon: Package,
      label: "Theo dõi đơn",
      ariaLabel: "Theo dõi đơn hàng",
      title: "Theo dõi đơn hàng",
      href: orderLookupHref,
    },
  ];

  if (showProfileLink && onEditProfile) {
    actions.push({
      id: "edit-profile",
      kind: "button",
      icon: Pencil,
      label: "Sửa hồ sơ",
      ariaLabel: "Chỉnh sửa hồ sơ cá nhân",
      title: "Chỉnh sửa hồ sơ",
      onClick: onEditProfile,
    });
  }

  return actions;
}

function CtvProfileQuickActionsInner({
  hasAvatar,
  avatarUploading,
  orderLookupHref,
  showProfileLink,
  onPickAvatar,
  onRemoveAvatar,
  onEditProfile,
}: CtvProfileQuickActionsProps): JSX.Element {
  const actions = useMemo(
    () =>
      buildProfileQuickActions({
        hasAvatar,
        avatarUploading,
        orderLookupHref,
        showProfileLink,
        onPickAvatar,
        onRemoveAvatar,
        onEditProfile,
      }),
    [
      hasAvatar,
      avatarUploading,
      orderLookupHref,
      showProfileLink,
      onPickAvatar,
      onRemoveAvatar,
      onEditProfile,
    ],
  );

  return (
    <div className={CTV_V2_PROFILE_ACTIONS_GRID} role="group" aria-label="Thao tác tài khoản">
      {actions.map((item) => {
        const Icon = item.icon;
        const content = (
          <>
            <span className={`${CTV_V2_PROFILE_ACTION_ICON} ${item.iconClassName ?? ""}`.trim()}>
              <Icon className={ACTION_ICON_CLASS} strokeWidth={2} aria-hidden />
            </span>
            <span className={CTV_V2_PROFILE_ACTION_LABEL}>{item.label}</span>
          </>
        );

        if (item.kind === "link" && item.href) {
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`${CTV_V2_PROFILE_ACTION_TILE} ${item.tileClassName ?? ""}`.trim()}
              aria-label={item.ariaLabel}
              title={item.title}
            >
              {content}
            </Link>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            disabled={item.disabled}
            className={`${CTV_V2_PROFILE_ACTION_TILE} ${item.tileClassName ?? ""}`.trim()}
            aria-label={item.ariaLabel}
            title={item.title}
          >
            {content}
          </button>
        );
      })}
      {actions.length < 4 ? (
        <div className={`${CTV_V2_PROFILE_ACTION_TILE} pointer-events-none opacity-0`} aria-hidden />
      ) : null}
    </div>
  );
}

export const CtvProfileQuickActions = memo(CtvProfileQuickActionsInner);
