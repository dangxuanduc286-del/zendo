"use client";

import type { DealsMetricsContext } from "./metrics";

function isValidKey(v: string): boolean {
  return Boolean(v && v.length >= 3 && v.length <= 128);
}

export function validateDealsMetricsPayload(args: {
  eventName: string;
  ctx: DealsMetricsContext;
}): { ok: true } | { ok: false; warnings: string[] } {
  const warnings: string[] = [];
  const campaignId = (args.ctx.campaignId || "").trim();
  const sessionId = (args.ctx.sessionId || "").trim();
  const visitorId = (args.ctx.visitorId || "").trim();

  if (!campaignId) warnings.push("missing campaignId");
  if (!isValidKey(sessionId)) warnings.push("invalid sessionId");
  if (!isValidKey(visitorId)) warnings.push("invalid visitorId");
  if (warnings.length === 0) return { ok: true };

  return { ok: false, warnings };
}

