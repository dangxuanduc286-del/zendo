import "server-only";

import { Prisma } from "@prisma/client";
import type { AffiliateTrafficEventType, PrismaClient } from "@prisma/client";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { parseUserAgentHints } from "@/lib/sign-in-notification-hints";

export const AFFILIATE_TRACKING_COOKIE = "af_sid";
/** HttpOnly last-activity (ms since epoch). Used with af_sid for 30m inactivity rotation. */
export const AFFILIATE_SESSION_TOUCH_COOKIE = "af_s_at";

export const AFFILIATE_SESSION_INACTIVITY_MS = 30 * 60 * 1000;

function trackingCookieBase(maxAgeSec: number): {
  path: string;
  sameSite: "lax";
  secure: boolean;
  maxAge: number;
} {
  return {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSec,
  };
}

export type AffiliateTrackingSnapshot = {
  sessionId: string;
  ip: string | null;
  country: string | null;
  device: string;
  browser: string;
  os: string;
  referrer: string | null;
  pathname: string | null;
  utmSource: string | null;
  subid: string | null;
};

export function normalizeUtmSource(value: unknown): string | null {
  const t = typeof value === "string" ? value.trim() : "";
  if (!t) return null;
  return t.slice(0, 120);
}

export function normalizeSubId(value: unknown): string | null {
  const t = typeof value === "string" ? value.trim() : "";
  if (!t) return null;
  return t.slice(0, 120);
}

export function normalizePathname(value: unknown): string | null {
  const t = typeof value === "string" ? value.trim() : "";
  if (!t.startsWith("/")) return null;
  if (t.startsWith("//")) return null;
  return t.slice(0, 512);
}

export function normalizeReferrer(value: unknown): string | null {
  const t = typeof value === "string" ? value.trim() : "";
  if (!t) return null;
  return t.slice(0, 1024);
}

export function firstForwardedIp(h: Headers): string | null {
  const xf = h.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  const xr = h.get("x-real-ip")?.trim();
  return xr || null;
}

export function detectCountryFromHeaders(h: Headers): string | null {
  const cand =
    h.get("x-vercel-ip-country")?.trim() ||
    h.get("cf-ipcountry")?.trim() ||
    h.get("x-country")?.trim() ||
    "";
  const up = cand.toUpperCase();
  if (!up) return null;
  return up.slice(0, 8);
}

export function newAffiliateSessionId(): string {
  // lightweight, collision-safe enough for analytics; no crypto dependency needed.
  return `af_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`.slice(0, 80);
}

/**
 * Resolve analytics session id: rotate after {@link AFFILIATE_SESSION_INACTIVITY_MS} without server touch.
 * Touch cookie is httpOnly to reduce client tampering; af_sid stays readable for optional client hints.
 */
export async function resolveAffiliateTrackingSession(res?: NextResponse): Promise<{ sessionId: string; rotated: boolean }> {
  const jar = await cookies();
  const sid = jar.get(AFFILIATE_TRACKING_COOKIE)?.value?.trim().slice(0, 80) ?? "";
  const touchRaw = jar.get(AFFILIATE_SESSION_TOUCH_COOKIE)?.value?.trim() ?? "";
  const touchMs = Number(touchRaw);
  const now = Date.now();
  const touchOk = Number.isFinite(touchMs) && now - touchMs < AFFILIATE_SESSION_INACTIVITY_MS;

  if (sid && touchOk) {
    if (res) {
      res.cookies.set(AFFILIATE_SESSION_TOUCH_COOKIE, String(now), {
        ...trackingCookieBase(60 * 60 * 6),
        httpOnly: true,
      });
    }
    return { sessionId: sid, rotated: false };
  }

  const next = newAffiliateSessionId();
  if (res) {
    res.cookies.set(AFFILIATE_TRACKING_COOKIE, next, {
      ...trackingCookieBase(60 * 60 * 24 * 7),
      httpOnly: false,
    });
    res.cookies.set(AFFILIATE_SESSION_TOUCH_COOKIE, String(now), {
      ...trackingCookieBase(60 * 60 * 6),
      httpOnly: true,
    });
  }
  return { sessionId: next, rotated: true };
}

export async function getOrSetAffiliateSessionId(res?: NextResponse): Promise<string> {
  const { sessionId } = await resolveAffiliateTrackingSession(res);
  return sessionId;
}

/** Call from storefront capture pixel to align session cookies without a track POST. */
export async function refreshAffiliateTrackingSessionCookies(res: NextResponse): Promise<void> {
  await resolveAffiliateTrackingSession(res);
}

export async function snapshotAffiliateTrackingFromRequest(args: {
  pathname?: unknown;
  referrer?: unknown;
  utmSource?: unknown;
  subid?: unknown;
  responseForCookie?: NextResponse;
}): Promise<AffiliateTrackingSnapshot> {
  const h = await headers();
  const ip = firstForwardedIp(h);
  const country = detectCountryFromHeaders(h);
  const ua = h.get("user-agent");
  const { browser, os, device } = parseUserAgentHints(ua);
  const { sessionId } = await resolveAffiliateTrackingSession(args.responseForCookie);
  return {
    sessionId,
    ip,
    country,
    device,
    browser,
    os,
    referrer: normalizeReferrer(args.referrer),
    pathname: normalizePathname(args.pathname),
    utmSource: normalizeUtmSource(args.utmSource),
    subid: normalizeSubId(args.subid),
  };
}

export function shouldDedupeAffiliateEvent(args: {
  nowMs: number;
  lastSeenMs: number | null;
  dedupeWindowMs: number;
}): boolean {
  if (!args.lastSeenMs) return false;
  return args.nowMs - args.lastSeenMs < args.dedupeWindowMs;
}

export async function upsertAffiliateRealtimeSession(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  sessionId: string;
  visitorKey?: string | null;
  country?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  pathname?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const sessionId = args.sessionId.trim().slice(0, 80);
  if (!sessionId) return;

  await args.db.affiliateRealtimeSession.upsert({
    where: { sessionId },
    create: {
      affiliateProfileId: args.affiliateProfileId,
      sessionId,
      visitorKey: (args.visitorKey ?? null)?.trim().slice(0, 120) || null,
      firstCountry: (args.country ?? null)?.trim().slice(0, 8) || null,
      firstDevice: (args.device ?? null)?.trim().slice(0, 60) || null,
      firstBrowser: (args.browser ?? null)?.trim().slice(0, 60) || null,
      firstOs: (args.os ?? null)?.trim().slice(0, 60) || null,
      lastPathname: (args.pathname ?? null)?.trim().slice(0, 512) || null,
      metadata: args.metadata != null ? (args.metadata as Prisma.InputJsonValue) : undefined,
      lastSeenAt: new Date(),
    },
    update: {
      lastSeenAt: new Date(),
      lastPathname: (args.pathname ?? null)?.trim().slice(0, 512) || null,
    },
  });
}

export async function insertAffiliateTrafficEvent(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  customerId?: string | null;
  sessionId?: string | null;
  eventType: AffiliateTrafficEventType;
  productId?: string | null;
  orderId?: string | null;
  revenue?: number | null;
  commission?: number | null;
  country?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  referrer?: string | null;
  pathname?: string | null;
  metadata?: Record<string, unknown> | null;
  trackingLinkId?: string | null;
}): Promise<{ id: string }> {
  const row = await args.db.affiliateTrafficEvent.create({
    data: {
      affiliateProfileId: args.affiliateProfileId,
      customerId: args.customerId ?? null,
      sessionId: args.sessionId?.trim().slice(0, 80) || null,
      eventType: args.eventType,
      productId: args.productId ?? null,
      orderId: args.orderId ?? null,
      revenue: args.revenue == null ? null : args.revenue,
      commission: args.commission == null ? null : args.commission,
      country: (args.country ?? null)?.trim().slice(0, 8) || null,
      device: (args.device ?? null)?.trim().slice(0, 60) || null,
      browser: (args.browser ?? null)?.trim().slice(0, 60) || null,
      os: (args.os ?? null)?.trim().slice(0, 60) || null,
      referrer: (args.referrer ?? null)?.trim().slice(0, 1024) || null,
      pathname: (args.pathname ?? null)?.trim().slice(0, 512) || null,
      metadata: args.metadata != null ? (args.metadata as Prisma.InputJsonValue) : undefined,
      trackingLinkId: args.trackingLinkId?.trim().slice(0, 32) || null,
    },
    select: { id: true },
  });
  return { id: row.id };
}

