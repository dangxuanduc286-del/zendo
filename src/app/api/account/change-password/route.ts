import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "../../../../lib/auth";
import { hashPassword, verifyPassword } from "../../../../lib/password";
import { publishCustomerPasswordChanged } from "../../../../lib/system-account-notifications";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại."),
    newPassword: z.string().min(8, "Mật khẩu mới phải có ít nhất 8 ký tự."),
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu mới."),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Mật khẩu mới và nhập lại mật khẩu mới phải khớp.",
      });
    }
    if (data.currentPassword === data.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "Mật khẩu mới không được trùng mật khẩu cũ.",
      });
    }
  });

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Bạn cần đăng nhập để đổi mật khẩu." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
      { status: 400 },
    );
  }

  const db = await getDbClient();
  if (!db) {
    return NextResponse.json({ message: "Hệ thống chưa sẵn sàng." }, { status: 503 });
  }

  const { currentPassword, newPassword } = parsed.data;
  const role = session.user.role;

  if (role === "ADMIN" || role === "SUPER_ADMIN" || role === "CONTENT_MANAGER") {
    const admin = await db.admin.findUnique({
      where: { id: session.user.id },
      select: { id: true, passwordHash: true },
    });
    if (!admin) {
      return NextResponse.json({ message: "Không tìm thấy tài khoản quản trị." }, { status: 404 });
    }

    const ok = await verifyPassword(currentPassword, admin.passwordHash);
    if (!ok) {
      return NextResponse.json({ message: "Mật khẩu hiện tại không đúng." }, { status: 400 });
    }

    const nextHash = await hashPassword(newPassword);
    await db.admin.update({
      where: { id: admin.id },
      data: { passwordHash: nextHash },
      select: { id: true },
    });

    return NextResponse.json({ success: true, message: "Đổi mật khẩu thành công." });
  }

  const customer = await db.customer.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true },
  });
  if (!customer) {
    return NextResponse.json({ message: "Không tìm thấy tài khoản người dùng." }, { status: 404 });
  }

  if (!customer.passwordHash) {
    const nextHash = await hashPassword(newPassword);
    await db.customer.update({
      where: { id: customer.id },
      data: { passwordHash: nextHash },
      select: { id: true },
    });
    publishCustomerPasswordChanged({ customerId: customer.id });
    return NextResponse.json({
      success: true,
      message:
        "Tài khoản này đang đăng nhập bằng Google/Facebook. Bạn có thể đặt mật khẩu mới nếu muốn đăng nhập bằng mật khẩu.",
    });
  }

  const validCurrent = await verifyPassword(currentPassword, customer.passwordHash);
  if (!validCurrent) {
    return NextResponse.json({ message: "Mật khẩu hiện tại không đúng." }, { status: 400 });
  }

  const nextHash = await hashPassword(newPassword);
  await db.customer.update({
    where: { id: customer.id },
    data: { passwordHash: nextHash },
    select: { id: true },
  });

  publishCustomerPasswordChanged({ customerId: customer.id });

  return NextResponse.json({ success: true, message: "Đổi mật khẩu thành công." });
}
