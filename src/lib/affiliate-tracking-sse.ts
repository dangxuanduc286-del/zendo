import "server-only";

import { randomUUID } from "node:crypto";
import Redis from "ioredis";
import type { AffiliateTrackingStreamChannel, AffiliateTrackingStreamTickV1 } from "@/lib/affiliate-tracking-stream-types";

const BUS_PSUB_PATTERN = "zendo:bus:tracking.*";

let activeSseConnections = 0;
let sseReconnectHints = 0;

export function getAffiliateTrackingSseMetrics(): {
  activeConnections: number;
  reconnectHintsTotal: number;
} {
  return { activeConnections: activeSseConnections, reconnectHintsTotal: sseReconnectHints };
}

export function noteAffiliateTrackingSseReconnectHint(): void {
  sseReconnectHints += 1;
}

function channelFromRedisTopic(topic: string): AffiliateTrackingStreamChannel | null {
  const prefix = "zendo:bus:";
  if (!topic.startsWith(prefix)) return null;
  const ch = topic.slice(prefix.length);
  if (
    ch === "tracking.received" ||
    ch === "tracking.persisted" ||
    ch === "tracking.converted" ||
    ch === "tracking.attributed" ||
    ch === "tracking.attribution_resolved" ||
    ch === "tracking.conversion_dispatch" ||
    ch === "tracking.realtime" ||
    ch === "fraud.alert"
  ) {
    return ch;
  }
  return null;
}

function inferSink(args: {
  channel: AffiliateTrackingStreamChannel;
  trafficEventType: string | null | undefined;
}): AffiliateTrackingStreamTickV1["sink"] {
  if (args.channel === "tracking.received") return "pipeline";
  if (args.channel === "tracking.converted") return "conversion";
  if (args.channel === "tracking.attributed" || args.channel === "tracking.attribution_resolved") {
    return "attribution";
  }
  if (args.channel === "fraud.alert") return "pulse";
  if (args.channel === "tracking.persisted" || args.channel === "tracking.realtime") {
    const t = args.trafficEventType ?? "";
    /** ORDER_PAID also emits `tracking.converted` — conversion counts use that channel only. */
    if (t === "ORDER_PAID" || t === "CHECKOUT_COMPLETED") return "pulse";
    return "traffic";
  }
  return "pulse";
}

/**
 * Parse Redis PUBLISH payload and drop events for other affiliates / malformed JSON.
 * Strips orderId, sessionId, trafficEventId (never sent to browser).
 */
export function normalizeRedisTrackingMessageForStream(args: {
  affiliateProfileId: string;
  channel: AffiliateTrackingStreamChannel;
  rawMessage: string;
}): AffiliateTrackingStreamTickV1 | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(args.rawMessage) as Record<string, unknown>;
  } catch {
    return null;
  }
  const owner = typeof parsed.affiliateProfileId === "string" ? parsed.affiliateProfileId : null;
  if (!owner || owner !== args.affiliateProfileId) return null;

  const ts = typeof parsed._ts === "number" ? parsed._ts : Date.now();
  const trafficEventType =
    typeof parsed.eventType === "string"
      ? parsed.eventType
      : typeof (parsed as { trafficEventType?: unknown }).trafficEventType === "string"
        ? String((parsed as { trafficEventType?: string }).trafficEventType)
        : null;
  const pathname = typeof parsed.pathname === "string" ? parsed.pathname.slice(0, 512) : null;

  return {
    v: 1,
    channel: args.channel,
    ts,
    trafficEventType,
    pathname,
    sink: inferSink({ channel: args.channel, trafficEventType }),
  };
}

function redisUrl(): string | null {
  const u = process.env.REDIS_URL?.trim();
  return u && u.length > 0 ? u : null;
}

function sseEncode(event: string, data: unknown): Uint8Array {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  const text = `event: ${event}\ndata: ${payload}\n\n`;
  return new TextEncoder().encode(text);
}

/**
 * Long-lived SSE body: optional Redis PSUBSCRIBE bridge + heartbeat until abort.
 */
export function createAffiliateTrackingSseResponse(args: {
  affiliateProfileId: string;
  signal: AbortSignal;
  /** Client hint: Last-Event-ID from EventSource (reconnect). Logged only for now. */
  lastEventId: string | null;
}): Response {
  const connectionId = randomUUID();
  const url = redisUrl();

  let cleanupRef: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      if (args.signal.aborted) {
        try {
          controller.close();
        } catch {
          /* ignore */
        }
        return;
      }

      let cleaned = false;
      let sub: Redis | null = null;
      let heartbeat: ReturnType<typeof setInterval> | null = null;
      let droppedMalformed = 0;

      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        if (sub) {
          try {
            sub.disconnect();
          } catch {
            /* ignore */
          }
          sub = null;
        }
        activeSseConnections = Math.max(0, activeSseConnections - 1);
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      };

      cleanupRef = cleanup;

      activeSseConnections += 1;

      const send = (event: string, data: unknown) => {
        if (cleaned) return;
        try {
          controller.enqueue(sseEncode(event, data));
        } catch {
          cleanup();
        }
      };

      send("ready", { v: 1, redis: Boolean(url), connectionId, lastEventId: args.lastEventId } satisfies {
        v: 1;
        redis: boolean;
        connectionId: string;
        lastEventId: string | null;
      });

      args.signal.addEventListener("abort", () => cleanup(), { once: true });

      heartbeat = setInterval(() => {
        send("heartbeat", { t: Date.now(), connectionId });
      }, 18_000);

      if (!url) {
        return;
      }

      try {
        sub = new Redis(url, {
          maxRetriesPerRequest: null,
          enableReadyCheck: true,
          lazyConnect: true,
        });
        await sub.connect().catch(() => {});
        await sub.psubscribe(BUS_PSUB_PATTERN);

        const onPMessage = (_pat: string, channel: string, message: string) => {
          const ch = channelFromRedisTopic(channel);
          if (!ch) return;
          const tick = normalizeRedisTrackingMessageForStream({
            affiliateProfileId: args.affiliateProfileId,
            channel: ch,
            rawMessage: message,
          });
          if (!tick) {
            droppedMalformed += 1;
            if (droppedMalformed % 50 === 1) {
              send("meta", { kind: "drop_malformed_or_foreign", count: droppedMalformed, connectionId });
            }
            return;
          }
          send("tick", tick);
        };

        sub.on("pmessage", onPMessage);
        sub.on("error", () => {
          send("meta", { kind: "redis_sub_error", connectionId });
        });
      } catch {
        send("meta", { kind: "redis_subscribe_failed", connectionId });
      }
    },
    cancel() {
      cleanupRef?.();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
