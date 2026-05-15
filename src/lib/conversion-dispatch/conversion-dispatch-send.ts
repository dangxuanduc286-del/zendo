import "server-only";

import type { ConversionDispatchProvider, PrismaClient } from "@prisma/client";
import { AFFILIATE_TRACKING_BUS_CHANNELS, publishAffiliateTrackingBusEvent } from "@/lib/affiliate-event-bus";
import { MetaConversionAdapter } from "./meta-conversion-adapter";
import { TikTokConversionAdapter } from "./tiktok-conversion-adapter";
import type { ConversionDispatchContext } from "./conversion-provider-adapter";
import { hashNormalizedEmail, hashNormalizedPhoneDigits } from "./conversion-dispatch-hash";

function publishCapiDispatchTick(args: {
  affiliateProfileId: string;
  provider: ConversionDispatchProvider;
  outcome: "SENT" | "FAIL" | "SKIP" | "DLQ";
  httpStatus: number | null;
}): void {
  const p = args.provider === "TIKTOK" ? "TIKTOK" : "META";
  void publishAffiliateTrackingBusEvent(AFFILIATE_TRACKING_BUS_CHANNELS.conversionDispatch, {
    affiliateProfileId: args.affiliateProfileId,
    eventType: `CAPI_${p}_${args.outcome}`,
    pathname: args.httpStatus != null ? `http_${args.httpStatus}` : null,
  });
}

function pickAccessToken(cfg: unknown, provider: "TIKTOK" | "META"): string | null {
  if (!cfg || typeof cfg !== "object") return null;
  const o = cfg as Record<string, unknown>;
  const direct =
    provider === "META"
      ? typeof o.metaAccessToken === "string"
        ? o.metaAccessToken
        : typeof o.accessToken === "string"
          ? o.accessToken
          : null
      : typeof o.tiktokAccessToken === "string"
        ? o.tiktokAccessToken
        : typeof o.accessToken === "string"
          ? o.accessToken
          : null;
  return direct?.trim().slice(0, 800) || null;
}

function pickTestEventCode(cfg: unknown): string | null {
  if (!cfg || typeof cfg !== "object") return null;
  const o = cfg as Record<string, unknown>;
  const v = typeof o.testEventCode === "string" ? o.testEventCode : typeof o.capiTestEventCode === "string" ? o.capiTestEventCode : null;
  return v?.trim().slice(0, 64) || null;
}

async function extractClickIds(args: {
  db: PrismaClient;
  affiliateProfileId: string;
  sessionId: string | null;
}): Promise<{ ttclid: string | null; fbclid: string | null }> {
  if (!args.sessionId) return { ttclid: null, fbclid: null };
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await args.db.affiliateTrafficEvent.findMany({
    where: {
      affiliateProfileId: args.affiliateProfileId,
      sessionId: args.sessionId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { metadata: true },
  });
  let ttclid: string | null = null;
  let fbclid: string | null = null;
  for (const r of rows) {
    const m = (r.metadata ?? {}) as Record<string, unknown>;
    if (!ttclid && typeof m.ttclid === "string") ttclid = m.ttclid.trim().slice(0, 512) || null;
    if (!fbclid && typeof m.fbclid === "string") fbclid = m.fbclid.trim().slice(0, 512) || null;
    if (ttclid && fbclid) break;
  }
  return { ttclid, fbclid };
}

export async function processConversionDispatchJob(args: {
  db: PrismaClient;
  dispatchJobId: string;
  bullAttempt: number;
  bullMaxAttempts: number;
}): Promise<{ ok: boolean }> {
  if (process.env.AFFILIATE_CAPI_DISPATCH === "0") {
    const j = await args.db.conversionDispatchJob.findUnique({
      where: { id: args.dispatchJobId },
      select: { affiliateProfileId: true, provider: true },
    });
    await args.db.conversionDispatchJob.update({
      where: { id: args.dispatchJobId },
      data: { status: "SKIPPED", lastError: "AFFILIATE_CAPI_DISPATCH=0", processedAt: new Date() },
    });
    if (j) publishCapiDispatchTick({ affiliateProfileId: j.affiliateProfileId, provider: j.provider, outcome: "SKIP", httpStatus: null });
    return { ok: true };
  }

  const job = await args.db.conversionDispatchJob.findUnique({
    where: { id: args.dispatchJobId },
    include: {
      order: {
        select: {
          id: true,
          totalAmount: true,
          paidAt: true,
          createdAt: true,
          customerEmail: true,
          customerPhone: true,
          items: { select: { productId: true }, take: 40 },
        },
      },
    },
  });
  if (!job) return { ok: false };
  if (job.status === "SENT" || job.status === "SKIPPED" || job.status === "DUPLICATE") return { ok: true };

  const summary = (job.payloadSummary ?? {}) as Record<string, unknown>;
  const sessionId = typeof summary.sessionId === "string" ? summary.sessionId : null;

  const pixelProvider =
    job.provider === "TIKTOK" ? ("TIKTOK_PIXEL" as const) : job.provider === "META" ? ("META_PIXEL" as const) : null;
  if (!pixelProvider) {
    await args.db.conversionDispatchJob.update({
      where: { id: job.id },
      data: { status: "SKIPPED", lastError: "unsupported_provider", processedAt: new Date() },
    });
    publishCapiDispatchTick({ affiliateProfileId: job.affiliateProfileId, provider: job.provider, outcome: "SKIP", httpStatus: null });
    return { ok: true };
  }

  const integration = await args.db.affiliatePixelIntegration.findUnique({
    where: {
      affiliateProfileId_provider: { affiliateProfileId: job.affiliateProfileId, provider: pixelProvider },
    },
  });
  if (!integration || integration.status !== "CONNECTED") {
    await args.db.conversionDispatchJob.update({
      where: { id: job.id },
      data: { status: "SKIPPED", lastError: "pixel_not_connected", processedAt: new Date() },
    });
    publishCapiDispatchTick({ affiliateProfileId: job.affiliateProfileId, provider: job.provider, outcome: "SKIP", httpStatus: null });
    return { ok: true };
  }

  const accessToken = pickAccessToken(integration.config, job.provider === "TIKTOK" ? "TIKTOK" : "META");
  const pixelId = integration.externalPixelId?.trim();
  if (!accessToken || !pixelId) {
    await args.db.conversionDispatchJob.update({
      where: { id: job.id },
      data: { status: "SKIPPED", lastError: "missing_token_or_pixel_id", processedAt: new Date() },
    });
    publishCapiDispatchTick({ affiliateProfileId: job.affiliateProfileId, provider: job.provider, outcome: "SKIP", httpStatus: null });
    return { ok: true };
  }

  const order = job.order;
  const value = Number(order.totalAmount);
  const eventTimeSec = Math.floor((order.paidAt ?? order.createdAt).getTime() / 1000);
  const contentIds = order.items.map((i) => i.productId).filter((x): x is string => Boolean(x));

  const { ttclid, fbclid } =
    summary.ttclid != null || summary.fbclid != null
      ? {
          ttclid: typeof summary.ttclid === "string" ? summary.ttclid : null,
          fbclid: typeof summary.fbclid === "string" ? summary.fbclid : null,
        }
      : await extractClickIds({
          db: args.db,
          affiliateProfileId: job.affiliateProfileId,
          sessionId,
        });

  const ctx: ConversionDispatchContext = {
    provider: job.provider,
    pixelId,
    accessToken,
    testEventCode: pickTestEventCode(integration.config),
    orderId: job.orderId,
    eventTimeSec,
    eventId: job.dedupeKey.slice(0, 120),
    currency: "VND",
    value: Number.isFinite(value) ? value : 0,
    contentIds,
    customerEmailHash: hashNormalizedEmail(order.customerEmail),
    customerPhoneHash: hashNormalizedPhoneDigits(order.customerPhone),
    ttclid,
    fbclid,
  };

  await args.db.conversionDispatchJob.update({
    where: { id: job.id },
    data: { status: "PROCESSING", attempts: { increment: 1 } },
  });

  const adapter = job.provider === "TIKTOK" ? new TikTokConversionAdapter() : new MetaConversionAdapter();
  const providerEventFallback = job.provider === "TIKTOK" ? "CompletePayment" : "Purchase";
  let result;
  try {
    result = await adapter.sendPurchase(ctx);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const toDlq = args.bullAttempt >= args.bullMaxAttempts - 1;
    await args.db.conversionDispatchJob.update({
      where: { id: job.id },
      data: {
        status: toDlq ? "DLQ" : "FAILED",
        lastError: msg.slice(0, 500),
        httpStatus: null,
        latencyMs: null,
        processedAt: toDlq ? new Date() : null,
      },
    });
    await args.db.conversionProviderEvent.create({
      data: {
        dispatchJobId: job.id,
        provider: job.provider,
        providerEventName: providerEventFallback,
        httpStatus: null,
        ok: false,
        latencyMs: 0,
        responseSnippet: msg.slice(0, 480),
      },
    });
    publishCapiDispatchTick({
      affiliateProfileId: job.affiliateProfileId,
      provider: job.provider,
      outcome: toDlq ? "DLQ" : "FAIL",
      httpStatus: null,
    });
    return { ok: false };
  }

  await args.db.conversionProviderEvent.create({
    data: {
      dispatchJobId: job.id,
      provider: job.provider,
      providerEventName: result.providerEventName,
      httpStatus: result.httpStatus,
      ok: result.ok,
      latencyMs: result.latencyMs,
      responseSnippet: result.responseSnippet,
    },
  });

  if (result.ok) {
    await args.db.conversionDispatchJob.update({
      where: { id: job.id },
      data: {
        status: "SENT",
        httpStatus: result.httpStatus,
        latencyMs: result.latencyMs,
        lastError: null,
        processedAt: new Date(),
      },
    });
    publishCapiDispatchTick({
      affiliateProfileId: job.affiliateProfileId,
      provider: job.provider,
      outcome: "SENT",
      httpStatus: result.httpStatus,
    });
    return { ok: true };
  }

  const toDlq = args.bullAttempt >= args.bullMaxAttempts - 1;
  await args.db.conversionDispatchJob.update({
    where: { id: job.id },
    data: {
      status: toDlq ? "DLQ" : "FAILED",
      httpStatus: result.httpStatus,
      latencyMs: result.latencyMs,
      lastError: result.responseSnippet?.slice(0, 500) ?? `http_${result.httpStatus}`,
      processedAt: toDlq ? new Date() : null,
    },
  });
  publishCapiDispatchTick({
    affiliateProfileId: job.affiliateProfileId,
    provider: job.provider,
    outcome: toDlq ? "DLQ" : "FAIL",
    httpStatus: result.httpStatus,
  });
  return { ok: false };
}
