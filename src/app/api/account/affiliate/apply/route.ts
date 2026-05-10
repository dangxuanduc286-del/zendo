import { NextResponse } from "next/server";
import type { AffiliateApplicationStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";

const MAX_FULLNAME = 200;
const MAX_PHONE = 40;
const MAX_SOCIAL = 500;
const MAX_NOTE = 4000;
const MAX_TRAFFIC_SOURCE = 120;
const MAX_SELLING_CATEGORIES = 300;
const MAX_FOLLOWER_COUNT = 100_000_000;
const MAX_SCORE_REASON_LEN = 450;
const MAX_QUICK_REVIEW_LEN = 400;

const ALLOWED_POST_KEYS = new Set([
  "fullName",
  "phone",
  "email",
  "socialLink",
  "note",
  "trafficSource",
  "followerCount",
  "sellingCategories",
]);

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isReasonablePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 14;
}

function safeHttpUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol === "http:" || u.protocol === "https:") return t;
    return null;
  } catch {
    return null;
  }
}

export type AffiliateApplicationPublicPayload = {
  status: AffiliateApplicationStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  trafficSource: string | null;
  followerCount: number | null;
  sellingCategories: string | null;
};

function serializePublicApplication(row: {
  status: AffiliateApplicationStatus;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  trafficSource: string | null;
  followerCount: number | null;
  sellingCategories: string | null;
}): AffiliateApplicationPublicPayload {
  return {
    status: row.status,
    adminNote: row.adminNote ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    trafficSource: row.trafficSource?.trim() ? row.trafficSource.trim() : null,
    followerCount: row.followerCount ?? null,
    sellingCategories: row.sellingCategories?.trim() ? row.sellingCategories.trim() : null,
  };
}

function parseOptionalFollowerCount(raw: unknown): { ok: true; value: number | null } | { ok: false; message: string } {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  if (typeof raw === "string") {
    const t = raw.trim();
    if (t === "") return { ok: true, value: null };
    if (!/^\d+$/.test(t)) {
      return { ok: false, message: "Số người theo dõi phải là số nguyên không âm." };
    }
    const n = Number(t);
    if (n > MAX_FOLLOWER_COUNT) {
      return { ok: false, message: "Số người theo dõi vượt giới hạn cho phép." };
    }
    return { ok: true, value: n };
  }
  if (typeof raw === "number") {
    if (!Number.isInteger(raw) || raw < 0) {
      return { ok: false, message: "Số người theo dõi phải là số nguyên không âm." };
    }
    if (raw > MAX_FOLLOWER_COUNT) {
      return { ok: false, message: "Số người theo dõi vượt giới hạn cho phép." };
    }
    return { ok: true, value: raw };
  }
  return { ok: false, message: "Số người theo dõi không hợp lệ." };
}

function computeCtvApplicationScore(input: {
  followerCount: number | null;
  socialUrlPresent: boolean;
  trafficNonEmpty: boolean;
  sellingNonEmpty: boolean;
  noteLen: number;
}): { score: number; scoreReason: string; quickReviewNote: string } {
  const bits: string[] = [];
  let total = 0;
  const n =
    input.followerCount == null || !Number.isFinite(input.followerCount) || input.followerCount < 0
      ? 0
      : Math.min(Math.floor(input.followerCount), MAX_FOLLOWER_COUNT);
  if (n >= 10_000) {
    total += 40;
    bits.push("Theo dõi ≥10k:+40");
  } else if (n >= 2000) {
    total += 30;
    bits.push("Theo dõi 2k–10k:+30");
  } else if (n >= 500) {
    total += 20;
    bits.push("Theo dõi 500–2k:+20");
  } else {
    total += 10;
    bits.push("Theo dõi 0–499:+10");
  }
  if (input.socialUrlPresent) {
    total += 15;
    bits.push("URL MXH:+15");
  }
  if (input.trafficNonEmpty) {
    total += 15;
    bits.push("Nguồn traffic:+15");
  }
  if (input.sellingNonEmpty) {
    total += 15;
    bits.push("Ngành hàng:+15");
  }
  if (input.noteLen >= 30) {
    total += 15;
    bits.push("Kế hoạch ≥30 ký tự:+15");
  }
  const score = Math.max(0, Math.min(100, total));
  let scoreReason = bits.join(" · ");
  if (scoreReason.length > MAX_SCORE_REASON_LEN) {
    scoreReason = `${scoreReason.slice(0, MAX_SCORE_REASON_LEN - 1)}…`;
  }
  const quickReviewNote = `Điểm ${score}: ${bits.slice(0, 5).join("; ")}`.slice(0, MAX_QUICK_REVIEW_LEN);
  return { score, scoreReason, quickReviewNote };
}

const applicationPublicSelect = {
  status: true,
  adminNote: true,
  createdAt: true,
  updatedAt: true,
  trafficSource: true,
  followerCount: true,
  sellingCategories: true,
} as const;

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    return NextResponse.json({ ok: false, message: "Chỉ tài khoản khách đã đăng nhập được thực hiện." }, { status: 401 });
  }

  try {
    const row = await db.affiliateApplication.findFirst({
      where: { customerId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: applicationPublicSelect,
    });

    return NextResponse.json({
      ok: true,
      application: row ? serializePublicApplication(row) : null,
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Không đọc được trạng thái yêu cầu." }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    return NextResponse.json({ ok: false, message: "Chỉ tài khoản khách đã đăng nhập được thực hiện." }, { status: 401 });
  }

  const customerId = session.user.id;

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  for (const key of Object.keys(payload)) {
    if (!ALLOWED_POST_KEYS.has(key)) {
      return NextResponse.json(
        { ok: false, message: `Trường không được phép: ${key}.` },
        { status: 400 },
      );
    }
  }

  const fullNameRaw = typeof payload.fullName === "string" ? payload.fullName.trim() : "";
  const phoneRaw = typeof payload.phone === "string" ? payload.phone.trim() : "";
  const emailRaw = typeof payload.email === "string" ? payload.email.trim() : "";
  const socialRaw = typeof payload.socialLink === "string" ? payload.socialLink.trim() : "";
  const noteRaw = typeof payload.note === "string" ? payload.note.trim() : "";
  const trafficRaw = typeof payload.trafficSource === "string" ? payload.trafficSource.trim() : "";
  const sellingRaw = typeof payload.sellingCategories === "string" ? payload.sellingCategories.trim() : "";

  const parsedFollower = parseOptionalFollowerCount(payload.followerCount);
  if (parsedFollower.ok === false) {
    return NextResponse.json({ ok: false, message: parsedFollower.message }, { status: 400 });
  }
  const followerSaved = parsedFollower.value;

  if (trafficRaw.length > MAX_TRAFFIC_SOURCE) {
    return NextResponse.json(
      { ok: false, message: `Nguồn traffic tối đa ${MAX_TRAFFIC_SOURCE} ký tự.` },
      { status: 400 },
    );
  }
  if (sellingRaw.length > MAX_SELLING_CATEGORIES) {
    return NextResponse.json(
      { ok: false, message: `Ngành hàng tối đa ${MAX_SELLING_CATEGORIES} ký tự.` },
      { status: 400 },
    );
  }

  if (!fullNameRaw || fullNameRaw.length > MAX_FULLNAME) {
    return NextResponse.json({ ok: false, message: "Họ và tên là bắt buộc (tối đa 200 ký tự)." }, { status: 400 });
  }
  if (!phoneRaw || phoneRaw.length > MAX_PHONE || !isReasonablePhone(phoneRaw)) {
    return NextResponse.json({ ok: false, message: "Số điện thoại là bắt buộc và không hợp lệ." }, { status: 400 });
  }

  let socialSaved: string | null = null;
  if (socialRaw) {
    if (socialRaw.length > MAX_SOCIAL) {
      return NextResponse.json({ ok: false, message: "Liên kết mạng xã hội quá dài." }, { status: 400 });
    }
    const okUrl = safeHttpUrl(socialRaw);
    if (!okUrl) {
      return NextResponse.json({ ok: false, message: "Liên kết mạng xã hội phải là URL http(s)." }, { status: 400 });
    }
    socialSaved = okUrl;
  }

  const noteSaved: string | null = noteRaw.length > 0 ? noteRaw : null;
  if (noteSaved && noteSaved.length > MAX_NOTE) {
    return NextResponse.json({ ok: false, message: "Ghi chú quá dài." }, { status: 400 });
  }

  const trafficSaved = trafficRaw.length > 0 ? trafficRaw : null;
  const sellingSaved = sellingRaw.length > 0 ? sellingRaw : null;

  const customerRecord = await db.customer.findUnique({
    where: { id: customerId },
    select: { email: true },
  });

  let resolvedEmail: string | null = null;
  if (emailRaw) {
    if (!isValidEmail(emailRaw)) {
      return NextResponse.json({ ok: false, message: "Email không hợp lệ." }, { status: 400 });
    }
    resolvedEmail = emailRaw.toLowerCase();
  } else {
    const fromSession =
      typeof session.user.email === "string" ? session.user.email.trim().toLowerCase() : "";
    const fromDb = customerRecord?.email?.trim().toLowerCase() ?? "";
    resolvedEmail = fromSession || fromDb || null;
  }

  if (!resolvedEmail) {
    return NextResponse.json(
      { ok: false, message: "Vui lòng nhập email (tài khoản chưa có email)." },
      { status: 400 },
    );
  }

  const activeAff = await db.affiliateProfile.findFirst({
    where: { customerId, status: "ACTIVE" },
    select: { id: true },
  });
  if (activeAff) {
    return NextResponse.json({ ok: true, outcome: "already_ctv_active" as const });
  }

  const pendingExisting = await db.affiliateApplication.findFirst({
    where: { customerId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: applicationPublicSelect,
  });

  if (pendingExisting) {
    return NextResponse.json({
      ok: true,
      outcome: "pending_exists",
      application: serializePublicApplication(pendingExisting),
    });
  }

  const { score, scoreReason, quickReviewNote } = computeCtvApplicationScore({
    followerCount: followerSaved,
    socialUrlPresent: Boolean(socialSaved),
    trafficNonEmpty: Boolean(trafficSaved),
    sellingNonEmpty: Boolean(sellingSaved),
    noteLen: noteSaved?.length ?? 0,
  });

  try {
    const created = await db.affiliateApplication.create({
      data: {
        customerId,
        fullName: fullNameRaw,
        phone: phoneRaw,
        email: resolvedEmail,
        socialLink: socialSaved,
        note: noteSaved,
        trafficSource: trafficSaved,
        followerCount: followerSaved,
        sellingCategories: sellingSaved,
        quickReviewNote,
        score,
        scoreReason,
        status: "PENDING",
      },
      select: { id: true, ...applicationPublicSelect },
    });

    const publicPart = serializePublicApplication(created);

    return NextResponse.json(
      {
        ok: true,
        outcome: "created" as const,
        application: {
          id: created.id,
          ...publicPart,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ ok: false, message: "Không gửi được yêu cầu." }, { status: 500 });
  }
}
