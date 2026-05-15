import "server-only";

import type { ConversionDispatchProvider } from "@prisma/client";
import type { ConversionDispatchContext, ConversionDispatchResult, ConversionProviderAdapter } from "./conversion-provider-adapter";

function clip(s: string, n: number): string {
  const t = s.replace(/access_token=[^&]+/gi, "access_token=***").slice(0, n);
  return t;
}

/**
 * TikTok Events API (server) — consolidated `event/track` endpoint.
 * @see https://ads.tiktok.com/help/article/events-api
 */
export class TikTokConversionAdapter implements ConversionProviderAdapter {
  readonly provider: ConversionDispatchProvider = "TIKTOK";

  async sendPurchase(ctx: ConversionDispatchContext): Promise<ConversionDispatchResult> {
    const t0 = Date.now();
    const eventName = "CompletePayment";
    const user: Record<string, unknown> = {};
    if (ctx.customerEmailHash) user.email = ctx.customerEmailHash;
    if (ctx.customerPhoneHash) user.phone = ctx.customerPhoneHash;

    const ev: Record<string, unknown> = {
      event: eventName,
      event_id: ctx.eventId,
      timestamp: new Date(ctx.eventTimeSec * 1000).toISOString(),
      properties: {
        currency: ctx.currency,
        value: ctx.value,
        content_type: "product",
        contents: ctx.contentIds.map((id) => ({ content_id: id })),
      },
    };
    if (Object.keys(user).length) ev.user = user;
    if (ctx.ttclid) {
      ev.context = { ad: { callback: ctx.ttclid.slice(0, 512) } };
    }

    const body: Record<string, unknown> = {
      event_source: "web",
      event_source_id: ctx.pixelId,
      data: [ev],
    };
    if (ctx.testEventCode) body.test_event_code = ctx.testEventCode;

    const res = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": ctx.accessToken,
      },
      body: JSON.stringify(body),
    });
    const latencyMs = Date.now() - t0;
    const text = await res.text();
    let ok = res.ok;
    if (ok) {
      try {
        const j = JSON.parse(text) as { code?: number; message?: string };
        if (typeof j.code === "number" && j.code !== 0) ok = false;
      } catch {
        /* non-JSON body */
      }
    }
    return {
      ok,
      httpStatus: res.status,
      latencyMs,
      providerEventName: eventName,
      responseSnippet: clip(text, 480),
    };
  }
}
