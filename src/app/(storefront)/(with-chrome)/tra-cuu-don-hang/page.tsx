import type { Metadata } from "next";
import Breadcrumbs from "../../../../components/storefront/breadcrumbs";
import OrderLookup from "../../../../components/storefront/order-lookup";

export const metadata: Metadata = {
  title: "Tra cứu đơn hàng | Zendo.vn",
  description: "Tra cứu trạng thái đơn hàng theo mã đơn và số điện thoại.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function OrderLookupPage(): JSX.Element {

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Tra cứu đơn hàng" },
        ]}
      />

      <section className="mx-auto w-full max-w-4xl space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Tra cứu đơn hàng
        </h1>
        <p className="text-sm leading-6 text-zinc-600">
          Nhập mã đơn hàng và số điện thoại đặt hàng để xem thông tin cập nhật mới nhất.
        </p>
      </section>

      <div className="mx-auto mt-5 w-full max-w-4xl">
        <OrderLookup />
      </div>
    </main>
  );
}
