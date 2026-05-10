import type { PrismaClient } from "@prisma/client";
import type { GuestCartItem } from "./cart";

export type ReorderSkipReason = "NOT_FOUND" | "PRODUCT_INACTIVE" | "OUT_OF_STOCK";

export type ReorderSkippedLine = {
  sku: string;
  productName: string;
  quantityRequested: number;
  reason: ReorderSkipReason;
};

/**
 * Chuẩn bị payload “mua lại” để storefront merge vào giỏ (localStorage) — không ghi Cart DB.
 */
export async function buildReorderCartPayload(
  db: PrismaClient,
  params: {
    orderId: string;
    customerId: string;
  },
): Promise<{
  items: GuestCartItem[];
  skipped: ReorderSkippedLine[];
}> {
  const order = await db.order.findFirst({
    where: { id: params.orderId, customerId: params.customerId },
    select: {
      items: {
        select: {
          productId: true,
          productVariantId: true,
          productName: true,
          productSlug: true,
          sku: true,
          quantity: true,
        },
      },
    },
  });
  const itemsOut: GuestCartItem[] = [];
  const skipped: ReorderSkippedLine[] = [];

  if (!order) {
    return { items: itemsOut, skipped };
  }

  for (const line of order.items) {
    const qtyReq = Math.max(1, line.quantity);
    if (!line.productId) {
      skipped.push({
        sku: line.sku,
        productName: line.productName,
        quantityRequested: qtyReq,
        reason: "NOT_FOUND",
      });
      continue;
    }

    const product = await db.product.findUnique({
      where: { id: line.productId },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        status: true,
        basePrice: true,
        salePrice: true,
        stockQuantity: true,
        images: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          take: 1,
          select: { url: true },
        },
      },
    });

    if (!product) {
      skipped.push({
        sku: line.sku,
        productName: line.productName,
        quantityRequested: qtyReq,
        reason: "NOT_FOUND",
      });
      continue;
    }

    if (product.status !== "ACTIVE") {
      skipped.push({
        sku: line.sku,
        productName: line.productName,
        quantityRequested: qtyReq,
        reason: "PRODUCT_INACTIVE",
      });
      continue;
    }

    const imageUrl = product.images[0]?.url ?? "";
    let basePrice = Number(product.basePrice);
    let salePrice: number | null = product.salePrice == null ? null : Number(product.salePrice);
    let effectiveStock = product.stockQuantity;
    let skuOut = product.sku;

    if (line.productVariantId) {
      const variant = await db.productVariant.findFirst({
        where: {
          id: line.productVariantId,
          productId: line.productId,
          isActive: true,
        },
        select: {
          sku: true,
          price: true,
          stockQuantity: true,
        },
      });

      if (!variant) {
        skipped.push({
          sku: line.sku,
          productName: line.productName,
          quantityRequested: qtyReq,
          reason: "NOT_FOUND",
        });
        continue;
      }

      skuOut = variant.sku;
      effectiveStock = variant.stockQuantity;
      if (variant.price != null) {
        const vp = Number(variant.price);
        if (Number.isFinite(vp)) {
          basePrice = vp;
          salePrice = null;
        }
      }
    }

    if (effectiveStock < 1) {
      skipped.push({
        sku: line.sku,
        productName: line.productName,
        quantityRequested: qtyReq,
        reason: "OUT_OF_STOCK",
      });
      continue;
    }

    const qtyAdd = Math.min(qtyReq, effectiveStock);

    itemsOut.push({
      id: product.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl,
      sku: skuOut,
      basePrice,
      salePrice:
        salePrice != null &&
        Number.isFinite(salePrice) &&
        basePrice > 0 &&
        salePrice > 0 &&
        salePrice < basePrice
          ? salePrice
          : null,
      quantity: qtyAdd,
      stockQuantity: effectiveStock,
    });
  }

  return { items: itemsOut, skipped };
}
