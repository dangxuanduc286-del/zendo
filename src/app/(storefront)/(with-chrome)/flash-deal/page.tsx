import type { Metadata } from "next";
import { buildDynamicMetadata } from "../../../../lib/seo";
import { renderStorefrontProductListPage } from "../../../../lib/storefront-product-list-page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildDynamicMetadata({
    title: "Flash Deal | Zendo.vn",
    description: "Khám phá các ưu đãi Flash Deal với mức giá tốt đang mở bán tại Zendo.vn.",
    path: "/flash-deal",
  });
}

export default async function FlashDealPage(): Promise<JSX.Element> {
  return renderStorefrontProductListPage({
    title: "Flash Deal",
    description: "Các sản phẩm đang có ưu đãi giá tốt trong thời gian giới hạn.",
    emptyDescription: "Hiện chưa có sản phẩm Flash Deal đang mở bán.",
    path: "/flash-deal",
    where: { status: "ACTIVE", salePrice: { not: null } },
    orderBy: [{ updatedAt: "desc" }],
    flashSaleOnly: true,
  });
}
