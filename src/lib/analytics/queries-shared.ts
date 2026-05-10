import type { Prisma } from "@prisma/client";
import type { KhoangThoiGianAnalytics } from "./date-range";
import type { TenSuKienAnalytics } from "./event-types";

const ENTITY_ANALYTICS_EVENT = "ANALYTICS_EVENT";

interface DuLieuEventAnalytics {
  id: string;
  action: string;
  createdAt: Date;
  metadata: Prisma.JsonValue | null;
}

export interface BanGhiEventAnalytics {
  id: string;
  createdAt: Date;
  pathname: string;
  productId: string | null;
  orderId: string | null;
  visitorKey: string | null;
  sessionKey: string | null;
  referrer: string | null;
  deviceType: string | null;
  landingPath: string | null;
}

function docString(metadata: Prisma.JsonValue | null, key: string): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export async function getDbClientAnalytics() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../db");
    return dbModule.db;
  } catch {
    return null;
  }
}

export async function layDanhSachEventTheoKhoang(
  eventName: TenSuKienAnalytics,
  khoang: KhoangThoiGianAnalytics,
): Promise<BanGhiEventAnalytics[]> {
  const db = await getDbClientAnalytics();
  if (!db) return [];

  const rows = (await db.auditLog.findMany({
    where: {
      entity: ENTITY_ANALYTICS_EVENT,
      action: `event:${eventName}`,
      createdAt: { gte: khoang.batDau, lt: khoang.ketThuc },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      action: true,
      createdAt: true,
      metadata: true,
    },
  })) as DuLieuEventAnalytics[];

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    pathname: docString(row.metadata, "pathname") ?? "/",
    productId: docString(row.metadata, "productId"),
    orderId: docString(row.metadata, "orderId"),
    visitorKey: docString(row.metadata, "visitorKey"),
    sessionKey: docString(row.metadata, "sessionKey"),
    referrer: docString(row.metadata, "referrer"),
    deviceType: docString(row.metadata, "deviceType"),
    landingPath: docString(row.metadata, "landingPath"),
  }));
}

export async function layDanhSachEventTheoDenMoc(
  eventName: TenSuKienAnalytics,
  mocKetThuc: Date,
): Promise<BanGhiEventAnalytics[]> {
  const db = await getDbClientAnalytics();
  if (!db) return [];

  const rows = (await db.auditLog.findMany({
    where: {
      entity: ENTITY_ANALYTICS_EVENT,
      action: `event:${eventName}`,
      createdAt: { lt: mocKetThuc },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      action: true,
      createdAt: true,
      metadata: true,
    },
  })) as DuLieuEventAnalytics[];

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    pathname: docString(row.metadata, "pathname") ?? "/",
    productId: docString(row.metadata, "productId"),
    orderId: docString(row.metadata, "orderId"),
    visitorKey: docString(row.metadata, "visitorKey"),
    sessionKey: docString(row.metadata, "sessionKey"),
    referrer: docString(row.metadata, "referrer"),
    deviceType: docString(row.metadata, "deviceType"),
    landingPath: docString(row.metadata, "landingPath"),
  }));
}

export function taoIdentityKhachThamQuan(
  row: Pick<BanGhiEventAnalytics, "visitorKey" | "sessionKey">,
): string | null {
  if (row.visitorKey) return `v:${row.visitorKey}`;
  if (row.sessionKey) return `s:${row.sessionKey}`;
  return null;
}

