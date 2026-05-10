"use client";

const VISITOR_KEY_STORAGE = "zendo_visitor_key";
const SESSION_KEY_STORAGE = "zendo_session_key";
const LANDING_PATH_STORAGE = "zendo_landing_path";

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

export function layVisitorKey(): string {
  return docHoacTao(VISITOR_KEY_STORAGE, "v");
}

export function laySessionKey(): string {
  return docHoacTao(SESSION_KEY_STORAGE, "s");
}

export function layHoacGanLandingPath(pathname: string): string {
  if (typeof window === "undefined") return pathname;
  const current = window.localStorage.getItem(LANDING_PATH_STORAGE);
  if (current && current.trim()) return current;
  window.localStorage.setItem(LANDING_PATH_STORAGE, pathname);
  return pathname;
}

