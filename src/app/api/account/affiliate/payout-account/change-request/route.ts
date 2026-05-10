import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  assertValidChangeDraftObjectKeys,
  payoutBankFieldsDuplicate,
} from "@/lib/affiliate/payout-account-change-request-validation";
import { publishAffiliatePayoutChangeRequestSubmitted } from "@/lib/affiliate/customer-payout-notifications";

async function getActiveAffiliateProfileId(customerId: string): Promise<string | null> {
  const profile = await db.affiliateProfile.findFirst({
    where: { customerId, status: "ACTIVE" },
    select: { id: true },
  });
  return profile?.id ?? null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") {
    return NextResponse.json({ ok: false, message: "Không xác thực." }, { status: 401 });
  }

  const customerId = session.user.id;

  let body:
    | {
        bankName?: unknown;
        bankAccountNumber?: unknown;
        bankAccountHolder?: unknown;
        citizenIdFrontObjectKey?: unknown;
        citizenIdBackObjectKey?: unknown;
        changeDraftToken?: unknown;
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
  const changeDraftToken = String(body?.changeDraftToken ?? "").trim();

  if (!bankName || !bankAccountNumber || !bankAccountHolder) {
    return NextResponse.json({ ok: false, message: "Vui lòng nhập đủ thông tin ngân hàng mới." }, { status: 400 });
  }
  if (!citizenIdFrontObjectKey || !citizenIdBackObjectKey) {
    return NextResponse.json({ ok: false, message: "Vui lòng tải đủ ảnh CCCD mặt trước và mặt sau mới." }, { status: 400 });
  }
  try {
    assertValidChangeDraftObjectKeys({
      customerId,
      draftToken: changeDraftToken,
      frontKey: citizenIdFrontObjectKey,
      backKey: citizenIdBackObjectKey,
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Ảnh tải lên không hợp lệ cho yêu cầu này. Vui lòng tải lại." }, { status: 400 });
  }

  const profileId = await getActiveAffiliateProfileId(customerId);
  if (!profileId) {
    return NextResponse.json({ ok: false, message: "Không tìm thấy hồ sơ CTV." }, { status: 404 });
  }

  try {
    const createdId = await db.$transaction(async (tx) => {
      const acct = await tx.affiliatePayoutAccount.findUnique({
        where: { affiliateProfileId: profileId },
        select: {
          id: true,
          bankName: true,
          bankAccountNumber: true,
          bankAccountHolder: true,
          verificationStatus: true,
        },
      });
      if (!acct || acct.verificationStatus !== "APPROVED") {
        throw new Error("NOT_APPROVED");
      }

      if (
        payoutBankFieldsDuplicate(
          {
            bankName: acct.bankName,
            bankAccountNumber: acct.bankAccountNumber,
            bankAccountHolder: acct.bankAccountHolder,
          },
          { bankName, bankAccountNumber, bankAccountHolder },
        )
      ) {
        throw new Error("SAME_ACCOUNT");
      }

      const pend = await tx.affiliatePayoutAccountChangeRequest.findFirst({
        where: { payoutAccountId: acct.id, status: "PENDING" },
        select: { id: true },
      });
      if (pend) throw new Error("PENDING_EXISTS");

      // Unique constraint enforced at DB layer (partial index on PENDING) for races across instances.

      const req = await tx.affiliatePayoutAccountChangeRequest.create({
        data: {
          payoutAccountId: acct.id,
          affiliateProfileId: profileId,
          currentBankName: acct.bankName,
          currentBankAccountNumber: acct.bankAccountNumber,
          currentBankAccountHolder: acct.bankAccountHolder,
          requestedBankName: bankName,
          requestedBankAccountNumber: bankAccountNumber,
          requestedBankAccountHolder: bankAccountHolder,
          citizenIdFrontObjectKey,
          citizenIdBackObjectKey,
          status: "PENDING",
        },
        select: { id: true },
      });

      return req.id;
    });

    publishAffiliatePayoutChangeRequestSubmitted({
      customerId,
      changeRequestId: createdId,
    });

    return NextResponse.json({
      ok: true,
      message:
        "Đã gửi yêu cầu thay đổi tài khoản ngân hàng. Trong lúc chờ duyệt, rút tiền vẫn dùng tài khoản hiện tại đã được xác minh.",
      changeRequestId: createdId,
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "Đã có yêu cầu thay đổi đang chờ xử lý. Vui lòng chờ admin xử lý trước khi gửi thêm.",
        },
        { status: 409 },
      );
    }

    const code = e instanceof Error ? e.message : "";
    if (code === "NOT_APPROVED") {
      return NextResponse.json(
        {
          ok: false,
          message: "Chỉ tài khoản nhận tiền đã được duyệt mới gửi yêu cầu thay đổi.",
        },
        { status: 403 },
      );
    }

    if (code === "SAME_ACCOUNT") {
      return NextResponse.json(
        { ok: false, message: "Thông tin mới không được trùng hoàn toàn với tài khoản hiện tại." },
        { status: 400 },
      );
    }

    if (code === "PENDING_EXISTS") {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Bạn đã có yêu cầu thay đổi đang chờ duyệt. Vui lòng chờ admin xử lý.",
        },
        { status: 409 },
      );
    }

    console.error("[affiliate/payout-account/change-request]", e);

    return NextResponse.json(
      { ok: false, message: "Không thể gửi yêu cầu. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
