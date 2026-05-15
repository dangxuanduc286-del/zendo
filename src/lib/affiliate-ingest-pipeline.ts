import "server-only";

import { Buffer } from "node:buffer";
import { performance } from "node:perf_hooks";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sanitizeAffiliateTrackMetadata } from "@/lib/affiliate-analytics-payload";
import { evaluateAffiliateBotSignals } from "@/lib/affiliate-bot-filter";
import { AFFILIATE_TRACKING_BUS_CHANNELS, publishAffiliateTrackingBusEvent } from "@/lib/affiliate-event-bus";
import { affiliateTrafficDedupeWindowMs } from "@/lib/affiliate-event-dedupe";
import { affiliateTrackBodySchema, wasCampaignClickAlias } from "@/lib/affiliate-ingest-schema";
import {
  buildPersistJobV1,
  processAffiliateTrackPersistJob,
} from "@/lib/affiliate-tracking-ingest-persist";
import { logAffiliateTrackingIngest } from "@/lib/affiliate-tracking-center";
import {
  computeTrackingIngestIdempotencyKey,
  enqueueTrackingIngestJob,
  isAffiliateTrackingAsyncIngestEnabled,
} from "@/lib/affiliate-tracking-bullmq";
import { snapshotAffiliateTrackingFromRequest } from "@/lib/affiliate-tracking";
import { applySharedRateLimit } from "@/lib/rate-limit-shared";

export const AFFILIATE_TRACK_POST_ROUTE = "/api/affiliate/track";

const burstMap = new Map<string, number[]>();

function rateKey(ip: string | null, sessionId: string | null): string {
  return [ip || "noip", sessionId || "nosid"].join(":").slice(0, 220);
}

function applyBurstLimit(ip: string | null, nowMs: number, max: number): boolean {
  if (!ip) return true;
  const windowMs = 10_000;
  const arr = burstMap.get(ip) ?? [];
  const pruned = arr.filter((t) => nowMs - t < windowMs);
  if (pruned.length >= max) return false;
  pruned.push(nowMs);
  burstMap.set(ip, pruned);
  return true;
}


/** Preserve Set-Cookie from snapshot helper (session id) when returning a new JSON body. */
function jsonWithInboundCookies(base: NextResponse, data: unknown, init?: ResponseInit): NextResponse {
  const out = NextResponse.json(data, init);
  for (const c of base.cookies.getAll()) {
    out.cookies.set(c);
  }
  return out;
}

async function ingestLog(args: {
  affiliateProfileId: string | null;
  eventType: string | null;
  success: boolean;
  statusCode: number;
  ip: string | null;
  message: string | null;
  latencyMs: number;
  payloadBytes: number | null;
  eventCount?: number;
}): Promise<void> {
  await logAffiliateTrackingIngest({
    affiliateProfileId: args.affiliateProfileId,
    route: AFFILIATE_TRACK_POST_ROUTE,
    eventType: args.eventType,
    success: args.success,
    statusCode: args.statusCode,
    ip: args.ip,
    message: args.message,
    latencyMs: args.latencyMs,
    payloadBytes: args.payloadBytes,
    eventCount: args.eventCount ?? 1,
  });
}

/**
 * Public affiliate ingest — validate → normalize → rate limits → (async enqueue | sync persist).
 * Async path: enqueue BullMQ job + bus `tracking.received`, fast ACK; worker runs persist + attribution + realtime fan-out.
 */
export async function handleAffiliateTrackPost(request: Request): Promise<NextResponse> {
  const t0 = performance.now();
  const res = NextResponse.json({ ok: true });
  let affiliateProfileId: string | null = null;
  let payloadBytes: number | null = null;
  let eventLabel: string | null = null;
  let ipForLog: string | null = null;

  const finish = async (next: NextResponse, extra: { success: boolean; message: string | null }): Promise<NextResponse> => {
    const latencyMs = Math.round(performance.now() - t0);
    await ingestLog({
      affiliateProfileId,
      eventType: eventLabel,
      success: extra.success,
      statusCode: next.status,
      ip: ipForLog,
      message: extra.message,
      latencyMs,
      payloadBytes,
    });
    return next;
  };

  try {
    let rawText: string;
    try {
      rawText = await request.text();
    } catch {
      return finish(NextResponse.json({ ok: false, message: "Payload không đọc được." }, { status: 400 }), {
        success: false,
        message: "read_body_error",
      });
    }
    payloadBytes = Buffer.byteLength(rawText, "utf8");
    if (payloadBytes > 65_536) {
      return finish(NextResponse.json({ ok: false, message: "Payload quá lớn." }, { status: 413 }), {
        success: false,
        message: "payload_too_large",
      });
    }

    let raw: unknown;
    try {
      raw = JSON.parse(rawText) as unknown;
    } catch {
      return finish(NextResponse.json({ ok: false, message: "JSON không hợp lệ." }, { status: 400 }), {
        success: false,
        message: "json_parse_error",
      });
    }

    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      return finish(NextResponse.json({ ok: false, message: "Body phải là object." }, { status: 400 }), {
        success: false,
        message: "body_not_object",
      });
    }

    const campaignAlias = wasCampaignClickAlias(raw);
    const parsed = affiliateTrackBodySchema.safeParse(raw);
    if (!parsed.success) {
      return finish(NextResponse.json({ ok: false, message: "Dữ liệu tracking không hợp lệ." }, { status: 400 }), {
        success: false,
        message: "zod_validation",
      });
    }
    const v = parsed.data;
    eventLabel = v.eventType;

    const profile = await db.affiliateProfile.findFirst({
      where: { refCode: { equals: v.ref, mode: "insensitive" }, status: "ACTIVE" },
      select: { id: true, status: true },
    });
    if (!profile) {
      return finish(NextResponse.json({ ok: false, message: "Mã affiliate không hợp lệ." }, { status: 404 }), {
        success: false,
        message: "invalid_ref",
      });
    }
    affiliateProfileId = profile.id;

    const snap = await snapshotAffiliateTrackingFromRequest({
      pathname: v.pathname ?? null,
      referrer: v.referrer ?? null,
      utmSource: v.utm_source ?? null,
      subid: v.subid ?? null,
      responseForCookie: res,
    });

    const h = await headers();
    const ua = h.get("user-agent");
    ipForLog = snap.ip;
    const bot = evaluateAffiliateBotSignals({ userAgent: ua });
    if (!bot.shouldRecord) {
      return finish(NextResponse.json({ ok: true, skipped: "bot" }), { success: true, message: "bot_filtered" });
    }

    const nowMs = Date.now();
    const sessionId = snap.sessionId.trim().slice(0, 80) || null;

    const key = rateKey(snap.ip, sessionId);
    const rate = await applySharedRateLimit({ scope: "affiliate-track", key, windowMs: 60_000, max: 80 });
    if (rate.ok === false) {
      return finish(
        NextResponse.json(
          { ok: false, message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." },
          { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
        ),
        { success: false, message: "rate_limit_shared" },
      );
    }
    if (!applyBurstLimit(snap.ip, nowMs, 45)) {
      return finish(
        NextResponse.json({ ok: false, message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." }, { status: 429, headers: { "Retry-After": "10" } }),
        { success: false, message: "rate_limit_burst" },
      );
    }

    let revenue = v.revenue ?? null;
    let commission = v.commission ?? null;
    const orderId = v.orderId?.trim().slice(0, 64) || null;

    if (v.eventType === "ORDER_PAID" || v.eventType === "ORDER_CANCELLED" || v.eventType === "CHECKOUT_COMPLETED") {
      if (!orderId) {
        return finish(NextResponse.json({ ok: false, message: "Thiếu orderId cho sự kiện đơn hàng." }, { status: 400 }), {
          success: false,
          message: "missing_order_id",
        });
      }
      const order = await db.order.findFirst({
        where: { id: orderId, affiliateProfileId: profile.id },
        select: { id: true, paymentStatus: true, totalAmount: true, orderStatus: true },
      });
      if (!order) {
        return finish(NextResponse.json({ ok: false, message: "Đơn hàng không hợp lệ cho CTV này." }, { status: 403 }), {
          success: false,
          message: "order_forbidden",
        });
      }
      if (v.eventType === "ORDER_PAID" && order.paymentStatus !== "PAID") {
        return finish(NextResponse.json({ ok: false, message: "Đơn chưa thanh toán." }, { status: 400 }), {
          success: false,
          message: "order_not_paid",
        });
      }
      if (v.eventType === "ORDER_CANCELLED" && order.orderStatus !== "CANCELED") {
        return finish(NextResponse.json({ ok: false, message: "Trạng thái đơn không khớp." }, { status: 400 }), {
          success: false,
          message: "order_not_canceled",
        });
      }
      const commRow = await db.affiliateCommission.findUnique({
        where: { affiliateProfileId_orderId: { affiliateProfileId: profile.id, orderId } },
        select: { amount: true },
      });
      if (v.eventType === "ORDER_PAID") {
        revenue = Number(order.totalAmount);
        commission = commRow ? Number(commRow.amount) : 0;
      } else {
        revenue = revenue ?? Number(order.totalAmount);
        commission = commission ?? (commRow ? Number(commRow.amount) : null);
      }
    }

    const pathname = snap.pathname;
    const dedupeMs = affiliateTrafficDedupeWindowMs(v.eventType);
    const dupSince = new Date(nowMs - dedupeMs);
    const recentDup = await db.affiliateTrafficEvent.findFirst({
      where: {
        affiliateProfileId: profile.id,
        sessionId,
        eventType: v.eventType,
        productId: v.productId?.trim().slice(0, 64) || null,
        orderId,
        pathname,
        createdAt: { gte: dupSince },
      },
      select: { id: true },
    });
    if (recentDup) {
      return finish(res, { success: true, message: "dedupe_skip" });
    }

    const visitorKey = v.visitorKey?.trim().slice(0, 120) || null;
    let isReturningVisitor = false;
    if (visitorKey) {
      const prior = await db.affiliateClick.findFirst({
        where: { affiliateProfileId: profile.id, visitorKey },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      isReturningVisitor = Boolean(prior);
    }

    const safeMeta = sanitizeAffiliateTrackMetadata(v.metadata as Record<string, unknown> | null | undefined);
    if (bot.severity === "medium") {
      safeMeta.botSeverity = bot.severity;
      safeMeta.botReasons = bot.reasons;
    }
    if (isReturningVisitor) safeMeta.returningVisitor = true;
    if (campaignAlias) safeMeta.campaignClick = true;
    safeMeta.serverIngestAt = new Date().toISOString();
    safeMeta.affiliateRef = v.ref.slice(0, 64);
    if (v.utm_medium) safeMeta.utm_medium = v.utm_medium;
    if (v.utm_campaign) safeMeta.utm_campaign = v.utm_campaign;
    if (v.utm_term) safeMeta.utm_term = v.utm_term;
    if (v.utm_content) safeMeta.utm_content = v.utm_content;

    let resolvedTrackingLinkId: string | null = null;
    const rawTl = safeMeta.trackingLinkId;
    if (typeof rawTl === "string") {
      const tid = rawTl.trim().slice(0, 32);
      if (tid) {
        const tlRow = await db.affiliateTrackingLink.findFirst({
          where: { id: tid, affiliateProfileId: profile.id, isActive: true },
          select: { id: true },
        });
        if (tlRow) resolvedTrackingLinkId = tlRow.id;
      }
      delete safeMeta.trackingLinkId;
    }

    const snapJson = {
      sessionId: snap.sessionId,
      ip: snap.ip,
      country: snap.country,
      device: snap.device,
      browser: snap.browser,
      os: snap.os,
      referrer: snap.referrer,
      pathname: snap.pathname,
      utmSource: snap.utmSource,
      subid: snap.subid,
    };
    const idempotencyKey = computeTrackingIngestIdempotencyKey({
      affiliateProfileId: profile.id,
      eventType: v.eventType,
      sessionId,
      pathname: snap.pathname,
      productId: v.productId,
      orderId,
      nowMs,
    });
    const payload = buildPersistJobV1(
      {
        affiliateProfileId: profile.id,
        ref: v.ref,
        eventType: v.eventType,
        sessionId,
        visitorKey,
        productId: v.productId,
        orderId,
        revenue,
        commission,
        snap: snapJson,
        safeMeta,
        resolvedTrackingLinkId,
      },
      idempotencyKey,
    );

    if (isAffiliateTrackingAsyncIngestEnabled()) {
      try {
        const { jobId, deduped } = await enqueueTrackingIngestJob({ payload });
        void publishAffiliateTrackingBusEvent(AFFILIATE_TRACKING_BUS_CHANNELS.received, {
          affiliateProfileId: profile.id,
          idempotencyKey,
          jobId,
          deduped,
          eventType: v.eventType,
        });
        return finish(jsonWithInboundCookies(res, { ok: true, async: true, deduped, jobId }), {
          success: true,
          message: deduped ? "async_dedupe" : "async_queued",
        });
      } catch {
        /* async queue unavailable — fall through to sync persist */
      }
    }

    const persisted = await processAffiliateTrackPersistJob({ db, payload });
    return finish(jsonWithInboundCookies(res, { ok: true, async: false }), {
      success: true,
      message: persisted.mode === "dedupe_skip" ? "dedupe_skip" : "ok",
    });
  } catch {
    return finish(NextResponse.json({ ok: false, message: "Không thể ghi nhận tracking lúc này." }, { status: 500 }), {
      success: false,
      message: "exception",
    });
  }
}
