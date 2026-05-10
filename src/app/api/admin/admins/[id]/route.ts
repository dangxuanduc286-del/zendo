import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { authOptions } from "../../../../../lib/auth";
import { updateAdminFormSchema } from "../../../../../lib/admin-user";

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

function mapAdmin(row: {
  id: string;
  fullName: string;
  email: string;
  roleId: string;
  role: { name: string };
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  updatedAt: Date;
}) {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    roleId: row.roleId,
    roleName: row.role.name,
    status: row.status,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(
  _: Request,
  { params }: { params: ParamsInput },
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const db = await getDbClient();
    if (!db) {
      return NextResponse.json(
        { message: "Hệ thống chưa cấu hình cơ sở dữ liệu." },
        { status: 503 },
      );
    }

    const [admin, roles] = await Promise.all([
      db.admin.findUnique({
        where: { id: resolvedParams.id },
        select: {
          id: true,
          fullName: true,
          email: true,
          roleId: true,
          status: true,
          updatedAt: true,
          role: { select: { name: true } },
        },
      }),
      db.role.findMany({
        orderBy: [{ name: "asc" }],
        select: { id: true, name: true, slug: true },
      }),
    ]);

    if (!admin) {
      return NextResponse.json({ message: "Không tìm thấy quản trị viên." }, { status: 404 });
    }

    return NextResponse.json({
      item: mapAdmin(admin),
      roles,
      canManageUsers: session.user.role === "SUPER_ADMIN",
      isSelf: session.user.id === admin.id,
    });
  } catch {
    return NextResponse.json({ message: "Không thể tải chi tiết quản trị viên." }, { status: 500 });
  }
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
    const adminId = resolvedParams.id;
    const body = (await request.json()) as unknown;
    const parsed = updateAdminFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Du lieu cap nhat khong hop le." },
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

    const existing = await db.admin.findUnique({
      where: { id: adminId },
      select: { id: true, roleId: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ message: "Không tìm thấy quản trị viên." }, { status: 404 });
    }

    const isSuperAdmin = session.user.role === "SUPER_ADMIN";
    const isSelf = session.user.id === adminId;
    const values = parsed.data;

    if (!isSuperAdmin && !isSelf) {
      return NextResponse.json({ message: "Ban khong co quyen cap nhat admin nay." }, { status: 403 });
    }

    if (!isSuperAdmin && values.roleId !== existing.roleId) {
      return NextResponse.json({ message: "Chi super admin moi duoc doi role." }, { status: 403 });
    }

    if (!isSuperAdmin && values.status !== existing.status) {
      return NextResponse.json(
        { message: "Chỉ siêu quản trị viên mới được khóa/mở khóa tài khoản." },
        { status: 403 },
      );
    }

    const email = values.email.toLowerCase();
    const duplicated = await db.admin.findUnique({
      where: { email },
      select: { id: true },
    });
    if (duplicated && duplicated.id !== adminId) {
      return NextResponse.json({ message: "Email admin da ton tai." }, { status: 409 });
    }

    if (values.roleId !== existing.roleId) {
      const roleExists = await db.role.findUnique({
        where: { id: values.roleId },
        select: { id: true },
      });
      if (!roleExists) {
        return NextResponse.json({ message: "Role khong ton tai." }, { status: 400 });
      }
    }

    const nextPasswordHash = values.password ? await hash(values.password, 12) : undefined;

    const updated = await db.admin.update({
      where: { id: adminId },
      data: {
        fullName: values.fullName,
        email,
        roleId: values.roleId,
        status: values.status,
        ...(nextPasswordHash ? { passwordHash: nextPasswordHash } : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        roleId: true,
        status: true,
        updatedAt: true,
        role: { select: { name: true } },
      },
    });


    return NextResponse.json({ item: mapAdmin(updated) });
  } catch {
    return NextResponse.json({ message: "Không thể cập nhật quản trị viên." }, { status: 500 });
  }
}

