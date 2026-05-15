import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { enqueueConversionDispatchBullJob, isAffiliateConversionDispatchQueueEnabled } from "@/lib/affiliate-conversion-dispatch-bullmq";
import { createHash } from "node:crypto";
import { redisFraudIncrReplayAttempts15m, redisFraudReadReplayAttemptsCurrentWindow } from "@/lib/affiliate-fraud-redis";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../../analytics/_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  dispatchJobId: z.string().min(10).max(80),
  reason: z.string().max(120).optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  }
  const rl = await applyAnalyticsRateLimit({ key: `capi:replay:${auth.customerId}`, windowMs: 60_000, max: 12 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Quá nhanh." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  if (!isAffiliateConversionDispatchQueueEnabled()) {
    return NextResponse.json(
      { ok: false, message: "CAPI dispatch queue tắt (AFFILIATE_CAPI_DISPATCH=0 hoặc thiếu Redis/Bull)." },
      { status: 503 },
    );
  }

  const profileGate = await db.affiliateProfile.findUnique({
    where: { id: auth.affiliateProfileId },
    select: { fraudDispatchHoldUntil: true },
  });
  if (profileGate?.fraudDispatchHoldUntil && profileGate.fraudDispatchHoldUntil > new Date()) {
    return NextResponse.json(
      { ok: false, message: "Replay CAPI đang bị giữ (fraud dispatch hold)." },
      { status: 423 },
    );
  }
  const replayWindowCount = await redisFraudReadReplayAttemptsCurrentWindow({
    affiliateProfileId: auth.affiliateProfileId,
  });
  if (replayWindowCount >= 24) {
    return NextResponse.json(
      { ok: false, message: "Đã đạt giới hạn replay CAPI trong cửa sổ 15 phút." },
      { status: 429 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "JSON không hợp lệ." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Payload không hợp lệ." }, { status: 400 });
  }

  const old = await db.conversionDispatchJob.findFirst({
    where: { id: parsed.data.dispatchJobId, affiliateProfileId: auth.affiliateProfileId },
  });
  if (!old) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy job." }, { status: 404 });
  }
  if (old.status !== "FAILED" && old.status !== "DLQ") {
    return NextResponse.json(
      { ok: false, message: "Chỉ replay job FAILED hoặc DLQ." },
      { status: 400 },
    );
  }

  const dedupeKey = `${old.dedupeKey.slice(0, 120)}_rq${Date.now()}`.slice(0, 180);
  const fp = createHash("sha256").update(`replay|${old.id}|${dedupeKey}`).digest("hex").slice(0, 64);

  try {
    const job = await db.$transaction(async (tx) => {
      await tx.conversionReplayLog.create({
        data: {
          affiliateProfileId: auth.affiliateProfileId,
          orderId: old.orderId,
          provider: old.provider,
          reason: (parsed.data.reason ?? "replay_api").slice(0, 160),
          metadata: { sourceDispatchJobId: old.id } as object,
        },
      });
      return tx.conversionDispatchJob.create({
        data: {
          affiliateProfileId: old.affiliateProfileId,
          orderId: old.orderId,
          conversionMatchId: old.conversionMatchId,
          provider: old.provider,
          internalEvent: old.internalEvent,
          payloadFingerprint: fp,
          dedupeKey,
          status: "QUEUED",
          payloadSummary: (old.payloadSummary ?? {}) as object,
        },
      });
    });

    void redisFraudIncrReplayAttempts15m({ affiliateProfileId: auth.affiliateProfileId });

    try {
      await enqueueConversionDispatchBullJob({ dispatchJobId: job.id, dedupeKey });
    } catch {
      return NextResponse.json(
        {
          ok: false as const,
          message: "Đã tạo job nhưng không enqueue được (Redis/Bull).",
          newDispatchJobId: job.id,
          dedupeKey,
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true as const, newDispatchJobId: job.id, dedupeKey }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, message: "Không tạo được job replay." }, { status: 500 });
  }
}