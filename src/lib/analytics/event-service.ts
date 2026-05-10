import { xacDinhLoaiThietBiTuUserAgent } from "./device-type";
import type { DuLieuSuKienAnalytics, TenSuKienAnalytics } from "./event-types";
import { runRemarketingHook } from "./remarketing";
import { layCauHinhTrackingAnalytics } from "./tracking-settings";
import {
  chuanHoaPathname,
  chuanHoaReferrer,
  xacDinhLandingPathAnToan,
} from "./source";

const ENTITY_ANALYTICS_EVENT = "ANALYTICS_EVENT";

type ChienLuocDedup = "none" | "cuaSoNgan" | "orderId";

function layChienLuocDedup(eventName: TenSuKienAnalytics): ChienLuocDedup {
  if (eventName === "submit_order" || eventName === "paid_order") return "orderId";
  if (eventName === "product_view" || eventName === "begin_checkout" || eventName === "page_view")
    return "cuaSoNgan";
  return "none";
}

function layCuaSoDedupTheoGiay(eventName: TenSuKienAnalytics): number {
  if (eventName === "product_view") return 20;
  if (eventName === "begin_checkout") return 15;
  if (eventName === "page_view") return 5;
  return 0;
}

function taoAction(eventName: TenSuKienAnalytics): string {
  return `event:${eventName}`;
}

function metadataChuaGiaTri(metadata: unknown, key: string, expected: string): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  const raw = (metadata as Record<string, unknown>)[key];
  return typeof raw === "string" && raw === expected;
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

export async function ghiSuKienAnalytics(
  input: DuLieuSuKienAnalytics & {
    ipAddress?: string | null;
    userAgent?: string | null;
  },
): Promise<{ created: boolean; reason?: string }> {
  const db = await getDbClient();
  if (!db) return { created: false, reason: "missing_db" };
  const trackingSettings = await layCauHinhTrackingAnalytics();
  if (!trackingSettings.trackingEnabled) {
    return { created: false, reason: "tracking_disabled" };
  }

  const eventName = input.eventName;
  const pathname = chuanHoaPathname(input.pathname);
  const referrer = chuanHoaReferrer(input.referrer);
  const visitorKey = input.visitorKey?.trim() || null;
  const sessionKey = input.sessionKey?.trim() || null;
  const orderId = input.orderId?.trim() || null;
  const productId = input.productId?.trim() || null;
  const deviceType =
    input.deviceType ?? xacDinhLoaiThietBiTuUserAgent(input.userAgent);
  const landingPath = xacDinhLandingPathAnToan(input.landingPath, pathname);
  const dedupStrategy = layChienLuocDedup(eventName);
  const now = new Date();

  if (dedupStrategy === "orderId" && orderId) {
    const existedRows = await db.auditLog.findMany({
      where: {
        entity: ENTITY_ANALYTICS_EVENT,
        action: taoAction(eventName),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, metadata: true },
    });
    const duplicatedOrder = existedRows.some((row) =>
      metadataChuaGiaTri(row.metadata, "orderId", orderId),
    );
    if (duplicatedOrder) {
      return { created: false, reason: "duplicate_order" };
    }
  }

  if (dedupStrategy === "cuaSoNgan") {
    const windowSeconds = layCuaSoDedupTheoGiay(eventName);
    if (windowSeconds > 0) {
      const threshold = new Date(now.getTime() - windowSeconds * 1000);
      const recent = await db.auditLog.findMany({
        where: {
          entity: ENTITY_ANALYTICS_EVENT,
          action: taoAction(eventName),
          createdAt: { gte: threshold },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, metadata: true },
      });

      const duplicated = recent.some((row) => {
        if (!row.metadata || typeof row.metadata !== "object" || Array.isArray(row.metadata)) return false;
        const meta = row.metadata as Record<string, unknown>;
        const oldPathname = typeof meta.pathname === "string" ? meta.pathname : "";
        const oldVisitor = typeof meta.visitorKey === "string" ? meta.visitorKey : "";
        const oldSession = typeof meta.sessionKey === "string" ? meta.sessionKey : "";
        const oldProductId = typeof meta.productId === "string" ? meta.productId : "";
        const sameIdentity =
          (visitorKey && oldVisitor && oldVisitor === visitorKey) ||
          (sessionKey && oldSession && oldSession === sessionKey);
        const samePath = oldPathname === pathname;
        const sameProduct = eventName !== "product_view" || oldProductId === (productId ?? "");
        return sameIdentity && samePath && sameProduct;
      });

      if (duplicated) {
        return { created: false, reason: "duplicate_window" };
      }
    }
  }

  const metadata = {
    pathname,
    productId,
    orderId,
    visitorKey,
    sessionKey,
    referrer,
    deviceType,
    landingPath,
    ...input.metadata,
  };

  await db.auditLog.create({
    data: {
      action: taoAction(eventName),
      entity: ENTITY_ANALYTICS_EVENT,
      metadata: JSON.parse(JSON.stringify(metadata)),
      ipAddress: input.ipAddress?.slice(0, 120) ?? null,
      userAgent: input.userAgent?.slice(0, 1000) ?? null,
    },
  });
  runRemarketingHook(
    {
      eventName,
      pathname,
      productId,
      orderId,
      visitorKey,
      sessionKey,
      referrer,
      deviceType,
      landingPath,
      metadata: input.metadata ?? null,
    },
    {
      source: "server",
      enabled: trackingSettings.remarketingEventsEnabled,
    },
  );

  return { created: true };
}

