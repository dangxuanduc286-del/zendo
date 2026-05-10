import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { authOptions } from "../../../../lib/auth";
import { createAdminFormSchema } from "../../../../lib/admin-user";

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../lib/db");
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

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const db = await getDbClient();
    if (!db) {
      return NextResponse.json(
        { message: "Hệ thống chưa cấu hình cơ sở dữ liệu." },
        { status: 503 },
      );
    }

    const [rows, roles] = await Promise.all([
      db.admin.findMany({
        orderBy: [{ updatedAt: "desc" }],
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


    return NextResponse.json({
      items: rows.map(mapAdmin),
      roles,
      canManageUsers: session.user.role === "SUPER_ADMIN",
    });
  } catch {
    return NextResponse.json({ message: "Không thể tải danh sách quản trị viên." }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Ban khong co quyen tao admin moi." }, { status: 403 });
    }

    const body = (await request.json()) as unknown;
    const parsed = createAdminFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Du lieu khong hop le." },
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

    const values = parsed.data;
    const email = values.email.toLowerCase();

    const roleExists = await db.role.findUnique({
      where: { id: values.roleId },
      select: { id: true },
    });
    if (!roleExists) {
      return NextResponse.json({ message: "Role khong ton tai." }, { status: 400 });
    }

    const existed = await db.admin.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existed) {
      return NextResponse.json({ message: "Email admin da ton tai." }, { status: 409 });
    }

    const passwordHash = await hash(values.password, 12);
    const created = await db.admin.create({
      data: {
        fullName: values.fullName,
        email,
        passwordHash,
        roleId: values.roleId,
        status: values.status,
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


    return NextResponse.json({ item: mapAdmin(created) }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Không thể tạo quản trị viên mới." }, { status: 500 });
  }
}

