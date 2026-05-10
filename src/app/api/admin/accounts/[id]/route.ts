import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { authOptions } from "../../../../../lib/auth";
import type { AccountRole, AccountSource, AccountStatus } from "../../../../../lib/admin-account";

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

function parseCustomerStatus(notes: string | null): AccountStatus {
  if ((notes ?? "").includes("[SOFT_DELETED]")) return "SOFT_DELETED";
  if ((notes ?? "").includes("[LOCKED]")) return "LOCKED";
  return "ACTIVE";
}

function parseCustomerRole(notes: string | null): AccountRole {
  if ((notes ?? "").includes("[CTV]")) return "COLLABORATOR";
  return "CUSTOMER";
}

function mergeCustomerFlags(notes: string | null, updates: { status?: AccountStatus; role?: AccountRole }): string {
  const current = notes ?? "";
  let next = current.replace(/\[SOFT_DELETED\]|\[LOCKED\]|\[CTV\]|\[CTV_PAUSED\]|\[CTV_LOCKED\]/g, "").trim();
  if (updates.status === "SOFT_DELETED") next = `${next} [SOFT_DELETED]`.trim();
  if (updates.status === "LOCKED") next = `${next} [LOCKED]`.trim();
  if (updates.role === "COLLABORATOR") next = `${next} [CTV]`.trim();
  return next;
}

function parseCtvStatus(notes: string | null): "ACTIVE" | "PAUSED" | "LOCKED" | "NONE" {
  const value = notes ?? "";
  if (!value.includes("[CTV]")) return "NONE";
  if (value.includes("[CTV_LOCKED]")) return "LOCKED";
  if (value.includes("[CTV_PAUSED]")) return "PAUSED";
  return "ACTIVE";
}

function ensureCtvRefCode(notes: string | null): string {
  const current = notes ?? "";
  const matched = current.match(/\[CTV_REF:([A-Z0-9]+)\]/);
  if (matched?.[1]) return current;
  const code = `CTV${Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)}`;
  return `${current} [CTV_REF:${code}]`.trim();
}

export async function GET(_: Request, { params }: { params: ParamsInput }): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ message: "Bạn không có quyền truy cập khu vực này." }, { status: 403 });
  }
  const db = await getDbClient();
  if (!db) return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });
  const { id } = await params;

  const admin = await db.admin.findUnique({
    where: { id },
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
  });
  if (admin) {
    const sources: AccountSource[] = ["EMAIL"];
    return NextResponse.json({
      item: {
        id: admin.id,
        scope: "admin",
        fullName: admin.fullName,
        email: admin.email,
        phone: admin.username ?? "",
        role: admin.role.name === "SUPER_ADMIN" || admin.role.name === "ADMIN" ? "ADMIN" : "COLLABORATOR",
        status: admin.status === "ACTIVE" ? "ACTIVE" : "LOCKED",
        createdAt: admin.createdAt.toISOString(),
        updatedAt: admin.updatedAt.toISOString(),
        lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
        loginSources: sources,
        orderCount: 0,
        orders: [],
        addresses: [],
        ctvStatus: admin.role.name === "CONTENT_MANAGER" ? "ACTIVE" : "NONE",
      },
      guards: {
        isSelf: session.user.id === admin.id,
        isRootAdmin: admin.email === "admin@zendo.vn",
        canManageAccess: session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN",
      },
    });
  }

  const customer = await db.customer.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      passwordHash: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      orders: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, code: true, orderStatus: true, totalAmount: true, createdAt: true },
      },
      addresses: {
        orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
        take: 10,
        select: {
          id: true,
          fullName: true,
          phone: true,
          city: true,
          district: true,
          ward: true,
          line1: true,
          line2: true,
          isDefault: true,
        },
      },
    },
  });
  if (!customer) return NextResponse.json({ message: "Không tìm thấy tài khoản." }, { status: 404 });

  const notes = customer.notes ?? "";
  const sources: AccountSource[] = [];
  if (customer.passwordHash) sources.push("EMAIL");
  if (notes.includes("[GOOGLE]")) sources.push("GOOGLE");
  if (notes.includes("[FACEBOOK]")) sources.push("FACEBOOK");
  if (!sources.length) sources.push("EMAIL");

  return NextResponse.json({
    item: {
      id: customer.id,
      scope: "customer",
      fullName: customer.fullName?.trim() || "Khách hàng chưa đặt tên",
      email: customer.email?.trim() || "",
      phone: customer.phone?.trim() || "",
      role: parseCustomerRole(customer.notes),
      status: parseCustomerStatus(customer.notes),
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
      lastLoginAt: null,
      loginSources: sources.length > 1 ? ["MIXED"] : sources,
      orderCount: customer.orders.length,
      orders: customer.orders.map((order) => ({
        id: order.id,
        code: order.code,
        status: order.orderStatus,
        totalAmount: Number(order.totalAmount),
        createdAt: order.createdAt.toISOString(),
      })),
      addresses: customer.addresses.map((address) => ({
        id: address.id,
        fullName: address.fullName,
        phone: address.phone,
        text: `${address.line1}${address.line2 ? `, ${address.line2}` : ""}, ${address.ward ? `${address.ward}, ` : ""}${address.district}, ${address.city}`,
        isDefault: address.isDefault,
      })),
      ctvStatus: parseCtvStatus(customer.notes),
    },
    guards: {
      isSelf: false,
      isRootAdmin: false,
      canManageAccess: session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN",
    },
  });
}

export async function PATCH(request: Request, { params }: { params: ParamsInput }): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ message: "Bạn không có quyền thực hiện thao tác này." }, { status: 403 });
  }
  const db = await getDbClient();
  if (!db) return NextResponse.json({ message: "Hệ thống chưa cấu hình cơ sở dữ liệu." }, { status: 503 });
  const { id } = await params;
  const body = (await request.json()) as {
    action: "update_profile" | "set_password" | "set_status" | "set_role";
    fullName?: string;
    phone?: string;
    password?: string;
    status?: AccountStatus;
    role?: AccountRole;
  };

  const admin = await db.admin.findUnique({
    where: { id },
    select: { id: true, email: true, roleId: true, role: { select: { name: true } } },
  });
  if (admin) {
    if (body.action === "set_status") {
      if (session.user.id === admin.id) {
        return NextResponse.json({ message: "Không thể tự khóa tài khoản của chính bạn." }, { status: 400 });
      }
      if (admin.email === "admin@zendo.vn") {
        return NextResponse.json({ message: "Không thể khóa tài khoản admin gốc." }, { status: 400 });
      }
      await db.admin.update({
        where: { id: admin.id },
        data: { status: body.status === "ACTIVE" ? "ACTIVE" : "INACTIVE" },
      });
      return NextResponse.json({ success: true });
    }
    if (body.action === "set_role") {
      if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
        return NextResponse.json({ message: "Chỉ quản trị viên mới được cập nhật quyền truy cập." }, { status: 403 });
      }
      const activeAdmins = await db.admin.count({
        where: { status: "ACTIVE", role: { name: { in: ["SUPER_ADMIN", "ADMIN"] } } },
      });
      if (
        (admin.role.name === "SUPER_ADMIN" || admin.role.name === "ADMIN") &&
        body.role !== "ADMIN" &&
        activeAdmins <= 1
      ) {
        return NextResponse.json({ message: "Không thể hạ quyền admin cuối cùng." }, { status: 400 });
      }
      if (admin.email === "admin@zendo.vn" && body.role !== "ADMIN") {
        return NextResponse.json({ message: "Không thể hạ quyền admin gốc." }, { status: 400 });
      }
      if (session.user.id === admin.id && body.role !== "ADMIN") {
        return NextResponse.json({ message: "Không thể tự gỡ quyền quản trị của chính bạn." }, { status: 400 });
      }
      const nextRole = await db.role.findFirst({
        where:
          body.role === "ADMIN"
            ? { name: { in: ["SUPER_ADMIN", "ADMIN"] } }
            : body.role === "COLLABORATOR"
              ? { name: "CONTENT_MANAGER" }
              : { name: "CONTENT_MANAGER" },
        select: { id: true },
      });
      if (!nextRole) return NextResponse.json({ message: "Không tìm thấy vai trò phù hợp." }, { status: 400 });
      await db.admin.update({ where: { id: admin.id }, data: { roleId: nextRole.id } });
      return NextResponse.json({ success: true });
    }
    if (body.action === "set_password") {
      if (!body.password || body.password.length < 8) {
        return NextResponse.json({ message: "Mật khẩu phải có ít nhất 8 ký tự." }, { status: 400 });
      }
      await db.admin.update({
        where: { id: admin.id },
        data: { passwordHash: await hash(body.password, 12) },
      });
      return NextResponse.json({ success: true });
    }
    if (body.action === "update_profile") {
      await db.admin.update({
        where: { id: admin.id },
        data: { fullName: (body.fullName ?? "").trim(), username: (body.phone ?? "").trim() || null },
      });
      return NextResponse.json({ success: true });
    }
  }

  const customer = await db.customer.findUnique({
    where: { id },
    select: { id: true, notes: true, email: true, fullName: true, phone: true },
  });
  if (!customer) return NextResponse.json({ message: "Không tìm thấy tài khoản." }, { status: 404 });
  if (body.action === "set_password") {
    if (!body.password || body.password.length < 8) {
      return NextResponse.json({ message: "Mật khẩu phải có ít nhất 8 ký tự." }, { status: 400 });
    }
    await db.customer.update({
      where: { id: customer.id },
      data: { passwordHash: await hash(body.password, 12) },
    });
    return NextResponse.json({ success: true });
  }
  if (body.action === "update_profile") {
    await db.customer.update({
      where: { id: customer.id },
      data: { fullName: (body.fullName ?? "").trim(), phone: (body.phone ?? "").trim() || null },
    });
    return NextResponse.json({ success: true });
  }
  if (body.action === "set_status") {
    const nextNotes = mergeCustomerFlags(customer.notes, { status: body.status });
    await db.customer.update({ where: { id: customer.id }, data: { notes: nextNotes } });
    return NextResponse.json({ success: true });
  }
  if (body.action === "set_role") {
    if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ message: "Chỉ quản trị viên mới được cập nhật quyền truy cập." }, { status: 403 });
    }
    const nextNotes = mergeCustomerFlags(customer.notes, { role: body.role });
    await db.customer.update({ where: { id: customer.id }, data: { notes: nextNotes } });
    return NextResponse.json({ success: true });
  }
  if (body.action === "promote_ctv") {
    if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ message: "Chỉ quản trị viên mới được nâng thành CTV." }, { status: 403 });
    }
    let nextNotes = mergeCustomerFlags(customer.notes, { role: "COLLABORATOR" });
    nextNotes = ensureCtvRefCode(nextNotes);
    await db.customer.update({ where: { id: customer.id }, data: { notes: nextNotes } });
    return NextResponse.json({ success: true, message: "Đã nâng tài khoản thành cộng tác viên." });
  }
  if (body.action === "remove_ctv") {
    if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ message: "Chỉ quản trị viên mới được gỡ CTV." }, { status: 403 });
    }
    const orderCount = await db.order.count({ where: { customerId: customer.id } });
    const hasHistory = orderCount > 0;
    let nextNotes = customer.notes ?? "";
    if (hasHistory) {
      nextNotes = nextNotes.replace(/\[CTV_LOCKED\]/g, "").trim();
      if (!nextNotes.includes("[CTV]")) nextNotes = `${nextNotes} [CTV]`.trim();
      if (!nextNotes.includes("[CTV_PAUSED]")) nextNotes = `${nextNotes} [CTV_PAUSED]`.trim();
    } else {
      nextNotes = nextNotes.replace(/\[CTV\]|\[CTV_PAUSED\]|\[CTV_LOCKED\]/g, "").trim();
    }
    await db.customer.update({ where: { id: customer.id }, data: { notes: nextNotes } });
    return NextResponse.json({ success: true, message: "Đã cập nhật trạng thái cộng tác viên." });
  }
  if (body.action === "grant_admin") {
    if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ message: "Chỉ quản trị viên mới được cấp quyền quản trị." }, { status: 403 });
    }
    const existingAdmin = await db.admin.findUnique({
      where: { email: customer.email ?? "" },
      select: { id: true },
    });
    if (existingAdmin) {
      return NextResponse.json({ message: "Tài khoản này đã có quyền quản trị." }, { status: 400 });
    }
    if (!customer.email) {
      return NextResponse.json({ message: "Tài khoản chưa có email nên không thể cấp quyền quản trị." }, { status: 400 });
    }
    const adminRole = await db.role.findFirst({
      where: { name: { in: ["ADMIN", "SUPER_ADMIN"] } },
      select: { id: true },
    });
    if (!adminRole) {
      return NextResponse.json({ message: "Không tìm thấy vai trò quản trị." }, { status: 400 });
    }
    await db.admin.create({
      data: {
        email: customer.email.toLowerCase(),
        fullName: customer.fullName?.trim() || "Quản trị viên",
        username: customer.phone?.trim() || undefined,
        passwordHash: await hash(Math.random().toString(36).slice(2) + "Admin@123", 12),
        roleId: adminRole.id,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    return NextResponse.json({ success: true, message: "Đã cấp quyền quản trị viên." });
  }
  if (body.action === "revoke_admin") {
    if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ message: "Chỉ quản trị viên mới được gỡ quyền quản trị." }, { status: 403 });
    }
    const targetAdmin = await db.admin.findFirst({
      where: { email: customer.email ?? "" },
      select: { id: true, email: true, role: { select: { name: true } } },
    });
    if (!targetAdmin) {
      return NextResponse.json({ message: "Tài khoản này chưa có quyền quản trị." }, { status: 400 });
    }
    if (targetAdmin.email === "admin@zendo.vn") {
      return NextResponse.json({ message: "Không thể gỡ quyền admin gốc." }, { status: 400 });
    }
    const activeAdmins = await db.admin.count({
      where: { status: "ACTIVE", role: { name: { in: ["SUPER_ADMIN", "ADMIN"] } } },
    });
    if (activeAdmins <= 1) {
      return NextResponse.json({ message: "Không thể gỡ admin cuối cùng trong hệ thống." }, { status: 400 });
    }
    if (session.user.email === targetAdmin.email) {
      return NextResponse.json({ message: "Không thể tự gỡ quyền quản trị của chính bạn." }, { status: 400 });
    }
    await db.admin.delete({ where: { id: targetAdmin.id } });
    return NextResponse.json({ success: true, message: "Đã cập nhật quyền quản trị." });
  }
  return NextResponse.json({ message: "Hành động không hợp lệ." }, { status: 400 });
}
