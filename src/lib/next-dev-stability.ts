/**
 * Khoảng polling / debounce ổn định cho dev: giảm race với HMR và tránh .next lệch.
 * Production giữ hành vi cũ; development kéo dài interval và debounce refetch tay.
 */

export function isNextDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

export type DevStabilityLogTag = "[NextDevStability]" | "[PollingCleanup]" | "[HotReloadSafe]";

export function devStabilityLog(
  _tag: DevStabilityLogTag,
  _message: string,
  _extra?: Record<string, unknown>,
): void {
  void _tag;
  void _message;
  void _extra;
}

/** Debounce refetch tay (setTick) — dev chậm hơn để tránh chồng request khi hot reload. */
export function devManualRefetchDebounceMs(): number {
  return isNextDevelopment() ? 450 : 0;
}

/** Sau khi tab hidden → visible: chờ trước khi catch-up một lần. */
export function devVisibilityResumeDelayMs(): number {
  return isNextDevelopment() ? 700 : 400;
}

/** CTV dashboard: `pollActive` = polling nóng (overview). `false` = không interval (chỉ fetch khi đổi URL/refetch). */
export function affiliateCreatorPollIntervalMs(visible: boolean, pollActive: boolean): number {
  if (!visible) return 0;
  if (!pollActive) return 0;
  return isNextDevelopment() ? 28_000 : 22_000;
}

/** Admin affiliate analytics API polling. */
export function adminAffiliatePollIntervalMs(visible: boolean, pollActive: boolean): number {
  if (!visible) return 0;
  if (pollActive) return isNextDevelopment() ? 25_000 : 15_000;
  return isNextDevelopment() ? 55_000 : 60_000;
}

/** Health endpoint gọi chậm, tách khỏi luồng realtime. */
export function adminAffiliateHealthIntervalMs(visible: boolean): number {
  if (!visible) return 0;
  return isNextDevelopment() ? 90_000 : 60_000;
}

/** Tab thông báo mở vs nền. */
export function customerNotificationsPollMs(notificationsTabActive: boolean): number {
  if (isNextDevelopment()) {
    return notificationsTabActive ? 28_000 : 55_000;
  }
  return notificationsTabActive ? 15_000 : 60_000;
}

export function storefrontSupportUnreadPollMs(): number {
  return isNextDevelopment() ? 60_000 : 30_000;
}

export function adminOrdersUnreadPollMs(): number {
  return isNextDevelopment() ? 35_000 : 20_000;
}

/** System operations / cache — chỉ khi tab visible. */
export function adminSystemOperationsRefreshMs(): number {
  return isNextDevelopment() ? 90_000 : 45_000;
}

/**
 * Chạy work sau khi main thread rảnh (requestIdleCallback), hoặc trước `timeoutMs` nếu luôn bận.
 * Dùng P3 UX: lùi fetch phụ để giảm tranh chấp với first paint (không đổi API / payload).
 */
export function scheduleIdleWork(callback: () => void, timeoutMs: number): () => void {
  if (typeof window === "undefined") {
    return () => {
      /* noop — chỉ client */
    };
  }
  const w = window as Window & {
    requestIdleCallback?: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  const run = (): void => {
    callback();
  };
  if (typeof w.requestIdleCallback === "function") {
    const handle = w.requestIdleCallback(run, { timeout: timeoutMs });
    return () => {
      w.cancelIdleCallback?.(handle);
    };
  }
  const delay = Math.min(420, Math.max(0, Math.floor(timeoutMs / 2)));
  const handle = window.setTimeout(run, delay);
  return () => window.clearTimeout(handle);
}
