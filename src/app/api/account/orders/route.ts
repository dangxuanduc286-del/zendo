import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { listOrdersForCustomerAccount } from "../../../../lib/account-orders";
import type { AccountOrderPhase2ApiStatusFilter, AccountOrdersDateRangePreset } from "../../../../lib/order-status";
import {
  createdAtBoundsForDateRangePreset,
  getOrderStatusGroup,
  getOrderStatusLabel,
  getOrderStatusTone,
} from "../../../../lib/order-status";

const PHASE2_STATUS_KEYS = new Set<AccountOrderPhase2ApiStatusFilter>([
  "all",
  "processing",
  "shipping",
  "completed",
  "canceled",
  "refunded",
]);

const DATE_RANGE_KEYS = new Set<AccountOrdersDateRangePreset>(["all", "7d", "30d", "3m"]);

function parseStatusFilterStrict(raw: string | null): { ok: true; value: AccountOrderPhase2ApiStatusFilter } | { ok: false } {
  if (raw == null || raw.trim() === "") return { ok: true, value: "all" };
  const key = raw.trim().toLowerCase() as AccountOrderPhase2ApiStatusFilter;
  return PHASE2_STATUS_KEYS.has(key) ? { ok: true, value: key } : { ok: false };
}

function parseDateRangeStrict(raw: string | null): { ok: true; value: AccountOrdersDateRangePreset } | { ok: false } {
  if (raw == null || raw.trim() === "") return { ok: true, value: "all" };
  const key = raw.trim().toLowerCase() as AccountOrdersDateRangePreset;
  return DATE_RANGE_KEYS.has(key) ? { ok: true, value: key } : { ok: false };
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "USER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const st = parseStatusFilterStrict(searchParams.get("statusFilter"));
    const dr = parseDateRangeStrict(searchParams.get("dateRange"));
    if (!st.ok) {
      return NextResponse.json({ message: "Tham số statusFilter không hợp lệ." }, { status: 400 });
    }
    if (!dr.ok) {
      return NextResponse.json({ message: "Tham số dateRange không hợp lệ." }, { status: 400 });
    }
    const statusFilter = st.value;
    const search = searchParams.get("search") ?? undefined;
    const dateRange = dr.value;

    const rawPage = searchParams.get("page");
    const rawPs = searchParams.get("pageSize");
    if (rawPage !== null && rawPage.trim() !== "") {
      const pn = Number.parseInt(rawPage, 10);
      if (!Number.isFinite(pn) || pn < 1 || pn > 10_000) {
        return NextResponse.json({ message: "Tham số page không hợp lệ." }, { status: 400 });
      }
    }
    if (rawPs !== null && rawPs.trim() !== "") {
      const ps = Number.parseInt(rawPs, 10);
      if (!Number.isFinite(ps) || ps < 1 || ps > 50) {
        return NextResponse.json({ message: "Tham số pageSize phải từ 1 đến 50." }, { status: 400 });
      }
    }
    const page =
      rawPage == null || rawPage.trim() === "" ? 1 : Math.min(Math.max(Number.parseInt(rawPage, 10), 1), 10_000);
    const pageSize =
      rawPs == null || rawPs.trim() === "" ? 20 : Math.min(Math.max(Number.parseInt(rawPs, 10), 1), 50);

    const { from, to } = createdAtBoundsForDateRangePreset(dateRange);

    const dbModule = await import("../../../../lib/db");
    const { db } = dbModule;

    const { orders, total, page: resolvedPage, pageSize: resolvedPageSize } =
      await listOrdersForCustomerAccount(db, session.user.id, {
        apiStatusFilter: statusFilter,
        search,
        dateFrom: from,
        dateTo: to,
        page,
        pageSize,
        pageSizeMaxClamp: 50,
      });

    const hasMore = resolvedPage * resolvedPageSize < total;

    return NextResponse.json({
      orders: orders.map((o) => ({
        id: o.id,
        code: o.code,
        orderStatus: o.orderStatus,
        statusLabel: getOrderStatusLabel(o.orderStatus),
        statusTone: getOrderStatusTone(o.orderStatus),
        statusGroup: getOrderStatusGroup(o.orderStatus),
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        totalAmount: Number(o.totalAmount),
        itemCount: o.itemCount,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
        canceledAt: o.canceledAt?.toISOString() ?? null,
      })),
      meta: {
        page: resolvedPage,
        pageSize: resolvedPageSize,
        total,
        hasMore,
        dateRange,
        statusFilter,
      },
    });
  } catch {
    return NextResponse.json({ message: "Không thể tải danh sách đơn." }, { status: 500 });
  }
}
