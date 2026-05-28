"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAffiliateCtvRuntimeActive } from "@/hooks/use-affiliate-ctv-runtime-active";
import type { AffiliateTrackingStreamTickV1 } from "@/lib/affiliate-tracking-stream-types";

const STREAM_URL = "/api/affiliate/tracking/stream";

export type AffiliateTrackingSseStatus = "idle" | "connecting" | "live" | "error" | "unsupported";

export function useAffiliateTrackingSse(args: {
  enabled: boolean;
  /** Coalesce high-frequency ticks (ms). */
  flushMs?: number;
  onTickBatch: (ticks: AffiliateTrackingStreamTickV1[]) => void;
}): {
  status: AffiliateTrackingSseStatus;
  reconnectCount: number;
  lastHeartbeatAt: number | null;
} {
  const flushMs = args.flushMs ?? 280;
  const runtimeActive = useAffiliateCtvRuntimeActive();
  const [status, setStatus] = useState<AffiliateTrackingSseStatus>("idle");
  const [reconnectCount, setReconnectCount] = useState(0);
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<number | null>(null);
  const [reconnectToken, setReconnectToken] = useState(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const queueRef = useRef<AffiliateTrackingStreamTickV1[]>([]);
  const flushTimerRef = useRef<number | null>(null);
  const onBatchRef = useRef(args.onTickBatch);
  onBatchRef.current = args.onTickBatch;

  const flush = useCallback(() => {
    if (flushTimerRef.current) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    const batch = queueRef.current;
    queueRef.current = [];
    if (batch.length) onBatchRef.current(batch);
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      flush();
    }, flushMs);
  }, [flush, flushMs]);

  useEffect(() => {
    if (!args.enabled) {
      setStatus("idle");
      return;
    }
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      setStatus("unsupported");
      return;
    }
    if (!runtimeActive) {
      return;
    }

    let es: EventSource | null = null;
    let closed = false;
    setStatus("connecting");

    try {
      es = new EventSource(STREAM_URL, { withCredentials: true });
    } catch {
      setStatus("unsupported");
      return;
    }

    es.addEventListener("open", () => {
      if (closed) return;
      setStatus("live");
    });

    es.addEventListener("ready", () => {
      if (closed) return;
      setStatus("live");
    });

    es.addEventListener("tick", (ev) => {
      if (closed) return;
      try {
        const data = JSON.parse((ev as MessageEvent).data as string) as AffiliateTrackingStreamTickV1;
        if (data?.v === 1) {
          queueRef.current.push(data);
          scheduleFlush();
        }
      } catch {
        /* ignore */
      }
    });

    es.addEventListener("heartbeat", (ev) => {
      try {
        const raw = JSON.parse((ev as MessageEvent).data as string) as { t?: number };
        if (typeof raw.t === "number") setLastHeartbeatAt(raw.t);
      } catch {
        setLastHeartbeatAt(Date.now());
      }
    });

    es.onerror = () => {
      if (closed) return;
      setStatus("error");
      setReconnectCount((n) => n + 1);
      try {
        es?.close();
      } catch {
        /* ignore */
      }
      es = null;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        if (closed) return;
        setReconnectToken((n) => n + 1);
      }, 3500);
    };

    return () => {
      closed = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (flushTimerRef.current) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      flush();
      try {
        es?.close();
      } catch {
        /* ignore */
      }
      es = null;
      setStatus("idle");
    };
  }, [args.enabled, runtimeActive, flush, scheduleFlush, reconnectToken]);

  return { status, reconnectCount, lastHeartbeatAt };
}
