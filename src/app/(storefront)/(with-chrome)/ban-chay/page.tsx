import type { Metadata } from "next";
import { buildDynamicMetadata } from "../../../../lib/seo";
import { renderStorefrontProductListPage } from "../../../../lib/storefront-product-list-page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildDynamicMetadata({
    title: "Sản phẩm bán chạy | Zendo.vn",
    description: "Khám phá các sản phẩm bán chạy được nhiều khách hàng lựa chọn tại Zendo.vn.",
    path: "/ban-chay",
  });
}

export default async function BanChayPage(): Promise<JSX.Element> {
  return renderStorefrontProductListPage({
    title: "Bán chạy",
    description: "Các sản phẩm bán chạy được nhiều khách hàng lựa chọn.",
    emptyDescription: "Hiện chưa có sản phẩm bán chạy đang mở bán.",
    path: "/ban-chay",
    where: { status: "ACTIVE", isBestSeller: true },
    orderBy: [{ soldCount: "desc" }, { updatedAt: "desc" }],
  });
}
