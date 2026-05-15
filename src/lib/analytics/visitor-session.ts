"use client";

const VISITOR_KEY_STORAGE = "zendo_visitor_key";
const SESSION_META_STORAGE = "zendo_session_meta_v2";
const LANDING_PATH_STORAGE = "zendo_landing_path";

/** Khớp server: 30 phút không hoạt động → session client mới (không tạo visitor mới). */
const SESSION_INACTIVITY_MS = 30 * 60 * 1000;

type SessionMeta = { key: string; lastAt: number };

function taoKey(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function docHoacTao(storageKey: string, prefix: string): string {
  if (typeof window === "undefined") return "";
  const current = window.localStorage.getItem(storageKey);
  if (current && current.trim()) return current;
  const next = taoKey(prefix);
  window.localStorage.setItem(storageKey, next);
  return next;
}

function readSessionMeta(): SessionMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_META_STORAGE);
    if (!raw) return null;
    const j = JSON.parse(raw) as unknown;
    if (!j || typeof j !== "object") return null;
    const key = typeof (j as SessionMeta).key === "string" ? (j as SessionMeta).key.trim() : "";
    const lastAt = typeof (j as SessionMeta).lastAt === "number" ? (j as SessionMeta).lastAt : NaN;
    if (!key || !Number.isFinite(lastAt)) return null;
    return { key, lastAt };
  } catch {
    return null;
  }
}

function writeSessionMeta(meta: SessionMeta): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_META_STORAGE, JSON.stringify(meta));
}

/** Visitor ổn định (fingerprint nhẹ), không đổi khi refresh. */
export function layVisitorKey(): string {
  return docHoacTao(VISITOR_KEY_STORAGE, "v");
}

/**
 * Session browser: cùng key trong 30 phút hoạt động; hết hạn → key mới (khớp cookie af_sid server).
 */
export function laySessionKey(): string {
  if (typeof window === "undefined") return "";
  const now = Date.now();
  const meta = readSessionMeta();
  if (meta && now - meta.lastAt < SESSION_INACTIVITY_MS) {
    writeSessionMeta({ key: meta.key, lastAt: now });
    return meta.key;
  }
  const legacy = window.localStorage.getItem("zendo_session_key")?.trim();
  const next = legacy && meta == null ? legacy : taoKey("s");
  writeSessionMeta({ key: next, lastAt: now });
  try {
    window.localStorage.removeItem("zendo_session_key");
  } catch {
    /* ignore */
  }
  return next;
}

export function layHoacGanLandingPath(pathname: string): string {
  if (typeof window === "undefined") return pathname;
  const current = window.localStorage.getItem(LANDING_PATH_STORAGE);
  if (current && current.trim()) return current;
  window.localStorage.setItem(LANDING_PATH_STORAGE, pathname);
  return pathname;
}
