import type { OrderStatus, PaymentStatus, PrismaClient } from "@prisma/client";
import { publishCustomerAccountNotification, sanitizeCustomerNotificationText } from "@/lib/customer-account-notifications";
import { formatPaymentStatus } from "@/lib/admin-order";

export const ORDER_CUSTOMER_NOTIFICATION_VERSION = 1;

const ORDER_DEEP_TRACKING = "/tai-khoan?tab=tracking";
const ORDER_DEEP_LIST = "/tai-khoan?tab=orders";

export type OrderCustomerNotifyEvent =
  | "created"
  | "confirmed"
  | "processing"
  | "shipping"
  | "completed"
  | "paid"
  | "cancelled"
  | "refunded";

function dedupeKey(orderId: string, event: OrderCustomerNotifyEvent): string {
  return `order:${orderId}:${event}`.slice(0, 180);
}

function buildMetadata(args: {
  orderId: string;
  orderCode: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  previewImage: string | null;
  deepLink: string;
}): Record<string, unknown> {
  return {
    type: "ORDER_CUSTOMER",
    notificationVersion: ORDER_CUSTOMER_NOTIFICATION_VERSION,
    orderId: args.orderId,
    orderCode: args.orderCode,
    orderStatus: args.orderStatus,
    paymentStatus: args.paymentStatus,
    totalAmount: args.totalAmount,
    previewImage: args.previewImage,
    deepLink: args.deepLink,
  };
}

async function loadOrderCustomerContext(
  db: PrismaClient,
  orderId: string,
): Promise<{
  orderId: string;
  customerId: string;
  code: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  previewImage: string | null;
} | null> {
  const row = await db.order.findFirst({
    where: { id: orderId },
    select: {
      id: true,
      customerId: true,
      code: true,
      orderStatus: true,
      paymentStatus: true,
      totalAmount: true,
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
  if (!row?.customerId) return null;
  const anyImg = row.items[0]?.product?.images[0]?.url ?? null;

  return {
    orderId: row.id,
    customerId: row.customerId,
    code: row.code,
    orderStatus: row.orderStatus,
    paymentStatus: row.paymentStatus,
    totalAmount: Number(row.totalAmount),
    previewImage: anyImg,
  };
}

function publishOrderCustomerEvent(
  ctx: {
    orderId: string;
    customerId: string;
    code: string;
    orderStatus: OrderStatus;
    paymentStatus: PaymentStatus;
    totalAmount: number;
    previewImage: string | null;
  },
  event: OrderCustomerNotifyEvent,
  title: string,
  body: string,
): void {
  const deepLink = event === "created" || event === "paid" ? ORDER_DEEP_LIST : ORDER_DEEP_TRACKING;
  publishCustomerAccountNotification({
    customerId: ctx.customerId,
    category: "ORDER",
    dedupeKey: dedupeKey(ctx.orderId, event),
    title: sanitizeCustomerNotificationText(title, 240),
    body: sanitizeCustomerNotificationText(body, 8000),
    actionHref: deepLink,
    metadata: buildMetadata({
      orderId: ctx.orderId,
      orderCode: ctx.code,
      orderStatus: ctx.orderStatus,
      paymentStatus: ctx.paymentStatus,
      totalAmount: ctx.totalAmount,
      previewImage: ctx.previewImage,
      deepLink,
    }),
  });
}

/** Sau tạo đơn (checkout thành công). */
export async function notifyCustomerOrderCreated(db: PrismaClient, orderId: string): Promise<void> {
  const ctx = await loadOrderCustomerContext(db, orderId);
  if (!ctx) return;
  publishOrderCustomerEvent(
    ctx,
    "created",
    `Đơn ${ctx.code} đã được tạo`,
    `Đơn hàng của bạn đang chờ xác nhận. Thanh toán: ${formatPaymentStatus(ctx.paymentStatus)}.`,
  );
}

/** Khách hủy đơn (API tài khoản). */
export async function notifyCustomerOrderCancelledByCustomer(
  db: PrismaClient,
  orderId: string,
  reason?: string | null,
): Promise<void> {
  const ctx = await loadOrderCustomerContext(db, orderId);
  if (!ctx) return;
  const extra = reason ? ` Lý do: ${sanitizeCustomerNotificationText(reason, 400)}` : "";
  publishOrderCustomerEvent(
    { ...ctx, orderStatus: "CANCELED" },
    "cancelled",
    `Đơn ${ctx.code} đã hủy`,
    `Đơn hàng đã được hủy theo yêu cầu của bạn.${extra}`,
  );
}

type OrderPatchSnapshot = {
  orderId: string;
  customerId: string;
  code: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  previewImage: string | null;
};

/** Admin cập nhật trạng thái / thanh toán — chỉ thông báo khi có thay đổi thật. */
export async function notifyCustomerOrderLifecycleAfterAdminPatch(
  db: PrismaClient,
  before: OrderPatchSnapshot,
  after: { orderStatus: OrderStatus; paymentStatus: PaymentStatus },
): Promise<void> {
  const ctx: OrderPatchSnapshot = {
    ...before,
    orderStatus: after.orderStatus,
    paymentStatus: after.paymentStatus,
  };

  if (before.orderStatus !== after.orderStatus) {
    switch (after.orderStatus) {
      case "CONFIRMED":
        publishOrderCustomerEvent(ctx, "confirmed", `Đơn ${ctx.code} đã xác nhận`, `Shop đã xác nhận đơn hàng của bạn.`);
        break;
      case "PROCESSING":
        publishOrderCustomerEvent(ctx, "processing", `Đơn ${ctx.code} đang xử lý`, `Đơn hàng đang được chuẩn bị.`);
        break;
      case "SHIPPING":
        publishOrderCustomerEvent(ctx, "shipping", `Đơn ${ctx.code} đang giao`, `Đơn hàng đang được vận chuyển.`);
        break;
      case "DELIVERED":
        publishOrderCustomerEvent(ctx, "completed", `Đơn ${ctx.code} đã giao`, `Đơn đã giao tới bạn. Vui lòng kiểm tra hàng.`);
        break;
      case "COMPLETED":
        if (before.orderStatus !== "DELIVERED") {
          publishOrderCustomerEvent(
            ctx,
            "completed",
            `Đơn ${ctx.code} hoàn tất`,
            `Đơn hàng đã hoàn tất. Cảm ơn bạn đã mua sắm!`,
          );
        }
        break;
      case "CANCELED":
        publishOrderCustomerEvent(ctx, "cancelled", `Đơn ${ctx.code} đã hủy`, `Đơn hàng đã bị hủy.`);
        break;
      case "REFUNDED":
        publishOrderCustomerEvent(ctx, "refunded", `Đơn ${ctx.code} — hoàn tiền`, `Đơn hàng đã được hoàn tiền.`);
        break;
      default:
        break;
    }
  }

  if (before.paymentStatus !== after.paymentStatus) {
    if (after.paymentStatus === "PAID") {
      publishOrderCustomerEvent(
        ctx,
        "paid",
        `Thanh toán đơn ${ctx.code} thành công`,
        `Trạng thái thanh toán: ${formatPaymentStatus(after.paymentStatus)}.`,
      );
    }
    if (after.paymentStatus === "REFUNDED" || after.paymentStatus === "PARTIALLY_REFUNDED") {
      publishOrderCustomerEvent(
        ctx,
        "refunded",
        `Hoàn tiền đơn ${ctx.code}`,
        `Thanh toán: ${formatPaymentStatus(after.paymentStatus)}.`,
      );
    }
  }

}
