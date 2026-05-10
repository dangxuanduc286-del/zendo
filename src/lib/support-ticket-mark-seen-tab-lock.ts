const LOCK_MS = 2000;
const BROADCAST_NAME = "zendo-support-ticket-mark-seen";

const lastOtherTabAt = new Map<string, number>();

let bc: BroadcastChannel | null | undefined;
let listenersAttached = false;

function lockKey(ticketId: string): string {
  return `markSeenLock-${ticketId.trim()}`;
}

function ownerKey(ticketId: string): string {
  return `markSeenLockOwner-${ticketId.trim()}`;
}

function getTabId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem("_zendoMarkSeenTabId");
    if (!id) {
      id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `t-${Date.now()}`;
      sessionStorage.setItem("_zendoMarkSeenTabId", id);
    }
    return id;
  } catch {
    return `t-${Date.now()}`;
  }
}

function onBroadcast(ev: MessageEvent): void {
  const d = ev.data as { ticketId?: string; at?: number; tabId?: string } | null;
  if (!d || typeof d.ticketId !== "string" || typeof d.at !== "number") return;
  if (d.tabId === getTabId()) return;
  const tid = d.ticketId.trim();
  if (!tid) return;
  lastOtherTabAt.set(tid, Math.max(lastOtherTabAt.get(tid) ?? 0, d.at));
}

function onStorage(ev: StorageEvent): void {
  const k = ev.key;
  if (!k) return;
  if (k.startsWith("markSeenLockOwner-")) return;
  if (!k.startsWith("markSeenLock-")) return;
  const tid = k.slice("markSeenLock-".length).trim();
  if (!tid) return;
  if (ev.newValue == null) {
    lastOtherTabAt.delete(tid);
    return;
  }
  const at = Number(ev.newValue);
  if (!Number.isFinite(at)) return;
  const owner = (() => {
    try {
      return localStorage.getItem(ownerKey(tid));
    } catch {
      return null;
    }
  })();
  if (owner === getTabId()) return;
  lastOtherTabAt.set(tid, Math.max(lastOtherTabAt.get(tid) ?? 0, at));
}

function ensureListeners(): void {
  if (typeof window === "undefined" || listenersAttached) return;
  listenersAttached = true;
  window.addEventListener("storage", onStorage);
  try {
    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel(BROADCAST_NAME);
      bc.addEventListener("message", onBroadcast);
    } else {
      bc = null;
    }
  } catch {
    bc = null;
  }
}

function otherTabReservedRecently(ticketId: string, now: number): boolean {
  const t = lastOtherTabAt.get(ticketId.trim());
  return t != null && now - t < LOCK_MS;
}

/**
 * Khóa đa-tab: localStorage (2s) + BroadcastChannel + storage event.
 * Cùng tab gọi lặp trong cửa sổ 2s → false. Tab khác vừa reserve → false.
 */
export function tryReserveMarkSeenForTicket(ticketId: string): boolean {
  if (typeof window === "undefined") return true;
  const tid = ticketId.trim();
  if (!tid) return true;
  ensureListeners();

  const now = Date.now();
  if (otherTabReservedRecently(tid, now)) {
    return false;
  }

  const key = lockKey(tid);
  const okey = ownerKey(tid);
  const myId = getTabId();

  try {
    const existing = localStorage.getItem(key);
    const existingTs = existing != null ? Number(existing) : NaN;
    if (Number.isFinite(existingTs) && now - existingTs < LOCK_MS) {
      const owner = localStorage.getItem(okey);
      if (owner === myId) {
        return false;
      }
      return false;
    }
    localStorage.setItem(key, String(now));
    localStorage.setItem(okey, myId);
  } catch {
    return true;
  }

  try {
    bc?.postMessage({ ticketId: tid, at: now, tabId: myId });
  } catch {
    /* ignore */
  }
  return true;
}

/** Gọi sau khi đã tryReserve thành công: chỉ gỡ nếu owner là tab này (không xóa lock tab khác). */
export function releaseMarkSeenTabLock(ticketId: string): void {
  if (typeof window === "undefined") return;
  const tid = ticketId.trim();
  if (!tid) return;
  try {
    if (localStorage.getItem(ownerKey(tid)) !== getTabId()) return;
    localStorage.removeItem(lockKey(tid));
    localStorage.removeItem(ownerKey(tid));
  } catch {
    /* ignore */
  }
}
