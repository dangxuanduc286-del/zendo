import "server-only";

import type { PrismaClient } from "@prisma/client";

export type AffiliateFraudSeverity = "low" | "medium" | "high";

export type AffiliateFraudAffiliateRow = {
  affiliateProfileId: string;
  refCode: string;
  displayName: string | null;
  severity: AffiliateFraudSeverity;
  signals: string[];
  clicks: number;
  paidOrders: number;
  ctrApprox: number;
};

export type AffiliateFraudSessionRow = {
  sessionId: string;
  affiliateProfileId: string;
  refCode: string;
  clickCount: number;
  firstAt: string;
  lastAt: string;
  severity: AffiliateFraudSeverity;
};

export type AffiliateFraudIpRow = {
  ip: string;
  clickCount: number;
  affiliateProfileCount: number;
  severity: AffiliateFraudSeverity;
};

export type AffiliateFraudScanResult = {
  since: string;
  affiliates: AffiliateFraudAffiliateRow[];
  suspiciousSessions: AffiliateFraudSessionRow[];
  suspiciousIps: AffiliateFraudIpRow[];
  counts: { high: number; medium: number; low: number };
};

function classifyFromSignals(signals: string[]): AffiliateFraudSeverity {
  const hasHigh =
    signals.some((s) => s.includes("IP")) ||
    signals.some((s) => s.includes("phiên")) ||
    signals.some((s) => s.includes("spike"));
  if (hasHigh) return "high";
  if (signals.length >= 2) return "medium";
  if (signals.length === 1) return "low";
  return "low";
}

export async function scanAffiliateFraudSignals(args: {
  db: PrismaClient;
  since: Date;
  maxAffiliates: number;
  maxSessions: number;
  maxIps: number;
}): Promise<AffiliateFraudScanResult> {
  const since = args.since;

  const ipRows = await args.db.$queryRaw<
    { ip: string; clickCount: bigint; affiliateProfileCount: bigint }[]
  >`
    SELECT
      COALESCE(e.metadata->>'ip', '') AS ip,
      COUNT(*)::bigint AS "clickCount",
      COUNT(DISTINCT e."affiliateProfileId")::bigint AS "affiliateProfileCount"
    FROM "AffiliateTrafficEvent" e
    WHERE e."createdAt" >= ${since}
      AND e."eventType" = 'AFFILIATE_CLICK'
      AND COALESCE(e.metadata->>'ip', '') <> ''
    GROUP BY 1
    HAVING COUNT(*) >= 180
    ORDER BY "clickCount" DESC
    LIMIT ${args.maxIps}
  `;

  const sessionRows = await args.db.$queryRaw<
    { sessionId: string; affiliateProfileId: string; clickCount: bigint; firstAt: Date; lastAt: Date }[]
  >`
    SELECT
      e."sessionId" AS "sessionId",
      e."affiliateProfileId" AS "affiliateProfileId",
      COUNT(*)::bigint AS "clickCount",
      MIN(e."createdAt") AS "firstAt",
      MAX(e."createdAt") AS "lastAt"
    FROM "AffiliateTrafficEvent" e
    WHERE e."createdAt" >= ${since}
      AND e."eventType" = 'AFFILIATE_CLICK'
      AND e."sessionId" IS NOT NULL
    GROUP BY e."sessionId", e."affiliateProfileId"
    HAVING COUNT(*) >= 90
    ORDER BY "clickCount" DESC
    LIMIT ${args.maxSessions}
  `;

  const metricRows = await args.db.$queryRaw<
    {
      affiliateProfileId: string;
      clicks: bigint;
      paid: bigint;
    }[]
  >`
    SELECT
      e."affiliateProfileId" AS "affiliateProfileId",
      SUM(CASE WHEN e."eventType" = 'AFFILIATE_CLICK' THEN 1 ELSE 0 END)::bigint AS clicks,
      SUM(CASE WHEN e."eventType" = 'ORDER_PAID' THEN 1 ELSE 0 END)::bigint AS paid
    FROM "AffiliateTrafficEvent" e
    WHERE e."createdAt" >= ${since}
    GROUP BY e."affiliateProfileId"
    HAVING SUM(CASE WHEN e."eventType" = 'AFFILIATE_CLICK' THEN 1 ELSE 0 END) >= 400
    ORDER BY clicks DESC
    LIMIT ${Math.max(args.maxAffiliates, 80)}
  `;

  const affiliateIds = Array.from(
    new Set([
      ...metricRows.map((r) => String(r.affiliateProfileId)),
      ...sessionRows.map((r) => String(r.affiliateProfileId)),
    ]),
  );

  const profiles = affiliateIds.length
    ? await args.db.affiliateProfile.findMany({
        where: { id: { in: affiliateIds } },
        select: {
          id: true,
          refCode: true,
          customer: { select: { fullName: true } },
        },
      })
    : [];

  const profileMap = new Map(
    profiles.map((p) => [p.id, { refCode: p.refCode, displayName: p.customer?.fullName ?? null }]),
  );

  const suspiciousIps: AffiliateFraudIpRow[] = ipRows
    .filter((r) => r.ip)
    .map((r) => {
      const clickCount = Number(r.clickCount);
      const affiliateProfileCount = Number(r.affiliateProfileCount);
      const severity: AffiliateFraudSeverity =
        clickCount >= 600 || affiliateProfileCount >= 4 ? "high" : clickCount >= 300 ? "medium" : "low";
      return { ip: String(r.ip), clickCount, affiliateProfileCount, severity };
    });

  const suspiciousSessions: AffiliateFraudSessionRow[] = sessionRows.map((r) => {
    const clickCount = Number(r.clickCount);
    const prof = profileMap.get(String(r.affiliateProfileId));
    const severity: AffiliateFraudSeverity = clickCount >= 200 ? "high" : clickCount >= 120 ? "medium" : "low";
    return {
      sessionId: String(r.sessionId),
      affiliateProfileId: String(r.affiliateProfileId),
      refCode: prof?.refCode ?? "",
      clickCount,
      firstAt: r.firstAt.toISOString(),
      lastAt: r.lastAt.toISOString(),
      severity,
    };
  });

  const spikeRows = await args.db.$queryRaw<{ affiliateProfileId: string; prevHour: bigint; last5m: bigint }[]>`
    SELECT
      e."affiliateProfileId" AS "affiliateProfileId",
      SUM(CASE
        WHEN e."createdAt" >= NOW() - interval '65 minutes'
         AND e."createdAt" < NOW() - interval '5 minutes'
        THEN 1 ELSE 0 END)::bigint AS "prevHour",
      SUM(CASE
        WHEN e."createdAt" >= NOW() - interval '5 minutes'
        THEN 1 ELSE 0 END)::bigint AS "last5m"
    FROM "AffiliateTrafficEvent" e
    WHERE e."createdAt" >= ${since}
      AND e."eventType" = 'ORDER_PAID'
    GROUP BY e."affiliateProfileId"
    HAVING SUM(CASE
        WHEN e."createdAt" >= NOW() - interval '65 minutes'
         AND e."createdAt" < NOW() - interval '5 minutes'
        THEN 1 ELSE 0 END) >= 2
       AND SUM(CASE
        WHEN e."createdAt" >= NOW() - interval '5 minutes'
        THEN 1 ELSE 0 END)
        >= 3 * SUM(CASE
        WHEN e."createdAt" >= NOW() - interval '65 minutes'
         AND e."createdAt" < NOW() - interval '5 minutes'
        THEN 1 ELSE 0 END)
    LIMIT 40
  `;
  const spikeSet = new Set(spikeRows.map((r) => String(r.affiliateProfileId)));

  const affiliates: AffiliateFraudAffiliateRow[] = [];

  for (const row of metricRows) {
    const clicks = Number(row.clicks);
    const paidOrders = Number(row.paid);
    const ctrApprox = clicks > 0 ? paidOrders / clicks : 0;
    const signals: string[] = [];
    if (clicks >= 2500 && paidOrders === 0) {
      signals.push("Rất nhiều click nhưng không có đơn thanh toán (có thể spam click).");
    }
    if (clicks >= 800 && paidOrders <= 1 && ctrApprox < 0.0008) {
      signals.push("CTR cực thấp so với lưu lượng (có thể bot / traffic kém chất lượng).");
    }
    if (clicks >= 1200 && paidOrders >= 1 && ctrApprox > 0.35) {
      signals.push("Tỷ lệ chuyển đổi bất thường cao (kiểm tra spike / gian lận đơn).");
    }
    if (spikeSet.has(String(row.affiliateProfileId))) {
      signals.push("Spike chuyển đổi đột biến trong khung 5 phút so với giờ trước.");
    }

    if (!signals.length) continue;

    const prof = profileMap.get(String(row.affiliateProfileId));
    const severity = classifyFromSignals(signals);
    affiliates.push({
      affiliateProfileId: String(row.affiliateProfileId),
      refCode: prof?.refCode ?? "",
      displayName: prof?.displayName ?? null,
      severity,
      signals,
      clicks,
      paidOrders,
      ctrApprox,
    });
  }

  let high = 0;
  let medium = 0;
  let low = 0;
  const bump = (s: AffiliateFraudSeverity) => {
    if (s === "high") high += 1;
    else if (s === "medium") medium += 1;
    else low += 1;
  };
  affiliates.forEach((a) => bump(a.severity));
  suspiciousSessions.forEach((s) => bump(s.severity));
  suspiciousIps.forEach((i) => bump(i.severity));

  affiliates.sort((a, b) => {
    const rank = (s: AffiliateFraudSeverity) => (s === "high" ? 2 : s === "medium" ? 1 : 0);
    return rank(b.severity) - rank(a.severity) || b.clicks - a.clicks;
  });

  return {
    since: since.toISOString(),
    affiliates: affiliates.slice(0, args.maxAffiliates),
    suspiciousSessions: suspiciousSessions.slice(0, args.maxSessions),
    suspiciousIps: suspiciousIps.slice(0, args.maxIps),
    counts: { high, medium, low },
  };
}
