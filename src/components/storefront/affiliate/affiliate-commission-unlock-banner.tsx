"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AFFILIATE_COMMISSION_NOTIFICATION_TYPE,
  readAffiliateCommissionNotificationType,
} from "@/lib/affiliate/affiliate-commission-notification-types";
import type { CustomerNotificationsPollBundle } from "@/lib/use-customer-notifications-poll";

export function AffiliateCommissionUnlockBanner({
  notifications,
  enabled,
}: {
  notifications: CustomerNotificationsPollBundle;
  enabled: boolean;
}): JSX.Element | null {
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const availableNotice = useMemo(() => {
    if (!enabled) return null;
    for (const item of notifications.items) {
      if (item.read) continue;
      const meta = item.metadata && typeof item.metadata === "object" ? item.metadata : null;
      const type = readAffiliateCommissionNotificationType(meta);
      if (type === AFFILIATE_COMMISSION_NOTIFICATION_TYPE.AVAILABLE) {
        return item;
      }
    }
    return null;
  }, [enabled, notifications.items]);

  if (!availableNotice || dismissedId === availableNotice.id) return null;

  const href = availableNotice.actionHref?.startsWith("/")
    ? availableNotice.actionHref
    : "/tai-khoan?tab=affiliate&sub=earnings";

  return (
    <div
      className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50/80 px-4 py-3 shadow-sm"
      role="status"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-emerald-900">
            Bạn có hoa hồng mới đã được mở khóa khả dụng
          </p>
          <p className="mt-1 text-xs leading-relaxed text-emerald-800">
            {availableNotice.body.split("\n")[0]}
          </p>
          <Link href={href} className="mt-2 inline-flex text-xs font-semibold text-emerald-700 hover:underline">
            Xem hoa hồng & đối soát →
          </Link>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100/80"
          onClick={() => setDismissedId(availableNotice.id)}
          aria-label="Ẩn thông báo"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
