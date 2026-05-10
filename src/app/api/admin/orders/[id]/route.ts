import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { authOptions } from "../../../../../lib/auth";
import { orderStatusUpdateSchema } from "../../../../../lib/admin-order";
import { ghiSuKienAnalytics } from "../../../../../lib/analytics/event-service";
import { syncAffiliateCommissionLifecycleForOrder } from "../../../../../lib/affiliate-commission-lifecycle";
import { notifyAffiliateReferralOrderPaid } from "../../../../../lib/affiliate/affiliate-referral-notifications";
import { notifyCustomerOrderLifecycleAfterAdminPatch } from "../../../../../lib/order-customer-notifications";

type ParamsInput = Promise<{ id: string }>;

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

function isAllowedRole(role?: string | null): boolean {
  return ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role ?? "");
}

export async function PATCH(
  request: Request,
  { params }: { params: ParamsInput },
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const orderId = resolvedParams.id;
    const body = (await request.json()) as unknown;
    const parsed = orderStatusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dữ liệu cập nhật không hợp lệ." },
        { status: 400 },
      );
    }

    const db = await getDbClient();
    if (!db) {
      return NextResponse.json(
        { message: "Hệ thống chưa cấu hình cơ sở dữ liệu." },
        { status: 503 },
      );
    }

    const found = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        code: true,
        customerId: true,
        orderStatus: true,
        paymentStatus: true,
        totalAmount: true,
        affiliateProfileId: true,
        items: {
          take: 1,
          orderBy: { id: "asc" },
          select: {
            product: {
              select: {
                images: { orderBy: [{ isPrimary: "desc" }], take: 1, select: { url: true } },
              },
            },
          },
        },
      },
    });
    if (!found) {
      return NextResponse.json({ message: "Không tìm thấy đơn hàng." }, { status: 404 });
    }

    const updated = await db.order.update({
      where: { id: orderId },
      data: {
        orderStatus: parsed.data.orderStatus,
        paymentStatus: parsed.data.paymentStatus,
      },
      select: {
        id: true,
        orderStatus: true,
        paymentStatus: true,
        updatedAt: true,
      },
    });

    await syncAffiliateCommissionLifecycleForOrder(db, updated.id);

    if (
      found.affiliateProfileId &&
      found.paymentStatus !== "PAID" &&
      updated.paymentStatus === "PAID"
    ) {
      await notifyAffiliateReferralOrderPaid(updated.id);
    }

    if (found.customerId) {
      const previewImage = found.items[0]?.product?.images[0]?.url ?? null;
      await notifyCustomerOrderLifecycleAfterAdminPatch(
        db,
        {
          orderId: found.id,
          customerId: found.customerId,
          code: found.code,
          orderStatus: found.orderStatus,
          paymentStatus: found.paymentStatus,
          totalAmount: Number(found.totalAmount),
          previewImage,
        },
        { orderStatus: updated.orderStatus, paymentStatus: updated.paymentStatus },
      );
    }

    if (found.paymentStatus !== "PAID" && updated.paymentStatus === "PAID") {
      await ghiSuKienAnalytics({
        eventName: "paid_order",
        pathname: "/admin/orders",
        orderId: updated.id,
        referrer: request.headers.get("referer"),
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
        metadata: {
          orderCode: found.code,
          paymentStatus: updated.paymentStatus,
          orderStatus: updated.orderStatus,
        },
      });
    }
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/analytics");
    revalidatePath("/admin/collaborators");
    revalidateTag("storefront-settings");


    return NextResponse.json({
      item: {
        id: updated.id,
        orderStatus: updated.orderStatus,
        paymentStatus: updated.paymentStatus,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ message: "Không thể cập nhật trạng thái đơn hàng." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: ParamsInput },
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!isAllowedRole(session.user.role)) {
      return NextResponse.json({ message: "Bạn không có quyền xóa đơn hàng." }, { status: 403 });
    }

    const resolvedParams = await Promise.resolve(params);
    const orderId = resolvedParams.id;
    const db = await getDbClient();
    if (!db) {
      return NextResponse.json(
        { message: "Hệ thống chưa cấu hình cơ sở dữ liệu." },
        { status: 503 },
      );
    }

    const found = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, code: true },
    });
    if (!found) {
      return NextResponse.json({ message: "Không tìm thấy đơn hàng." }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      await tx.order.delete({
        where: { id: found.id },
      });
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${found.id}`);
    revalidatePath("/admin/analytics");
    revalidatePath("/admin/collaborators");
    revalidateTag("storefront-settings");

    return NextResponse.json({ success: true, message: "Đã xóa đơn hàng." });
  } catch {
    return NextResponse.json({ message: "Không thể xóa đơn hàng. Vui lòng thử lại." }, { status: 500 });
  }
}

