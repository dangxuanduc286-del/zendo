import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";

type AddressPayload = {
  receiverName?: string;
  phone?: string;
  province?: string;
  district?: string;
  ward?: string;
  detail?: string;
  isDefault?: boolean;
};

function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

function isValidVnPhone(value: string): boolean {
  return /^(\+84|84|0)(3|5|7|8|9)\d{8}$/.test(value);
}

function validateAddress(input: AddressPayload): string {
  if (!String(input.receiverName || "").trim()) return "Vui lòng nhập họ tên người nhận.";
  const phone = normalizePhone(String(input.phone || ""));
  if (!isValidVnPhone(phone)) return "Vui lòng nhập số điện thoại hợp lệ.";
  if (
    !String(input.province || "").trim() ||
    !String(input.district || "").trim() ||
    !String(input.ward || "").trim() ||
    !String(input.detail || "").trim()
  ) {
    return "Vui lòng nhập đầy đủ địa chỉ.";
  }
  return "";
}

async function resolveCustomerId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "USER") return null;
  const dbModule = await import("../../../../../lib/db");
  const db = dbModule.db;
  const byId = await db.customer.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (byId) return byId.id;
  const email = String(session.user.email || "").trim().toLowerCase();
  if (email) {
    const byEmail = await db.customer.findFirst({ where: { email }, select: { id: true } });
    if (byEmail) return byEmail.id;
  }
  const phone = normalizePhone(String(session.user.name || ""));
  if (phone) {
    const byPhone = await db.customer.findFirst({ where: { phone }, select: { id: true } });
    if (byPhone) return byPhone.id;
  }
  return null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const customerId = await resolveCustomerId();
    if (!customerId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const body = (await request.json()) as AddressPayload;
    const validationMessage = validateAddress(body);
    if (validationMessage) return NextResponse.json({ message: validationMessage }, { status: 400 });

    const dbModule = await import("../../../../../lib/db");
    const db = dbModule.db;
    const current = await db.address.findFirst({
      where: { id, customerId },
      select: { id: true },
    });
    if (!current) return NextResponse.json({ message: "Không tìm thấy địa chỉ." }, { status: 404 });
    const isDefault = Boolean(body.isDefault);

    await db.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({
          where: { customerId, isDefault: true },
          data: { isDefault: false },
        });
      }
      await tx.address.update({
        where: { id },
        data: {
          fullName: String(body.receiverName || "").trim(),
          phone: normalizePhone(String(body.phone || "")),
          city: String(body.province || "").trim(),
          district: String(body.district || "").trim(),
          ward: String(body.ward || "").trim(),
          line1: String(body.detail || "").trim(),
          isDefault,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { message: "Không thể lưu địa chỉ. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const customerId = await resolveCustomerId();
    if (!customerId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const dbModule = await import("../../../../../lib/db");
    const db = dbModule.db;

    const current = await db.address.findFirst({
      where: { id, customerId },
      select: { id: true, isDefault: true },
    });
    if (!current) return NextResponse.json({ message: "Không tìm thấy địa chỉ." }, { status: 404 });

    await db.$transaction(async (tx) => {
      await tx.address.delete({ where: { id } });
      if (current.isDefault) {
        const next = await tx.address.findFirst({
          where: { customerId },
          orderBy: [{ updatedAt: "desc" }],
          select: { id: true },
        });
        if (next) {
          await tx.address.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Không thể xóa địa chỉ. Vui lòng thử lại." }, { status: 500 });
  }
}
