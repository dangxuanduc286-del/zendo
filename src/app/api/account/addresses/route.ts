import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";

type AddressPayload = {
  receiverName?: string;
  phone?: string;
  province?: string;
  district?: string;
  ward?: string;
  detail?: string;
  isDefault?: boolean;
};

function normalizeAddressField(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

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
  const dbModule = await import("../../../../lib/db");
  const db = dbModule.db;
  const byId = await db.customer.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (byId) return byId.id;
  const email = String(session.user.email || "").trim().toLowerCase();
  if (email) {
    const byEmail = await db.customer.findFirst({
      where: { email },
      select: { id: true },
    });
    if (byEmail) return byEmail.id;
  }
  const phone = normalizePhone(String(session.user.name || ""));
  if (phone) {
    const byPhone = await db.customer.findFirst({
      where: { phone },
      select: { id: true },
    });
    if (byPhone) return byPhone.id;
  }
  return null;
}

async function getAddressList(customerId: string) {
  const dbModule = await import("../../../../lib/db");
  const db = dbModule.db;
  const rows = await db.address.findMany({
    where: { customerId },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      fullName: true,
      phone: true,
      city: true,
      district: true,
      ward: true,
      line1: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    receiverName: row.fullName,
    phone: row.phone,
    province: row.city,
    district: row.district,
    ward: row.ward ?? "",
    detail: row.line1,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function GET(): Promise<NextResponse> {
  try {
    const customerId = await resolveCustomerId();
    if (!customerId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const items = await getAddressList(customerId);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ message: "Không thể tải địa chỉ." }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const customerId = await resolveCustomerId();
    if (!customerId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const body = (await request.json()) as AddressPayload;
    const validationMessage = validateAddress(body);
    if (validationMessage) {
      return NextResponse.json({ message: validationMessage }, { status: 400 });
    }

    const dbModule = await import("../../../../lib/db");
    const db = dbModule.db;
    const isDefault = Boolean(body.isDefault);
    await db.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({
          where: { customerId, isDefault: true },
          data: { isDefault: false },
        });
      }
      const count = await tx.address.count({ where: { customerId } });
      const fullName = normalizeAddressField(String(body.receiverName || ""));
      const phone = normalizePhone(String(body.phone || ""));
      const city = normalizeAddressField(String(body.province || ""));
      const district = normalizeAddressField(String(body.district || ""));
      const ward = normalizeAddressField(String(body.ward || ""));
      const line1 = normalizeAddressField(String(body.detail || ""));

      const existing = await tx.address.findFirst({
        where: {
          customerId,
          phone,
          fullName: { equals: fullName, mode: "insensitive" },
          city: { equals: city, mode: "insensitive" },
          district: { equals: district, mode: "insensitive" },
          ward: ward ? { equals: ward, mode: "insensitive" } : null,
          line1: { equals: line1, mode: "insensitive" },
        },
        select: { id: true, isDefault: true },
      });

      if (existing?.id) {
        const nextDefault = isDefault || count === 0 || existing.isDefault;
        await tx.address.update({
          where: { id: existing.id },
          data: { isDefault: nextDefault },
          select: { id: true },
        });
      } else {
        await tx.address.create({
          data: {
            customerId,
            fullName,
            phone,
            city,
            district,
            ward: ward || null,
            line1,
            isDefault: isDefault || count === 0,
          },
        });
      }
    });

    const items = await getAddressList(customerId);
    return NextResponse.json({ ok: true, items });
  } catch {
    return NextResponse.json(
      { message: "Không thể lưu địa chỉ. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
