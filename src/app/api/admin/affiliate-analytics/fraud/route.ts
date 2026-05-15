import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rangeStart } from "@/lib/affiliate-analytics";
import { scanAffiliateFraudSignals } from "@/lib/affiliate-fraud-detection";
import {
  adminAffiliateRateLimitRetryAfter,
  applyAdminAffiliateAnalyticsRateLimit,
  isAdminAffiliateAuthErr,
  requireAdminAffiliateAnalyticsSession,
} from "../_shared";

const rangeSchema = z.enum(["today", "7d", "30d", "month"]);
const severitySchema = z.enum(["ALL", "low", "medium", "high"]);

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireAdminAffiliateAnalyticsSession();
  if (isAdminAffiliateAuthErr(auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }

  const rl = applyAdminAffiliateAnalyticsRateLimit({
    adminId: auth.adminId,
    suffix: "aff:fraud",
    windowMs: 15_000,
    max: 20,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(adminAffiliateRateLimitRetryAfter(rl)) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const range = rangeSchema.safeParse(searchParams.get("range") ?? undefined).success
    ? rangeSchema.parse(searchParams.get("range") ?? undefined)
    : "7d";
  const severity = severitySchema.safeParse(searchParams.get("severity") ?? undefined).success
    ? severitySchema.parse(searchParams.get("severity") ?? undefined)
    : "ALL";
  const q = (searchParams.get("q") ?? "").trim().slice(0, 80).toLowerCase();

  const since = rangeStart(range);

  try {
    const scan = await scanAffiliateFraudSignals({
      db,
      since,
      maxAffiliates: 60,
      maxSessions: 40,
      maxIps: 40,
    });

    const filterSev = <T extends { severity: string }>(rows: T[]): T[] => {
      if (severity === "ALL") return rows;
      return rows.filter((r) => r.severity === severity);
    };

    const affiliates = filterSev(scan.affiliates).filter((a) => {
      if (!q) return true;
      return (
        a.refCode.toLowerCase().includes(q) ||
        (a.displayName?.toLowerCase().includes(q) ?? false) ||
        a.affiliateProfileId.toLowerCase().includes(q)
      );
    });
    const suspiciousSessions = filterSev(scan.suspiciousSessions).filter((s) => {
      if (!q) return true;
      return s.sessionId.toLowerCase().includes(q) || s.refCode.toLowerCase().includes(q);
    });
    const suspiciousIps = filterSev(scan.suspiciousIps).filter((i) => {
      if (!q) return true;
      return i.ip.toLowerCase().includes(q);
    });

    return NextResponse.json(
      {
        ok: true,
        range,
        severity,
        counts: scan.counts,
        affiliates,
        suspiciousSessions,
        suspiciousIps,
      },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, message: "Không tải được dữ liệu fraud." }, { status: 500 });
  }
}
