import type { Metadata } from "next";
import { buildDynamicMetadata } from "../../../../lib/seo";
import { renderStorefrontProductListPage } from "../../../../lib/storefront-product-list-page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildDynamicMetadata({
    title: "Sản phẩm mới | Zendo.vn",
    description: "Khám phá các sản phẩm mới nhất đang mở bán tại Zendo.vn.",
    path: "/san-pham-moi",
  });
}

export default async function SanPhamMoiPage(): Promise<JSX.Element> {
  return renderStorefrontProductListPage({
    title: "Sản phẩm mới",
    description: "Các sản phẩm mới nhất đang mở bán tại Zendo.vn.",
    emptyDescription: "Hiện chưa có sản phẩm mới đang mở bán.",
    path: "/san-pham-moi",
    where: { status: "ACTIVE", isNew: true },
    orderBy: [{ updatedAt: "desc" }],
  });
}
