import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import { buildReorderCartPayload } from "../../../../../../lib/account-order-reorder";
import { getWebsiteSettings } from "../../../../../../lib/settings";
import { canReorder } from "../../../../../../lib/order-status";
import {
  effectiveAffiliateBlockMessage,
  isAffiliateOnly,
  isCustomerBuyer,
  type AccountRoleUser,
} from "../../../../../../lib/account-role";
import { resolveCustomerAffiliateActiveDb } from "../../../../../../lib/affiliate-customer-status";

type ParamsInput = Promise<{ id: string }>;

/** Trả đề xuất mục giỏ (định dạng tương thích `GuestCartItem`) và dòng không thêm được — không ghi Cart server. */
export async function POST(_request: Request, segment: { params: ParamsInput }): Promise<NextResponse> {
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

    const settings = await getWebsiteSettings();
    const cas = settings.customerAccountSettings;
    if (!cas.enableReorder) {
      return NextResponse.json({ message: "Tính năng mua lại đang tắt." }, { status: 403 });
    }

    const affiliateActive = await resolveCustomerAffiliateActiveDb(session.user.id);
    const roleUser: AccountRoleUser = { role: "USER", affiliateActive };
    if (isAffiliateOnly(roleUser) && !isCustomerBuyer(roleUser, cas)) {
      return NextResponse.json({ message: effectiveAffiliateBlockMessage(cas.affiliateBlockCheckoutMessage) }, { status: 403 });
    }

    const dbModule = await import("../../../../../../lib/db");
    const { db } = dbModule;

    const order = await db.order.findFirst({
      where: { id: orderId.trim(), customerId: session.user.id },
      select: {
        id: true,
        orderStatus: true,
      },
    });

    if (!order) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    if (!canReorder(order.orderStatus)) {
      return NextResponse.json({ message: "Đơn hàng không áp dụng mua lại." }, { status: 400 });
    }

    const { items, skipped } = await buildReorderCartPayload(db, {
      orderId: order.id,
      customerId: session.user.id,
    });

    return NextResponse.json({
      orderId: order.id,
      eligible: items.length > 0,
      items,
      skipped,
      hint:
        skipped.length && !items.length
          ? "Không có sản phẩm nào đủ điều kiện để thêm vào giỏ. Kiểm tra tồn kho và trạng thái sản phẩm."
          : skipped.length && items.length
            ? "Một phần sản phẩm không thêm được vào giỏ; phần còn lại có thể merge từ trường items."
            : null,
    });
  } catch {
    return NextResponse.json({ message: "Không thể xử lý mua lại." }, { status: 500 });
  }
}
