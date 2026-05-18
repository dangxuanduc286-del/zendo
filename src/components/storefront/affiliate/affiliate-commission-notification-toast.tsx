"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AFFILIATE_COMMISSION_NOTIFICATION_TYPE,
  readAffiliateCommissionNotificationType,
} from "@/lib/affiliate/affiliate-commission-notification-types";
import type { AffiliateCommissionTabSettings } from "@/lib/affiliate-commission-tab-settings";
import type { CustomerNotificationsPollBundle } from "@/lib/use-customer-notifications-poll";

function playUnlockChime(tab: AffiliateCommissionTabSettings | undefined): void {
  if (!tab?.soundEnabled || tab.soundMode === "off") return;
  if (tab.soundMode === "custom" && tab.soundCustomUrl.trim().startsWith("/")) {
    try {
      const a = new Audio(tab.soundCustomUrl.trim());
      void a.play().catch(() => {});
    } catch {
      /* noop */
    }
    return;
  }
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.start();
    o.stop(ctx.currentTime + 0.35);
    void ctx.close();
  } catch {
    /* noop */
  }
}

type ToastPayload = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  tone: "success" | "warning";
};

function pickToastCandidate(items: CustomerNotificationsPollBundle["items"]): ToastPayload | null {
  for (const item of items) {
    if (item.read) continue;
    const meta = item.metadata && typeof item.metadata === "object" ? item.metadata : null;
    const type = readAffiliateCommissionNotificationType(meta);
    if (type === AFFILIATE_COMMISSION_NOTIFICATION_TYPE.AVAILABLE) {
      return {
        id: item.id,
        title: item.title,
        body: item.body.split("\n")[0] ?? item.body,
        href: item.actionHref,
        tone: "success",
      };
    }
    if (type === AFFILIATE_COMMISSION_NOTIFICATION_TYPE.CANCELED) {
      return {
        id: item.id,
        title: item.title,
        body: item.body.split("\n")[0] ?? item.body,
        href: item.actionHref,
        tone: "warning",
      };
    }
  }
  return null;
}

export function AffiliateCommissionNotificationToast({
  notifications,
  enabled,
  commissionTab,
}: {
  notifications: CustomerNotificationsPollBundle;
  enabled: boolean;
  commissionTab?: AffiliateCommissionTabSettings;
}): JSX.Element | null {
  const seenIdsRef = useRef<Set<string> | null>(null);
  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if (seenIdsRef.current === null) {
      seenIdsRef.current = new Set(notifications.items.map((i) => i.id));
      return;
    }

    const candidate = pickToastCandidate(notifications.items);
    if (!candidate || seenIdsRef.current.has(candidate.id)) return;

    seenIdsRef.current.add(candidate.id);
    setToast(candidate);
    if (candidate.tone === "success") playUnlockChime(commissionTab);
  }, [commissionTab, enabled, notifications.items]);

  useEffect(() => {
    if (!toast) return;
    const ms = toast.tone === "success" ? 7000 : 6000;
    const t = window.setTimeout(() => setToast(null), ms);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (!enabled || !toast) return null;

  const success = toast.tone === "success";

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex justify-center px-4 sm:justify-end sm:pr-6"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto w-full max-w-sm rounded-2xl border px-4 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.18)] transition-[transform,opacity] duration-200 ease-out ${
          success ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
        }`}
      >
        <p className={`text-sm font-bold ${success ? "text-emerald-900" : "text-rose-900"}`}>{toast.title}</p>
        <p className={`mt-1 text-xs leading-relaxed ${success ? "text-emerald-800" : "text-rose-800"}`}>
          {toast.body}
        </p>
        {toast.href?.startsWith("/") ? (
          <Link
            href={toast.href}
            className={`mt-2 inline-flex text-xs font-semibold ${success ? "text-emerald-700" : "text-rose-700"} hover:underline`}
            onClick={() => setToast(null)}
          >
            Xem hoa hồng →
          </Link>
        ) : null}
        <button
          type="button"
          className="mt-2 block text-[11px] font-medium text-slate-500 hover:text-slate-700"
          onClick={() => setToast(null)}
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
