import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import {
  getAccountOrderTimeline,
  getOrderStatusGroup,
  getOrderStatusLabel,
  getOrderStatusTone,
} from "../../../../../lib/order-status";

type ParamsInput = Promise<{ id: string }>;

export async function GET(_request: Request, segment: { params: ParamsInput }): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "USER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
    }

    const { id: orderId } = await Promise.resolve(segment.params);
    if (!orderId?.trim()) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const dbModule = await import("../../../../../lib/db");
    const { db } = dbModule;

    const order = await db.order.findFirst({
      where: {
        id: orderId.trim(),
        customerId: session.user.id,
      },
      select: {
        id: true,
        code: true,
        orderStatus: true,
        paymentStatus: true,
        paymentMethod: true,
        subtotal: true,
        discountAmount: true,
        shippingFee: true,
        totalAmount: true,
        createdAt: true,
        updatedAt: true,
        canceledAt: true,
        cancelReason: true,
        note: true,
        customerFullName: true,
        customerPhone: true,
        customerEmail: true,
        shippingProvinceCode: true,
        shippingCity: true,
        shippingDistrictCode: true,
        shippingDistrict: true,
        shippingWardCode: true,
        shippingWard: true,
        shippingLine1: true,
        shippingLine2: true,
        shippingFullAddress: true,
        coupon: {
          select: {
            code: true,
            name: true,
          },
        },
        items: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            productId: true,
            productSlug: true,
            productName: true,
            sku: true,
            variantName: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            product: {
              select: {
                images: {
                  orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
                  take: 1,
                  select: { url: true, altText: true },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const timeline = getAccountOrderTimeline(order.orderStatus);

    return NextResponse.json({
      order: {
        id: order.id,
        code: order.code,
        orderStatus: order.orderStatus,
        statusLabel: getOrderStatusLabel(order.orderStatus),
        statusTone: getOrderStatusTone(order.orderStatus),
        statusGroup: getOrderStatusGroup(order.orderStatus),
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        amounts: {
          subtotal: Number(order.subtotal),
          discount: Number(order.discountAmount),
          shippingFee: Number(order.shippingFee),
          total: Number(order.totalAmount),
        },
        coupon: order.coupon
          ? {
              code: order.coupon.code,
              name: order.coupon.name,
            }
          : null,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        canceledAt: order.canceledAt?.toISOString() ?? null,
        cancelReason: order.cancelReason?.trim() || null,
        note: order.note?.trim() || null,
        recipient: {
          fullName: order.customerFullName,
          phone: order.customerPhone,
          email: order.customerEmail,
          provinceCode: order.shippingProvinceCode,
          city: order.shippingCity,
          districtCode: order.shippingDistrictCode,
          district: order.shippingDistrict,
          wardCode: order.shippingWardCode,
          ward: order.shippingWard,
          line1: order.shippingLine1,
          line2: order.shippingLine2,
          fullAddress: order.shippingFullAddress || null,
        },
        timeline,
        items: order.items.map((it) => {
          const img = it.product?.images?.[0];
          return {
            id: it.id,
            productId: it.productId,
            slug: it.productSlug,
            name: it.productName,
            sku: it.sku,
            variantName: it.variantName,
            quantity: it.quantity,
            unitPrice: Number(it.unitPrice),
            lineTotal: Number(it.totalPrice),
            imageUrl: img?.url?.trim() || "",
            imageAlt: img?.altText?.trim() || it.productName,
          };
        }),
      },
    });
  } catch {
    return NextResponse.json({ message: "Không thể tải đơn hàng." }, { status: 500 });
  }
}
