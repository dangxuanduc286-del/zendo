import { xacDinhLoaiThietBiTuUserAgent } from "./device-type";
import { chuanHoaPathname, chuanHoaReferrer } from "./source";
import { layCauHinhTrackingAnalytics } from "./tracking-settings";

const DEDUP_WINDOW_MS = 20000;

export type TrackPageVisitInput = {
  pathname: string;
  referrer?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  visitorKey?: string | null;
  sessionKey?: string | null;
  visitedAt?: Date;
};

export function isStorefrontTrackablePath(pathname: string): boolean {
  if (!pathname || !pathname.startsWith("/")) return false;
  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/api")) return false;
  if (pathname.startsWith("/_next")) return false;
  if (pathname === "/favicon.ico" || pathname === "/robots.txt" || pathname === "/sitemap.xml") return false;
  if (/\.[a-zA-Z0-9]{2,8}$/.test(pathname)) return false;
  return true;
}

function isLikelyBot(userAgent: string | null | undefined): boolean {
  const ua = (userAgent ?? "").toLowerCase();
  if (!ua) return false;
  return /bot|crawler|spider|facebookexternalhit|slurp|bingpreview|headless/.test(ua);
}

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../db");
    return dbModule.db;
  } catch {
    return null;
  }
}

export async function trackPageVisit(input: TrackPageVisitInput): Promise<{ created: boolean; reason?: string }> {
  const db = await getDbClient();
  if (!db) return { created: false, reason: "missing_db" };
  const trackingSettings = await layCauHinhTrackingAnalytics();
  if (!trackingSettings.trackingEnabled) {
    return { created: false, reason: "tracking_disabled" };
  }

  const pathname = chuanHoaPathname(input.pathname);
  if (!isStorefrontTrackablePath(pathname)) {
    return { created: false, reason: "non_storefront_path" };
  }

  const now = input.visitedAt ?? new Date();
  const visitorKey = input.visitorKey?.trim() || null;
  const sessionKey = input.sessionKey?.trim() || null;
  const referrer = chuanHoaReferrer(input.referrer);
  const userAgent = input.userAgent?.slice(0, 1000) ?? null;
  const ip = input.ip?.slice(0, 120) ?? null;
  const deviceType = xacDinhLoaiThietBiTuUserAgent(userAgent);
  if (isLikelyBot(userAgent)) {
    return { created: false, reason: "bot_user_agent" };
  }

  const dedupSince = new Date(now.getTime() - DEDUP_WINDOW_MS);
  const recent = await db.pageVisit.findFirst({
    where: {
      pathname,
      visitedAt: { gte: dedupSince },
      OR: [
        ...(visitorKey ? [{ visitorKey }] : []),
        ...(sessionKey ? [{ sessionKey }] : []),
      ],
    },
    orderBy: { visitedAt: "desc" },
    select: { id: true, visitedAt: true },
  });

  if (recent) {
    return { created: false, reason: "duplicate_window" };
  }

  await db.pageVisit.create({
    data: {
      pathname,
      referrer,
      visitedAt: now,
      ip,
      userAgent,
      deviceType,
      visitorKey,
      sessionKey,
    },
  });

  return { created: true };
}
