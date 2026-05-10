"use client";

import { useEffect, useRef } from "react";

export default function DealsPreviewAutoRefresh({
  enabled,
  intervalMs = 2500,
}: {
  enabled: boolean;
  intervalMs?: number;
}): null {
  const lastUpdatedAt = useRef<string>("");
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    const tick = async () => {
      if (stopped || !enabledRef.current) return;
      try {
        const res = await fetch("/api/admin/settings/deals-draft", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as unknown;
        const obj = json && typeof json === "object" ? (json as Record<string, unknown>) : null;
        const updatedAt = obj?.updatedAt ? String(obj.updatedAt) : "";
        if (!updatedAt) return;
        if (!lastUpdatedAt.current) {
          lastUpdatedAt.current = updatedAt;
          return;
        }
        if (updatedAt !== lastUpdatedAt.current) {
          lastUpdatedAt.current = updatedAt;
          window.location.reload();
        }
      } catch {
        // ignore
      }
    };
    const id = window.setInterval(() => {
      void tick();
    }, intervalMs);
    void tick();
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [enabled, intervalMs]);

  return null;
}

