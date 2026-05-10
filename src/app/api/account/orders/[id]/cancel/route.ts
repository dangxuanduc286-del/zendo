import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import { getWebsiteSettings } from "../../../../../../lib/settings";
import { syncAffiliateCommissionLifecycleForOrder } from "../../../../../../lib/affiliate-commission-lifecycle";
import { notifyCustomerOrderCancelledByCustomer } from "../../../../../../lib/order-customer-notifications";
import { canCancelOrder, getAccountOrderTimeline, getOrderStatusGroup, getOrderStatusLabel, getOrderStatusTone } from "../../../../../../lib/order-status";

type ParamsInput = Promise<{ id: string }>;

async function runCancelOrder(request: Request, segment: { params: ParamsInput }): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "USER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
    }

    const { id: orderId } = await Promise.resolve(segment.params);
    if (!orderId?.trim()) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    let body: { reason?: unknown } = {};
    try {
      body = (await request.json()) as { reason?: unknown };
    } catch {
      return NextResponse.json({ message: "Thiếu nội dung JSON." }, { status: 400 });
    }
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (reason.length < 3 || reason.length > 500) {
      return NextResponse.json({ message: "Vui lòng nhập lý do hủy đơn (3–500 ký tự)." }, { status: 400 });
    }

    const settings = await getWebsiteSettings();
    const acc = settings.customerAccountSettings;

    const dbModule = await import("../../../../../../lib/db");
    const { db } = dbModule;

    const existing = await db.order.findFirst({
      where: {
        id: orderId.trim(),
        customerId: session.user.id,
      },
      select: {
        id: true,
        code: true,
        orderStatus: true,
        paymentStatus: true,
        totalAmount: true,
        createdAt: true,
        updatedAt: true,
        canceledAt: true,
        cancelReason: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const eligible = canCancelOrder({
      orderStatus: existing.orderStatus,
      createdAt: existing.createdAt,
      cancelOrderTimeLimitMinutes: acc.cancelOrderTimeLimitMinutes,
      featureEnabled: acc.enableCancelOrder,
    });

    if (!eligible) {
      return NextResponse.json({ message: "Đơn hàng không thể hủy theo chính sách hiện tại." }, { status: 400 });
    }

    const now = new Date();
    const updated = await db.order.update({
      where: { id: existing.id },
      data: {
        orderStatus: "CANCELED",
        canceledAt: now,
        cancelReason: reason,
      },
      select: {
        id: true,
        code: true,
        orderStatus: true,
        paymentStatus: true,
        totalAmount: true,
        createdAt: true,
        updatedAt: true,
        canceledAt: true,
        cancelReason: true,
      },
    });

    await syncAffiliateCommissionLifecycleForOrder(db, updated.id);

    try {
      await notifyCustomerOrderCancelledByCustomer(db, updated.id, reason);
    } catch {
      /* noop */
    }

    const timeline = getAccountOrderTimeline(updated.orderStatus);

    return NextResponse.json({
      order: {
        id: updated.id,
        code: updated.code,
        orderStatus: updated.orderStatus,
        statusLabel: getOrderStatusLabel(updated.orderStatus),
        statusTone: getOrderStatusTone(updated.orderStatus),
        statusGroup: getOrderStatusGroup(updated.orderStatus),
        paymentStatus: updated.paymentStatus,
        totalAmount: Number(updated.totalAmount),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        canceledAt: updated.canceledAt?.toISOString() ?? null,
        cancelReason: updated.cancelReason,
        timeline,
      },
    });
  } catch {
    return NextResponse.json({ message: "Không thể hủy đơn hàng." }, { status: 500 });
  }
}

export async function PATCH(request: Request, segment: { params: ParamsInput }): Promise<NextResponse> {
  return runCancelOrder(request, segment);
}

export async function POST(request: Request, segment: { params: ParamsInput }): Promise<NextResponse> {
  return runCancelOrder(request, segment);
}
