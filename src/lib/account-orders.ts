import type { Order, OrderStatus, Prisma, PrismaClient } from "@prisma/client";
import type {
  AccountOrderPhase2ApiStatusFilter,
  AccountOrderStatusFilter,
} from "./order-status";
import { orderStatusesForAccountFilter, orderStatusesForPhase2ApiFilter } from "./order-status";

export type ListCustomerAccountOrdersParams = {
  statusFilter?: AccountOrderStatusFilter;
  /** Phase 2 API — ưu tiên hơn `statusFilter` khi có giá trị. */
  apiStatusFilter?: AccountOrderPhase2ApiStatusFilter;
  /** Từ khóa an toàn (độ dài giới hạn), không dùng raw SQL từ client. */
  search?: string;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  page?: number;
  pageSize?: number;
  /** Giới hạn tối đa `pageSize` (mặc định 100; API khách dùng 50). */
  pageSizeMaxClamp?: number;
};

export type CustomerAccountOrderRow = Pick<
  Order,
  | "id"
  | "code"
  | "orderStatus"
  | "paymentStatus"
  | "paymentMethod"
  | "totalAmount"
  | "createdAt"
  | "updatedAt"
  | "canceledAt"
  | "cancelReason"
> & {
  itemCount: number;
};

function clampPage(value: unknown): number {
  const p = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(p) || p < 1) return 1;
  return Math.min(Math.floor(p), 10_000);
}

function clampPageSize(value: unknown, max: number): number {
  const p = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(p)) return 20;
  return Math.min(Math.max(Math.floor(p), 1), max);
}

function sanitizeSearch(raw: string): string {
  return raw.replace(/[^\p{L}\p{N}\s+#._-]/gu, "").trim().slice(0, 120);
}

/**
 * Danh sách đơn cho tài khoản khách — chỉ gọi phía server với `customerId` lấy từ session.
 * Không ẩn đơn hủy / hoàn tiền: chỉ lọc khi `statusFilter` khác `all`.
 */
export async function listOrdersForCustomerAccount(
  db: PrismaClient,
  customerId: string,
  params: ListCustomerAccountOrdersParams = {},
): Promise<{ orders: CustomerAccountOrderRow[]; total: number; page: number; pageSize: number }> {
  const cid = customerId.trim();
  const page = clampPage(params.page);
  const pageSizeMax = Math.min(100, Math.max(1, Math.floor(params.pageSizeMaxClamp ?? 100)));
  const pageSize = clampPageSize(params.pageSize, pageSizeMax);
  if (!cid) {
    return { orders: [], total: 0, page: 1, pageSize };
  }

  const where: Prisma.OrderWhereInput = { customerId: cid };

  const statuses =
    params.apiStatusFilter != null
      ? orderStatusesForPhase2ApiFilter(params.apiStatusFilter)
      : orderStatusesForAccountFilter(params.statusFilter ?? "all");
  if (statuses?.length) {
    where.orderStatus = { in: statuses as OrderStatus[] };
  }

  if (params.dateFrom || params.dateTo) {
    where.createdAt = {};
    if (params.dateFrom) where.createdAt.gte = params.dateFrom;
    if (params.dateTo) where.createdAt.lte = params.dateTo;
  }

  const q = params.search?.trim() ? sanitizeSearch(params.search) : "";
  if (q) {
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q, mode: "insensitive" } },
      { customerFullName: { contains: q, mode: "insensitive" } },
      { items: { some: { productName: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [total, rows] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        code: true,
        orderStatus: true,
        paymentStatus: true,
        paymentMethod: true,
        totalAmount: true,
        createdAt: true,
        updatedAt: true,
        canceledAt: true,
        cancelReason: true,
        items: { select: { quantity: true } },
      },
    }),
  ]);

  const orders: CustomerAccountOrderRow[] = rows.map((row) => {
    const { items, ...rest } = row;
    const itemCount = items.reduce((sum, it) => sum + (it.quantity ?? 0), 0);
    return { ...rest, itemCount };
  });

  return { orders, total, page, pageSize };
}
