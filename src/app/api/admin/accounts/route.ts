import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import type { AccountListResponse, AccountRole, AccountStatus, AdminAccountListItem } from "../../../../lib/admin-account";

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

function normalizeRole(roleName: string): AccountRole {
  if (roleName === "SUPER_ADMIN" || roleName === "ADMIN") return "ADMIN";
  return "COLLABORATOR";
}

function mapAdminStatus(status: "ACTIVE" | "INACTIVE" | "SUSPENDED"): AccountStatus {
  if (status === "ACTIVE") return "ACTIVE";
  return "LOCKED";
}

function mapCustomerStatus(notes: string | null): AccountStatus {
  if ((notes ?? "").includes("[SOFT_DELETED]")) return "SOFT_DELETED";
  if ((notes ?? "").includes("[LOCKED]")) return "LOCKED";
  return "ACTIVE";
}

function mapCustomerRole(notes: string | null): AccountRole {
  if ((notes ?? "").includes("[CTV]")) return "COLLABORATOR";
  return "CUSTOMER";
}

export async function GET(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const db = await getDbClient();
  if (!db) return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const role = (searchParams.get("role") ?? "ALL").toUpperCase();
  const status = (searchParams.get("status") ?? "ALL").toUpperCase();
  const orderFilter = (searchParams.get("orderFilter") ?? "ALL").toUpperCase();
  const sort = (searchParams.get("sort") ?? "NEWEST").toUpperCase();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(10, Number(searchParams.get("pageSize") ?? "20")));

  const [admins, customers, orderAgg] = await Promise.all([
    db.admin.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        username: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        role: { select: { name: true } },
      },
    }),
    db.customer.findMany({
      where: { isGuest: false },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.order.groupBy({
      by: ["customerId"],
      _count: { customerId: true },
      where: { customerId: { not: null } },
    }),
  ]);

  const orderCountByCustomer = new Map(orderAgg.map((row) => [row.customerId ?? "", row._count.customerId]));
  const rows: AdminAccountListItem[] = [
    ...admins.map((admin) => ({
      id: admin.id,
      scope: "admin" as const,
      fullName: admin.fullName,
      email: admin.email,
      phone: admin.username ?? "",
      role: normalizeRole(admin.role.name),
      status: mapAdminStatus(admin.status),
      createdAt: admin.createdAt.toISOString(),
      updatedAt: admin.updatedAt.toISOString(),
      lastLoginAt: admin.lastLoginAt ? admin.lastLoginAt.toISOString() : null,
      orderCount: 0,
    })),
    ...customers.map((customer) => ({
      id: customer.id,
      scope: "customer" as const,
      fullName: customer.fullName?.trim() || "Khách hàng chưa đặt tên",
      email: customer.email?.trim() || "",
      phone: customer.phone?.trim() || "",
      role: mapCustomerRole(customer.notes),
      status: mapCustomerStatus(customer.notes),
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
      lastLoginAt: null,
      orderCount: orderCountByCustomer.get(customer.id) ?? 0,
    })),
  ];

  const filtered = rows.filter((row) => {
    const matchQ =
      !q ||
      row.fullName.toLowerCase().includes(q) ||
      row.email.toLowerCase().includes(q) ||
      row.phone.toLowerCase().includes(q);
    const matchRole = role === "ALL" || row.role === role;
    const matchStatus = status === "ALL" || row.status === status;
    const matchOrder =
      orderFilter === "ALL" ||
      (orderFilter === "HAS_ORDER" && row.orderCount > 0) ||
      (orderFilter === "NO_ORDER" && row.orderCount === 0);
    return matchQ && matchRole && matchStatus && matchOrder;
  });

  filtered.sort((a, b) => {
    if (sort === "OLDEST") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sort === "LAST_LOGIN") return new Date(b.lastLoginAt ?? 0).getTime() - new Date(a.lastLoginAt ?? 0).getTime();
    if (sort === "MOST_ORDERS") return b.orderCount - a.orderCount;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const payload: AccountListResponse = {
    items: paged,
    total,
    page: safePage,
    pageSize,
    totalPages,
    stats: {
      totalAccounts: rows.length,
      customers: rows.filter((row) => row.role === "CUSTOMER").length,
      collaborators: rows.filter((row) => row.role === "COLLABORATOR").length,
      admins: rows.filter((row) => row.role === "ADMIN").length,
      active: rows.filter((row) => row.status === "ACTIVE").length,
      locked: rows.filter((row) => row.status === "LOCKED").length,
    },
    canManageUsers: session.user.role === "SUPER_ADMIN",
  };

  return NextResponse.json(payload);
}
