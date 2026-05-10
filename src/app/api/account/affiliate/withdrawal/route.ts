import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";
import { getStorefrontAffiliateDashboardForCustomer } from "../../../../../lib/storefront-affiliate-dashboard";

/**
 * CTV gửi yêu cầu rút tiền — profile lấy theo session, không nhận affiliateProfileId từ client.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    return NextResponse.json({ ok: false, message: "Không xác thực." }, { status: 401 });
  }

  let body: { amount?: number; note?: unknown };
  try {
    body = (await request.json()) as { amount?: number; note?: unknown };
  } catch {
    return NextResponse.json({ ok: false, message: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const snapshot = await getStorefrontAffiliateDashboardForCustomer(session.user.id);
  if (!snapshot) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy hồ sơ CTV." }, { status: 404 });
  }
  if (snapshot.profileStatus !== "ACTIVE") {
    return NextResponse.json(
      { ok: false, message: "Tài khoản CTV chưa trong trạng thái hoạt động." },
      { status: 403 },
    );
  }
  if (!snapshot.program.withdrawalEnabled) {
    return NextResponse.json({ ok: false, message: "Chức năng rút tiền chưa được bật." }, { status: 403 });
  }

  const payoutAccount = await db.affiliatePayoutAccount.findUnique({
    where: { affiliateProfileId: snapshot.profileId },
    select: {
      verificationStatus: true,
      bankName: true,
      bankAccountNumber: true,
      bankAccountHolder: true,
    },
  });
  if (!payoutAccount || payoutAccount.verificationStatus !== "APPROVED") {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Bạn chưa được xác minh tài khoản nhận tiền. Vui lòng đăng ký và chờ admin duyệt trước khi rút tiền.",
      },
      { status: 403 },
    );
  }

  const rawAmount =
    typeof body.amount === "number" && Number.isFinite(body.amount)
      ? body.amount
      : Number(body.amount ?? 0);
  const roundVnd = Math.floor(rawAmount);
  if (!Number.isFinite(roundVnd) || roundVnd <= 0) {
    return NextResponse.json({ ok: false, message: "Số tiền không hợp lệ." }, { status: 400 });
  }

  const minAmount = snapshot.program.payoutThreshold;
  if (roundVnd < minAmount) {
    return NextResponse.json(
      {
        ok: false,
        message: `Số tiền rút tối thiểu là ${new Intl.NumberFormat("vi-VN").format(minAmount)}₫.`,
      },
      { status: 400 },
    );
  }

  if (roundVnd > snapshot.summary.withdrawableBalance) {
    return NextResponse.json(
      {
        ok: false,
        message: "Số tiền vượt quá số dư có thể rút hiện tại.",
      },
      { status: 400 },
    );
  }

  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
  const paymentPayload = JSON.stringify({
    bank: payoutAccount.bankName,
    accountNumber: payoutAccount.bankAccountNumber,
    accountName: payoutAccount.bankAccountHolder,
    note,
  }).slice(0, 8000);

  try {
    const created = await db.affiliateWithdrawalRequest.create({
      data: {
        affiliateProfileId: snapshot.profileId,
        amount: roundVnd,
        availableAmount: snapshot.summary.withdrawableBalance,
        paymentMethod: "BANK",
        paymentInfo: paymentPayload,
      },
      select: { id: true, createdAt: true },
    });
    return NextResponse.json({
      ok: true,
      message: "Đã nhận yêu cầu rút tiền.",
      withdrawalId: created.id,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (e) {
    console.error("[affiliate/withdrawal]", e);
    return NextResponse.json({ ok: false, message: "Không gửi được yêu cầu." }, { status: 500 });
  }
}
