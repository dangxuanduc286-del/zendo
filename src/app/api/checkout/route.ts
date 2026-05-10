import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { PaymentMethod } from "@prisma/client";
import { getServerSession } from "next-auth";
import { calcSubtotal, getUnitPrice, normalizeCartItem } from "../../../lib/cart";
import { computeGuestCoupon } from "../../../lib/coupon";
import { ghiSuKienAnalytics } from "../../../lib/analytics/event-service";
import { authOptions } from "../../../lib/auth";
import { effectiveAffiliateBlockMessage, isCustomerBuyer } from "../../../lib/account-role";
import { resolveAffiliateProfileByRefCode, resolveCustomerAffiliateProfile } from "../../../lib/affiliate-customer-status";
import { createPendingAffiliateCommissionForOrder } from "../../../lib/affiliate-commission-lifecycle";
import { ZENDO_AF_REF_COOKIE } from "../../../lib/affiliate-referral-cookie";
import { getWebsiteSettings } from "../../../lib/settings";

interface CheckoutPayload {
  fullName: string;
  phone: string;
  email?: string;
  provinceCode?: string;
  provinceName?: string;
  districtCode?: string;
  districtName?: string;
  wardCode?: string;
  wardName?: string;
  addressLine?: string;
  fullAddress?: string;
  city?: string;
  district?: string;
  ward?: string;
  line1?: string;
  note?: string;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  visitorKey?: string;
  sessionKey?: string;
  affiliateRefCode?: string;
  items: unknown[];
}

function toSafeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAddressField(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return (
    value === "COD" ||
    value === "BANK_TRANSFER" ||
    value === "CREDIT_CARD" ||
    value === "E_WALLET"
  );
}

async function generateOrderCode(): Promise<string> {
  const dbModule = await import("../../../lib/db");
  const { db } = dbModule;
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const prefix = `ZD${yyyy}${mm}${dd}`;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = Math.floor(100000 + Math.random() * 900000);
    const code = `${prefix}${suffix}`;
    const exists = await db.order.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }
  throw new Error("Cannot generate order code");
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { message: "Hệ thống đặt hàng chưa được cấu hình cơ sở dữ liệu." },
        { status: 503 },
      );
    }

    const dbModule = await import("../../../lib/db");
    const { db } = dbModule;

    const payload = (await request.json()) as CheckoutPayload;

    const fullName = normalizeAddressField(toSafeString(payload.fullName));
    const phone = toSafeString(payload.phone).replace(/[^\d+]/g, "");
    const emailRaw = toSafeString(payload.email);
    const provinceCode = toSafeString(payload.provinceCode);
    const provinceName = normalizeAddressField(toSafeString(payload.provinceName) || toSafeString(payload.city));
    const districtCode = toSafeString(payload.districtCode);
    const districtName = normalizeAddressField(toSafeString(payload.districtName) || toSafeString(payload.district));
    const wardCode = toSafeString(payload.wardCode);
    const wardName = normalizeAddressField(toSafeString(payload.wardName) || toSafeString(payload.ward));
    const addressLine = normalizeAddressField(toSafeString(payload.addressLine) || toSafeString(payload.line1));
    const fullAddress =
      toSafeString(payload.fullAddress) ||
      [addressLine, wardName, districtName, provinceName].filter(Boolean).join(", ");
    const note = toSafeString(payload.note);
    const couponCode = toSafeString(payload.couponCode).toUpperCase();
    const visitorKey = toSafeString(payload.visitorKey);
    const sessionKey = toSafeString(payload.sessionKey);
    const paymentMethod = payload.paymentMethod;
    const items = Array.isArray(payload.items)
      ? payload.items.map(normalizeCartItem).filter((item): item is NonNullable<ReturnType<typeof normalizeCartItem>> => Boolean(item))
      : [];


    if (!fullName) {
      return NextResponse.json({ message: "Vui lòng nhập họ và tên." }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ message: "Vui lòng nhập số điện thoại." }, { status: 400 });
    }
    if (!/^(0\d{9}|84\d{9}|\+84\d{9})$/.test(phone)) {
      return NextResponse.json({ message: "Số điện thoại không hợp lệ." }, { status: 400 });
    }
    if (!provinceName) {
      return NextResponse.json({ message: "Vui lòng chọn tỉnh/thành phố." }, { status: 400 });
    }
    if (!districtName) {
      return NextResponse.json({ message: "Vui lòng chọn quận/huyện." }, { status: 400 });
    }
    if (!addressLine) {
      return NextResponse.json({ message: "Vui lòng nhập địa chỉ chi tiết." }, { status: 400 });
    }
    if (!isPaymentMethod(paymentMethod)) {
      return NextResponse.json(
        { message: "Thông tin thanh toán không hợp lệ." },
        { status: 400 },
      );
    }

    if (!items.length) {
      return NextResponse.json({ message: "Gio hang khong hop le." }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const sessionRole =
      session?.user && typeof session.user === "object" && "role" in session.user
        ? String((session.user as { role?: string }).role ?? "")
        : "";
    const websiteSettings = await getWebsiteSettings();
    const cas = websiteSettings.customerAccountSettings;
    const affiliateProgramEnabled = websiteSettings.affiliateEnabled;

    const loggedUserIdCandidate =
      session?.user?.id && sessionRole === "USER"
        ? (
            await db.customer.findUnique({
              where: { id: session.user.id },
              select: { id: true },
            })
          )?.id ?? null
        : null;

    const ownProfile = await resolveCustomerAffiliateProfile(loggedUserIdCandidate);
    const affiliateActive = ownProfile.active;
    const ownRefCode = ownProfile.refCode ?? "";

    const roleUser = { role: sessionRole || "USER", affiliateActive };
    if (!isCustomerBuyer(roleUser, cas)) {
      return NextResponse.json({ message: effectiveAffiliateBlockMessage(cas.affiliateBlockCheckoutMessage) }, { status: 403 });
    }

    let normalizedBodyRef = toSafeString(payload.affiliateRefCode).trim().slice(0, 128);
    if (ownRefCode && normalizedBodyRef.toUpperCase() === ownRefCode.toUpperCase()) {
      normalizedBodyRef = "";
    }

    const jar = await cookies();
    let normalizedCookieRef = toSafeString(jar.get(ZENDO_AF_REF_COOKIE)?.value ?? "").trim().slice(0, 128);
    if (ownRefCode && normalizedCookieRef.toUpperCase() === ownRefCode.toUpperCase()) {
      normalizedCookieRef = "";
    }

    const refCandidates: string[] = [];
    const pushCandidate = (candidate: string) => {
      const t = candidate.trim();
      if (!t) return;
      if (!refCandidates.some((item) => item.toUpperCase() === t.toUpperCase())) refCandidates.push(t);
    };

    let affiliateRefCodeForOrder: string | null = null;
    let affiliateProfileIdForOrder: string | null = null;

    if (affiliateProgramEnabled) {
      if (normalizedCookieRef) pushCandidate(normalizedCookieRef);
      if (normalizedBodyRef) pushCandidate(normalizedBodyRef);

      for (const cand of refCandidates) {
        const hit = await resolveAffiliateProfileByRefCode(cand);
        if (hit?.refCode) {
          const hitCode = hit.refCode.trim();
          if (!ownRefCode || hitCode.toUpperCase() !== ownRefCode.toUpperCase()) {
            affiliateProfileIdForOrder = hit.id;
            affiliateRefCodeForOrder = hitCode;
            break;
          }
        }
      }
    }

    const productIds = items.map((item) => item.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        basePrice: true,
        salePrice: true,
      },
    });
    const productMap = new Map(products.map((product) => [product.id, product]));

    const pricedItems = items.map((item) => {
      const product = productMap.get(item.productId);
      const salePrice = product?.salePrice == null ? null : Number(product.salePrice);
      const basePrice = product == null ? null : Number(product.basePrice);
      const serverUnitPrice = product
        ? salePrice != null && basePrice != null && salePrice > 0 && salePrice < basePrice
          ? salePrice
          : (basePrice ?? getUnitPrice(item))
        : getUnitPrice(item);

      return {
        ...item,
        productName: product?.name ?? item.name,
        productSlug: product?.slug ?? item.slug,
        sku: product?.sku ?? item.sku ?? `SKU-${item.id}`,
        productId: product?.id ?? null,
        unitPrice: serverUnitPrice,
        totalPrice: serverUnitPrice * item.quantity,
      };
    });

    const subtotal = calcSubtotal(
      pricedItems.map((item) => ({
        ...item,
        basePrice: item.unitPrice,
        salePrice: null,
      })),
    );

    let discountAmount = 0;
    let couponId: string | null = null;

    if (couponCode) {
      const now = new Date();
      const coupon = await db.coupon.findFirst({
        where: {
          code: couponCode,
          status: "ACTIVE",
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
        },
      });

      if (coupon && (!coupon.minOrderAmount || subtotal >= Number(coupon.minOrderAmount))) {
        if (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit) {
          if (coupon.type === "PERCENT") {
            const percentage = Number(coupon.value);
            discountAmount = Math.floor((subtotal * percentage) / 100);
            if (coupon.maxDiscountAmount) {
              discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
            }
          } else if (coupon.type === "FIXED_AMOUNT") {
            discountAmount = Number(coupon.value);
          }
          couponId = coupon.id;
        }
      } else {
        const localCoupon = computeGuestCoupon(couponCode, subtotal);
        discountAmount = localCoupon?.amount ?? 0;
      }
    }

    discountAmount = Math.min(Math.max(0, discountAmount), subtotal);
    const shippingFee = 0;
    const totalAmount = subtotal - discountAmount + shippingFee;
    const orderCode = await generateOrderCode();

    const loggedInCustomerId = loggedUserIdCandidate;

    let customer: { id: string };
    if (loggedInCustomerId) {
      customer = { id: loggedInCustomerId };
    } else {
      const existingCustomer = emailRaw
        ? await db.customer.findUnique({ where: { email: emailRaw }, select: { id: true } })
        : null;
      customer =
        existingCustomer ??
        (await db.customer.create({
          data: {
            fullName,
            phone,
            email: emailRaw || null,
            isGuest: true,
          },
          select: { id: true },
        }));
    }

    const order = await db.$transaction(async (tx) => {
      const wardFilter =
        wardName
          ? { equals: wardName, mode: "insensitive" as const }
          : undefined;
      const existingShippingAddress = await tx.address.findFirst({
        where: {
          customerId: customer.id,
          phone,
          fullName: { equals: fullName, mode: "insensitive" },
          city: { equals: provinceName, mode: "insensitive" },
          district: { equals: districtName, mode: "insensitive" },
          ...(wardFilter ? { ward: wardFilter } : { ward: null }),
          line1: { equals: addressLine, mode: "insensitive" },
        },
        select: { id: true },
      });

      const shippingAddress =
        existingShippingAddress ??
        (await tx.address.create({
          data: {
            customerId: customer.id,
            fullName,
            phone,
            provinceCode: provinceCode || null,
            city: provinceName,
            districtCode: districtCode || null,
            district: districtName,
            wardCode: wardCode || null,
            ward: wardName || null,
            line1: addressLine,
            line2: fullAddress || null,
            fullAddress: fullAddress || null,
          },
          select: { id: true },
        }));

      const created = await tx.order.create({
        data: {
          code: orderCode,
          customerId: customer.id,
          affiliateProfileId: affiliateProfileIdForOrder,
          affiliateRefCode: affiliateRefCodeForOrder,
          shippingAddressId: shippingAddress.id,
          couponId,
          customerFullName: fullName,
          customerEmail: emailRaw || null,
          customerPhone: phone,
          shippingProvinceCode: provinceCode || null,
          shippingCity: provinceName,
          shippingDistrictCode: districtCode || null,
          shippingDistrict: districtName,
          shippingWardCode: wardCode || null,
          shippingWard: wardName || null,
          shippingLine1: addressLine,
          shippingLine2: fullAddress || null,
          shippingFullAddress: fullAddress || null,
          note: note || null,
          subtotal,
          discountAmount,
          shippingFee,
          totalAmount,
          paymentMethod,
          paymentStatus: paymentMethod === "COD" ? "UNPAID" : "PENDING",
          orderStatus: "PENDING",
          items: {
            create: pricedItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              productSlug: item.productSlug,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
        },
        select: {
          id: true,
          code: true,
          totalAmount: true,
        },
      });

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      if (affiliateProgramEnabled && affiliateProfileIdForOrder) {
        await createPendingAffiliateCommissionForOrder(tx, {
          orderId: created.id,
          affiliateProfileId: affiliateProfileIdForOrder,
          totalAmount: created.totalAmount,
          defaultCommissionPct: Number(websiteSettings.commissionRate ?? 5) || 5,
        });
      }

      return created;
    });

    if (affiliateProfileIdForOrder) {
      const { notifyAffiliateReferralOrderPlaced } = await import("../../../lib/affiliate/affiliate-referral-notifications");
      await notifyAffiliateReferralOrderPlaced(order.id);
    }

    try {
      const { notifyCustomerOrderCreated } = await import("../../../lib/order-customer-notifications");
      await notifyCustomerOrderCreated(db, order.id);
    } catch {
      /* không chặn checkout */
    }

    await ghiSuKienAnalytics({
      eventName: "submit_order",
      pathname: "/thanh-toan",
      orderId: order.id,
      visitorKey: visitorKey || null,
      sessionKey: sessionKey || null,
      referrer: request.headers.get("referer"),
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
      metadata: {
        orderCode: order.code,
        totalAmount: Number(order.totalAmount),
        paymentMethod,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      orderCode: order.code,
    });
  } catch (error) {
    console.error("[CHECKOUT_API_ERROR]", error);

    return NextResponse.json(
      { message: "Không thể tạo đơn hàng lúc này. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
