import "server-only";

import type { ConversionDispatchProvider } from "@prisma/client";
import type { ConversionDispatchContext, ConversionDispatchResult, ConversionProviderAdapter } from "./conversion-provider-adapter";

function graphVersion(): string {
  return (process.env.META_CAPI_GRAPH_VERSION ?? "v21.0").replace(/^v/, "v").trim() || "v21.0";
}

function clip(s: string, n: number): string {
  return s.replace(/access_token=[^&]+/gi, "access_token=***").slice(0, n);
}

/**
 * Meta Conversions API — `/{pixel-id}/events`.
 * @see https://developers.facebook.com/docs/marketing-api/conversions-api/using-the-api
 */
export class MetaConversionAdapter implements ConversionProviderAdapter {
  readonly provider: ConversionDispatchProvider = "META";

  async sendPurchase(ctx: ConversionDispatchContext): Promise<ConversionDispatchResult> {
    const t0 = Date.now();
    const eventName = "Purchase";
    const ver = graphVersion();
    const url = new URL(`https://graph.facebook.com/${ver}/${encodeURIComponent(ctx.pixelId)}/events`);
    url.searchParams.set("access_token", ctx.accessToken);

    const user_data: Record<string, unknown> = {};
    if (ctx.customerEmailHash) user_data.em = [ctx.customerEmailHash];
    if (ctx.customerPhoneHash) user_data.ph = [ctx.customerPhoneHash];
    if (ctx.fbclid) user_data.fbc = `fb.1.${ctx.eventTimeSec * 1000}.${ctx.fbclid.slice(0, 200)}`;

    const payload: Record<string, unknown> = {
      data: [
        {
          event_name: eventName,
          event_time: ctx.eventTimeSec,
          event_id: ctx.eventId,
          action_source: "website",
          user_data,
          custom_data: {
            currency: ctx.currency,
            value: ctx.value,
            content_ids: ctx.contentIds,
          },
        },
      ],
    };
    if (ctx.testEventCode) {
      (payload as { test_event_code?: string }).test_event_code = ctx.testEventCode;
    }

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const latencyMs = Date.now() - t0;
    const text = await res.text();
    return {
      ok: res.ok,
      httpStatus: res.status,
      latencyMs,
      providerEventName: eventName,
      responseSnippet: clip(text, 480),
    };
  }
}
