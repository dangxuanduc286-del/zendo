import { NextResponse } from "next/server";
import { z } from "zod";
import type { AffiliatePixelConnectionStatus, AffiliatePixelProvider } from "@prisma/client";
import {
  applyAnalyticsRateLimit,
  isAffiliateAuthErr,
  rateLimitRetryAfter,
  requireActiveAffiliateProfileId,
} from "../../analytics/_shared";
import { TRACKING_PIXEL_PROVIDERS, upsertAffiliatePixelIntegration } from "@/lib/affiliate-tracking-center";

const patchSchema = z.object({
  provider: z.enum(["TIKTOK_PIXEL", "META_PIXEL", "GA4", "GTM"]),
  status: z.enum(["DISCONNECTED", "PENDING", "CONNECTED", "ERROR"]),
  externalPixelId: z.string().max(120).optional().nullable(),
});

/** GET: danh sách provider cố định (client có thể merge với overview). */
export async function GET(): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  return NextResponse.json({ ok: true as const, data: { providers: [...TRACKING_PIXEL_PROVIDERS] } });
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const auth = await requireActiveAffiliateProfileId();
  if (isAffiliateAuthErr(auth)) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });

  const rl = await applyAnalyticsRateLimit({ key: `trk:px:${auth.customerId}`, windowMs: 60_000, max: 20 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Bạn cập nhật quá nhanh. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rateLimitRetryAfter(rl)) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "JSON không hợp lệ." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Payload không hợp lệ.", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await upsertAffiliatePixelIntegration({
      affiliateProfileId: auth.affiliateProfileId,
      provider: parsed.data.provider as AffiliatePixelProvider,
      status: parsed.data.status as AffiliatePixelConnectionStatus,
      externalPixelId: parsed.data.externalPixelId ?? null,
    });
    return NextResponse.json({ ok: true as const });
  } catch {
    return NextResponse.json({ ok: false, message: "Không lưu được cấu hình pixel." }, { status: 500 });
  }
}
