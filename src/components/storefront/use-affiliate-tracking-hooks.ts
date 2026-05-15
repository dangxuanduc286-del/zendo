"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDocumentVisibility } from "@/hooks/use-document-visibility";
import type { TrackingHealthDto, TrackingOverviewDto, TrackingRealtimeEventDto } from "@/lib/affiliate-tracking-center-types";

type Err = { ok: false; message: string };
type OkPayload<T> = { ok: true; data: T };

const POLL_MS = 22_000;

async function parseJson<T>(res: Response): Promise<OkPayload<T> | Err> {
  const j = (await res.json()) as unknown;
  if (!j || typeof j !== "object") return { ok: false, message: "Phản hồi không hợp lệ." };
  const o = j as { ok?: boolean; message?: string; data?: unknown };
  if (!o.ok) return { ok: false, message: typeof o.message === "string" ? o.message : "Lỗi API." };
  return { ok: true, data: o.data as T };
}

export function useAffiliateTrackingOverview(enabled: boolean): {
  data: TrackingOverviewDto | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [data, setData] = useState<TrackingOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const visible = useDocumentVisibility();
  const jsonRef = useRef<string>("");
  const dataRef = useRef<TrackingOverviewDto | null>(null);
  dataRef.current = data;

  const refetch = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!enabled || !visible) return;
    const ac = new AbortController();
    let cancelled = false;
    const inFlight = { current: false };
    const run = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      setLoading((v) => (dataRef.current ? false : v));
      try {
        const res = await fetch("/api/account/affiliate/tracking/overview", {
          credentials: "same-origin",
          signal: ac.signal,
        });
        if (cancelled || ac.signal.aborted) return;
        const parsed = await parseJson<TrackingOverviewDto>(res);
        if (cancelled || ac.signal.aborted) return;
        if (parsed.ok === false) {
          setError(parsed.message);
          setLoading(false);
          return;
        }
        const next = JSON.stringify(parsed.data);
        if (next !== jsonRef.current) {
          jsonRef.current = next;
          setData(parsed.data);
        }
        setError(null);
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === "AbortError")) return;
        if (!cancelled) setError("Không tải được dữ liệu.");
      } finally {
        inFlight.current = false;
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    const id = window.setInterval(run, POLL_MS);
    return () => {
      cancelled = true;
      ac.abort();
      window.clearInterval(id);
    };
  }, [enabled, visible, tick]);

  return { data, loading, error, refetch };
}

export function useAffiliateTrackingRealtime(enabled: boolean): {
  events: TrackingRealtimeEventDto[];
  loading: boolean;
  error: string | null;
  generatedAt: string | null;
} {
  const [events, setEvents] = useState<TrackingRealtimeEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const visible = useDocumentVisibility();
  const jsonRef = useRef<string>("");
  const eventsLenRef = useRef(0);
  eventsLenRef.current = events.length;

  useEffect(() => {
    if (!enabled || !visible) return;
    const ac = new AbortController();
    let cancelled = false;
    const inFlight = { current: false };
    const run = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      setLoading((v) => (eventsLenRef.current ? false : v));
      try {
        const res = await fetch("/api/account/affiliate/tracking/realtime?take=30", {
          credentials: "same-origin",
          signal: ac.signal,
        });
        if (cancelled || ac.signal.aborted) return;
        const parsed = await parseJson<{ events: TrackingRealtimeEventDto[]; generatedAt: string }>(res);
        if (cancelled || ac.signal.aborted) return;
        if (parsed.ok === false) {
          setError(parsed.message);
          setLoading(false);
          return;
        }
        const next = JSON.stringify(parsed.data.events);
        if (next !== jsonRef.current) {
          jsonRef.current = next;
          setEvents(parsed.data.events);
        }
        setGeneratedAt(parsed.data.generatedAt);
        setError(null);
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === "AbortError")) return;
        if (!cancelled) setError("Không tải được luồng sự kiện.");
      } finally {
        inFlight.current = false;
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    const id = window.setInterval(run, POLL_MS);
    return () => {
      cancelled = true;
      ac.abort();
      window.clearInterval(id);
    };
  }, [enabled, visible]);

  return { events, loading, error, generatedAt };
}

export function useAffiliateTrackingHealth(enabled: boolean): {
  data: TrackingHealthDto | null;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<TrackingHealthDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const visible = useDocumentVisibility();

  useEffect(() => {
    if (!enabled || !visible) return;
    const ac = new AbortController();
    let cancelled = false;
    const inFlight = { current: false };
    const run = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const res = await fetch("/api/account/affiliate/tracking/health", {
          credentials: "same-origin",
          signal: ac.signal,
        });
        if (cancelled || ac.signal.aborted) return;
        const parsed = await parseJson<TrackingHealthDto>(res);
        if (cancelled || ac.signal.aborted) return;
        if (parsed.ok === false) {
          setError(parsed.message);
          setLoading(false);
          return;
        }
        setData(parsed.data);
        setError(null);
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === "AbortError")) return;
        if (!cancelled) setError("Không tải được health.");
      } finally {
        inFlight.current = false;
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    const id = window.setInterval(run, POLL_MS * 2);
    return () => {
      cancelled = true;
      ac.abort();
      window.clearInterval(id);
    };
  }, [enabled, visible]);

  return { data, loading, error };
}

export type TrackingIngestLogRow = {
  id: string;
  route: string;
  eventType: string | null;
  success: boolean;
  statusCode: number;
  createdAt: string;
  message: string | null;
  latencyMs: number | null;
  payloadBytes: number | null;
  eventCount: number;
};

export function useAffiliateTrackingLogs(enabled: boolean): {
  rows: TrackingIngestLogRow[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [rows, setRows] = useState<TrackingIngestLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const visible = useDocumentVisibility();

  const refetch = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!enabled || !visible) return;
    const ac = new AbortController();
    let cancelled = false;
    const inFlight = { current: false };
    const run = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      setLoading(true);
      try {
        const res = await fetch("/api/account/affiliate/tracking/logs?take=25", {
          credentials: "same-origin",
          signal: ac.signal,
        });
        if (cancelled || ac.signal.aborted) return;
        const parsed = await parseJson<{ rows: TrackingIngestLogRow[]; nextCursor: string | null }>(res);
        if (cancelled || ac.signal.aborted) return;
        if (parsed.ok === false) {
          setError(parsed.message);
          return;
        }
        setRows(parsed.data.rows);
        setError(null);
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === "AbortError")) return;
        if (!cancelled) setError("Không tải được log.");
      } finally {
        inFlight.current = false;
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [enabled, visible, tick]);

  return { rows, loading, error, refetch };
}
