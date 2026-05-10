import type { OrderStatus } from "@prisma/client";

const PRISMA_ORDER_STATUSES = new Set<string>([
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPING",
  "DELIVERED",
  "COMPLETED",
  "CANCELED",
  "REFUNDED",
]);

/** Nhóm lọc an toàn cho truy vấn lịch sử đơn (không nhận input tùy ý từ client). */
export type AccountOrderStatusFilter =
  | "all"
  | "pending"
  | "confirmed"
  | "shipping"
  | "completed"
  | "cancelled"
  | "refunded";

/** Phase 2 — query `statusFilter` trên API `/api/account/orders`. */
export type AccountOrderPhase2ApiStatusFilter =
  | "all"
  | "processing"
  | "shipping"
  | "completed"
  | "canceled"
  | "refunded";

export type OrderStatusTone = "neutral" | "info" | "warning" | "success" | "danger" | "muted";

export type OrderStatusUiGroup = "processing" | "confirmed" | "shipping" | "completed" | "cancelled" | "refunded";

/** Chuẩn hóa chuỗi trạng thái (API/legacy) về giá trị gần với enum Prisma. */
export function normalizeRawOrderStatus(raw: string): OrderStatus | null {
  const key = raw.trim().toUpperCase();
  const alias: Record<string, OrderStatus> = {
    CANCELLED: "CANCELED",
    SHIPPED: "SHIPPING",
    DELIVERING: "SHIPPING",
    FAILED: "CANCELED",
    RETURNED: "REFUNDED",
  };
  const resolved = (alias[key] ?? key) as OrderStatus;
  return PRISMA_ORDER_STATUSES.has(resolved) ? resolved : null;
}

/** Nhãn hiển thị tiếng Việt theo spec PROMAX / storefront. */
export function getOrderStatusLabel(status: OrderStatus | string): string {
  const s = typeof status === "string" ? normalizeRawOrderStatus(status) : status;
  switch (s) {
    case "PENDING":
      return "Đang xử lý";
    case "CONFIRMED":
    case "PROCESSING":
      return "Đã xác nhận";
    case "SHIPPING":
      return "Đang giao";
    case "DELIVERED":
    case "COMPLETED":
      return "Hoàn thành";
    case "CANCELED":
      return "Đã hủy";
    case "REFUNDED":
      return "Hoàn / hoàn tiền";
    default:
      return "Đang cập nhật";
  }
}

export function getOrderStatusTone(status: OrderStatus | string): OrderStatusTone {
  const s = typeof status === "string" ? normalizeRawOrderStatus(status) : status;
  switch (s) {
    case "PENDING":
      return "warning";
    case "CONFIRMED":
    case "PROCESSING":
      return "info";
    case "SHIPPING":
      return "info";
    case "DELIVERED":
    case "COMPLETED":
      return "success";
    case "CANCELED":
      return "danger";
    case "REFUNDED":
      return "muted";
    default:
      return "neutral";
  }
}

export function getOrderStatusGroup(status: OrderStatus | string): OrderStatusUiGroup {
  const s = typeof status === "string" ? normalizeRawOrderStatus(status) : status;
  switch (s) {
    case "PENDING":
      return "processing";
    case "CONFIRMED":
    case "PROCESSING":
      return "confirmed";
    case "SHIPPING":
      return "shipping";
    case "DELIVERED":
    case "COMPLETED":
      return "completed";
    case "CANCELED":
      return "cancelled";
    case "REFUNDED":
      return "refunded";
    default:
      return "processing";
  }
}

/** Ánh xạ nhóm lọc UI → danh sách OrderStatus Prisma (undefined = không lọc theo nhóm). */
export function orderStatusesForAccountFilter(filter: AccountOrderStatusFilter): OrderStatus[] | undefined {
  if (filter === "all") return undefined;
  if (filter === "pending") return ["PENDING"];
  if (filter === "confirmed") return ["CONFIRMED", "PROCESSING"];
  if (filter === "shipping") return ["SHIPPING"];
  if (filter === "completed") return ["DELIVERED", "COMPLETED"];
  if (filter === "cancelled") return ["CANCELED"];
  if (filter === "refunded") return ["REFUNDED"];
  return undefined;
}

export function orderStatusesForPhase2ApiFilter(
  filter: AccountOrderPhase2ApiStatusFilter,
): OrderStatus[] | undefined {
  if (filter === "all") return undefined;
  if (filter === "processing") return ["PENDING", "CONFIRMED", "PROCESSING"];
  if (filter === "shipping") return ["SHIPPING"];
  if (filter === "completed") return ["DELIVERED", "COMPLETED"];
  if (filter === "canceled") return ["CANCELED"];
  if (filter === "refunded") return ["REFUNDED"];
  return undefined;
}

export type AccountOrdersDateRangePreset = "all" | "7d" | "30d" | "3m";

export function parsePhase2ApiStatusFilter(raw: string | undefined | null): AccountOrderPhase2ApiStatusFilter {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase();
  const allowed = new Set<AccountOrderPhase2ApiStatusFilter>([
    "all",
    "processing",
    "shipping",
    "completed",
    "canceled",
    "refunded",
  ]);
  return allowed.has(key as AccountOrderPhase2ApiStatusFilter) ? (key as AccountOrderPhase2ApiStatusFilter) : "all";
}

export function parseDateRangePreset(raw: string | undefined | null): AccountOrdersDateRangePreset {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase();
  const allowed = new Set<AccountOrdersDateRangePreset>(["all", "7d", "30d", "3m"]);
  return allowed.has(key as AccountOrdersDateRangePreset) ? (key as AccountOrdersDateRangePreset) : "all";
}

/** Khoảng thời gian đặt hàng (`createdAt`) theo preset; `all` ⇒ không áp điều kiện. */
export function createdAtBoundsForDateRangePreset(
  preset: AccountOrdersDateRangePreset,
  now: Date = new Date(),
): { from: Date | null; to: Date | null } {
  if (preset === "all") return { from: null, to: null };
  const to = new Date(now);
  const from = new Date(now);
  if (preset === "7d") {
    from.setDate(from.getDate() - 7);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
  } else if (preset === "30d") {
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
  } else if (preset === "3m") {
    from.setMonth(from.getMonth() - 3);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
  }
  return { from, to };
}

export type OrderTimelineStep = { key: string; label: string; active: boolean; done: boolean };

/** Chuỗi thời gian hiển thị cho chi tiết đơn / API khách (tiếng Việt có dấu). */
export function getAccountOrderTimeline(orderStatus: OrderStatus | string): {
  finalLabel: string;
  steps: OrderTimelineStep[];
} {
  const s = typeof orderStatus === "string" ? normalizeRawOrderStatus(orderStatus) : orderStatus;
  if (!s) {
    return {
      finalLabel: "Đang cập nhật",
      steps: [{ key: "unknown", label: "Đang cập nhật", active: true, done: true }],
    };
  }
  if (s === "CANCELED") {
    return {
      finalLabel: "Đã hủy",
      steps: [
        { key: "placed", label: "Đã đặt hàng", active: false, done: true },
        { key: "cancelled", label: "Đã hủy", active: true, done: true },
      ],
    };
  }
  if (s === "REFUNDED") {
    return {
      finalLabel: "Hoàn / hoàn tiền",
      steps: [
        { key: "placed", label: "Đã đặt hàng", active: false, done: true },
        { key: "confirmed", label: "Đã xác nhận", active: false, done: true },
        { key: "shipping", label: "Đang giao", active: false, done: true },
        { key: "refunded", label: "Hoàn / hoàn tiền", active: true, done: true },
      ],
    };
  }
  const stageMap: Record<OrderStatus, number> = {
    PENDING: 0,
    CONFIRMED: 1,
    PROCESSING: 1,
    SHIPPING: 2,
    DELIVERED: 3,
    COMPLETED: 3,
    CANCELED: 0,
    REFUNDED: 3,
  };
  const stage = stageMap[s] ?? 0;
  const labels = ["Đã đặt hàng", "Đã xác nhận", "Đang giao", "Hoàn thành"];
  return {
    finalLabel: labels[Math.min(stage, labels.length - 1)],
    steps: labels.map((label, index) => ({
      key: `step-${index}`,
      label,
      active: index === stage,
      done: index <= stage,
    })),
  };
}

export function canCancelOrder(params: {
  orderStatus: OrderStatus | string;
  createdAt: Date;
  cancelOrderTimeLimitMinutes: number;
  featureEnabled: boolean;
}): boolean {
  if (!params.featureEnabled) return false;
  const s = typeof params.orderStatus === "string" ? normalizeRawOrderStatus(params.orderStatus) : params.orderStatus;
  if (!s || s === "CANCELED" || s === "REFUNDED" || s === "DELIVERED" || s === "COMPLETED" || s === "SHIPPING") {
    return false;
  }
  if (!(s === "PENDING" || s === "CONFIRMED" || s === "PROCESSING")) return false;
  const limit = Math.max(0, Math.floor(params.cancelOrderTimeLimitMinutes));
  if (limit === 0) return true;
  const deadline = params.createdAt.getTime() + limit * 60_000;
  return Date.now() <= deadline;
}

export function canReorder(orderStatus: OrderStatus | string): boolean {
  const s = typeof orderStatus === "string" ? normalizeRawOrderStatus(orderStatus) : orderStatus;
  return s === "DELIVERED" || s === "COMPLETED";
}

export function canReviewOrder(orderStatus: OrderStatus | string): boolean {
  return canReorder(orderStatus);
}
