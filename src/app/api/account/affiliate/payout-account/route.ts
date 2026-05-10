import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { publishAffiliatePayoutAccountSubmitted } from "@/lib/affiliate/customer-payout-notifications";

type PayoutStatus = "PENDING" | "APPROVED" | "REJECTED";

function maskAccountNumber(value: string): string {
  const raw = (value || "").replace(/\s+/g, "").trim();
  if (!raw) return "";
  if (raw.length <= 4) return raw;
  return `${"*".repeat(Math.min(8, raw.length - 4))}${raw.slice(-4)}`;
}

async function getActiveAffiliateProfileId(customerId: string): Promise<string | null> {
  const profile = await db.affiliateProfile.findFirst({
    where: { customerId, status: "ACTIVE" },
    select: { id: true },
  });
  return profile?.id ?? null;
}

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    return NextResponse.json({ ok: false, message: "Không xác thực." }, { status: 401 });
  }

  const profileId = await getActiveAffiliateProfileId(session.user.id);
  if (!profileId) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy hồ sơ CTV." }, { status: 404 });
  }

  const account = await db.affiliatePayoutAccount.findUnique({
    where: { affiliateProfileId: profileId },
    select: {
      id: true,
      bankName: true,
      bankAccountNumber: true,
      bankAccountHolder: true,
      verificationStatus: true,
      rejectionReason: true,
      verifiedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!account) {
    return NextResponse.json({ ok: true, exists: false });
  }

  const changeRows = await db.affiliatePayoutAccountChangeRequest.findMany({
    where: { payoutAccountId: account.id },
    orderBy: { requestedAt: "desc" },
    take: 15,
    select: {
      id: true,
      status: true,
      requestedAt: true,
      reviewedAt: true,
      rejectionReason: true,
      requestedBankName: true,
      requestedBankAccountNumber: true,
      requestedBankAccountHolder: true,
    },
  });

  return NextResponse.json({
    ok: true,
    exists: true,
    account: {
      id: account.id,
      bankName: account.bankName,
      bankAccountNumberMasked: maskAccountNumber(account.bankAccountNumber),
      bankAccountHolder: account.bankAccountHolder,
      verificationStatus: account.verificationStatus as PayoutStatus,
      rejectionReason: account.rejectionReason ?? "",
      verifiedAt: account.verifiedAt ? account.verifiedAt.toISOString() : null,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
      changeRequests: changeRows.map((c) => ({
        id: c.id,
        status: c.status,
        requestedAt: c.requestedAt.toISOString(),
        reviewedAt: c.reviewedAt ? c.reviewedAt.toISOString() : null,
        rejectionReason: c.rejectionReason ?? "",
        requestedBankName: c.requestedBankName,
        requestedBankAccountNumberMasked: maskAccountNumber(c.requestedBankAccountNumber),
        requestedBankAccountHolder: c.requestedBankAccountHolder,
      })),
    },
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    return NextResponse.json({ ok: false, message: "Không xác thực." }, { status: 401 });
  }

  const profileId = await getActiveAffiliateProfileId(session.user.id);
  if (!profileId) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy hồ sơ CTV." }, { status: 404 });
  }

  const existing = await db.affiliatePayoutAccount.findUnique({
    where: { affiliateProfileId: profileId },
    select: { id: true, verificationStatus: true },
  });
  if (existing) {
    return NextResponse.json(
      { ok: false, message: "Bạn đã đăng ký tài khoản nhận tiền. Vui lòng chờ xác minh." },
      { status: 409 },
    );
  }

  let body:
    | {
        bankName?: unknown;
        bankAccountNumber?: unknown;
        bankAccountHolder?: unknown;
        citizenIdFrontObjectKey?: unknown;
        citizenIdBackObjectKey?: unknown;
      }
    | undefined;
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const bankName = String(body?.bankName ?? "").trim().slice(0, 200);
  const bankAccountNumber = String(body?.bankAccountNumber ?? "").trim().slice(0, 64);
  const bankAccountHolder = String(body?.bankAccountHolder ?? "").trim().slice(0, 200);
  const citizenIdFrontObjectKey = String(body?.citizenIdFrontObjectKey ?? "").trim().slice(0, 600);
  const citizenIdBackObjectKey = String(body?.citizenIdBackObjectKey ?? "").trim().slice(0, 600);

  if (!bankName || !bankAccountNumber || !bankAccountHolder) {
    return NextResponse.json({ ok: false, message: "Vui lòng nhập đủ thông tin ngân hàng." }, { status: 400 });
  }
  if (!citizenIdFrontObjectKey || !citizenIdBackObjectKey) {
    return NextResponse.json({ ok: false, message: "Vui lòng tải đủ ảnh CCCD mặt trước và mặt sau." }, { status: 400 });
  }

  try {
    const created = await db.affiliatePayoutAccount.create({
      data: {
        affiliateProfileId: profileId,
        bankName,
        bankAccountNumber,
        bankAccountHolder,
        citizenIdFrontObjectKey,
        citizenIdBackObjectKey,
        verificationStatus: "PENDING",
      },
      select: { id: true, createdAt: true },
    });
    publishAffiliatePayoutAccountSubmitted({
      customerId: session.user.id,
      payoutAccountId: created.id,
    });
    return NextResponse.json({
      ok: true,
      message: "Đã gửi thông tin tài khoản nhận tiền. Vui lòng chờ xác minh.",
      payoutAccountId: created.id,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (e) {
    console.error("[affiliate/payout-account]", e);
    return NextResponse.json({ ok: false, message: "Không thể lưu thông tin. Vui lòng thử lại." }, { status: 500 });
  }
}

