import { NextResponse } from "next/server";
import { compare } from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PrecheckBody = { identifier?: string; password?: string; attemptId?: string };

export async function POST(request: Request): Promise<Response> {
  let body: PrecheckBody | null = null;
  try {
    body = (await request.json()) as PrecheckBody;
  } catch {
    body = null;
  }

  const identifierRaw = String(body?.identifier ?? "").trim();
  const password = String(body?.password ?? "");
  const attemptId = String(body?.attemptId ?? "").trim();

  if (!identifierRaw || !password) {
    return NextResponse.json(
      { ok: false, reason: "MISSING_FIELDS" as const },
      { status: 200 },
    );
  }

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

  try {
    const dbModule = await import("../../../../../lib/db");
    const db = dbModule.db;

    // Nếu identifier thuộc tài khoản quản trị, trả reason riêng để UI hướng dẫn đúng trang admin.
    const allowedAdminRoles = new Set(["SUPER_ADMIN", "CONTENT_MANAGER", "ADMIN"]);
    try {
      const adminAccount = await db.admin.findFirst({
        where: {
          status: "ACTIVE",
          role: { name: { in: Array.from(allowedAdminRoles) } },
          OR: [
            { email: identifier },
            { username: identifierRaw },
            { username: identifier },
            ...(phoneCandidates.length > 0 ? [{ username: { in: phoneCandidates } }] : []),
          ],
        },
        select: { id: true },
      });
      if (adminAccount?.id) {
        void attemptId;
        return NextResponse.json({ ok: false, reason: "ADMIN_ACCOUNT" as const }, { status: 200 });
      }
    } catch {
      // ignore: nếu query admin lỗi, vẫn tiếp tục precheck customer để không chặn login khách.
    }

    const customer = await db.customer.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: { in: phoneCandidates } }],
      },
      select: { id: true, passwordHash: true },
    });

    if (!customer?.passwordHash) {
      void attemptId;
      return NextResponse.json({ ok: false, reason: "INVALID_CREDENTIALS" as const }, { status: 200 });
    }

    const isValid = await compare(password, customer.passwordHash);
    if (!isValid) {
      void attemptId;
      return NextResponse.json({ ok: false, reason: "INVALID_CREDENTIALS" as const }, { status: 200 });
    }

    void attemptId;
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    void error;
    void attemptId;
    // Luồng UX: vẫn trả 200 để không "đỏ console", nhưng báo lý do INTERNAL để UI show message phù hợp.
    return NextResponse.json({ ok: false, reason: "INTERNAL" as const }, { status: 200 });
  }
}

