import { NextResponse } from "next/server";
import { resolveMediaUrl } from "../../../../lib/media";

interface LookupPayload {
  orderCode: string;
  phone: string;
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d]/g, "");
}

function validateOrderCode(value: string): boolean {
  return /^[A-Z0-9-]{6,32}$/.test(value);
}

function validatePhone(value: string): boolean {
  const normalized = normalizePhone(value);
  return normalized.length >= 8 && normalized.length <= 15;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const payload = (await request.json()) as LookupPayload;
    const orderCode = String(payload.orderCode ?? "").trim().toUpperCase();
    const phone = String(payload.phone ?? "").trim();
    const normalizedPhone = normalizePhone(phone);


    if (!validateOrderCode(orderCode) || !validatePhone(phone)) {
      return NextResponse.json({ message: "Thong tin tra cuu khong hop le." }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { message: "Hệ thống tra cứu chưa được cấu hình cơ sở dữ liệu." },
        { status: 503 },
      );
    }

    const dbModule = await import("../../../../lib/db");
    const { db } = dbModule;

    const order = await db.order.findUnique({
      where: { code: orderCode },
      select: {
        code: true,
        createdAt: true,
        orderStatus: true,
        paymentStatus: true,
        totalAmount: true,
        customerPhone: true,
        items: {
          select: {
            id: true,
            productName: true,
            productSlug: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            product: {
              select: {
                images: {
                  select: { url: true, isPrimary: true, sortOrder: true },
                  orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
                  take: 1,
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const phoneMatched =
      order != null && normalizePhone(order.customerPhone ?? "") === normalizedPhone;


    if (!order || !phoneMatched) {
      return NextResponse.json({ message: "Không tìm thấy đơn hàng phù hợp." }, { status: 404 });
    }

    return NextResponse.json({
      code: order.code,
      createdAt: order.createdAt,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      totalAmount: Number(order.totalAmount),
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        productSlug: item.productSlug,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        imageUrl: resolveMediaUrl(item.product?.images[0]?.url ?? ""),
      })),
    });
  } catch {

    return NextResponse.json(
      { message: "Không thể tra cứu đơn hàng lúc này." },
      { status: 500 },
    );
  }
}
