import { randomBytes, createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  identifier: z.string().trim().min(3).max(120),
});

const GENERIC_MESSAGE =
  "Nếu tài khoản tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi.";

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function resolveBaseUrl(): string {
  const isVercelRuntime = Boolean(
    process.env.VERCEL || process.env.VERCEL_URL || process.env.VERCEL_ENV,
  );
  if (!isVercelRuntime) return "http://localhost:3000";
  return process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "https://zendo.vn";
}

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  }

  let db: (typeof import("../../../../../lib/db"))["db"] | null = null;
  try {
    const dbModule = await import("../../../../../lib/db");
    db = dbModule.db;
  } catch (error) {
    console.error("[PASSWORD_RESET] cannot load database client", error);
    return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  }

  const identifierRaw = parsed.data.identifier.trim();
  const identifier = identifierRaw.toLowerCase();
  const normalizedPhone = identifierRaw.replace(/[^\d+]/g, "");
  const phoneCandidates = Array.from(
    new Set(
      [
        normalizedPhone,
        normalizedPhone.startsWith("+84") ? `0${normalizedPhone.slice(3)}` : null,
        normalizedPhone.startsWith("84") ? `0${normalizedPhone.slice(2)}` : null,
      ].filter((value): value is string => Boolean(value)),
    ),
  );
  const orConditions: Array<{ email: string } | { phone: string } | { phone: { in: string[] } }> = [
    { email: identifier },
    { phone: identifierRaw },
    { phone: identifier },
  ];
  if (phoneCandidates.length > 0) {
    orConditions.push({ phone: { in: phoneCandidates } });
  }

  const customer = await db.customer.findFirst({
    where: {
      OR: orConditions,
      isGuest: false,
    },
    select: { id: true, email: true, phone: true },
  });

  if (!customer) {
    return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await db.customerPasswordResetToken.create({
    data: {
      customerId: customer.id,
      tokenHash,
      expiresAt,
    },
  });

  const baseUrl = resolveBaseUrl();
  const resetUrl = `${baseUrl}/dat-lai-mat-khau?token=${encodeURIComponent(rawToken)}`;
  void resetUrl;

  return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
}
