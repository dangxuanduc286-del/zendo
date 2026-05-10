import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "../../../../../components/storefront/breadcrumbs";

export const metadata: Metadata = {
  title: "Đặt hàng thành công | Zendo.vn",
  description: "Cảm ơn bạn đã đặt hàng tại Zendo.vn.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}): Promise<JSX.Element> {
  const params = await Promise.resolve(searchParams);
  const orderCode = typeof params.code === "string" ? params.code : "";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Thanh toán", href: "/thanh-toan" },
          { label: "Đặt hàng thành công" },
        ]}
      />

      <section className="rounded-xl border border-zinc-200 bg-white p-6 text-center sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Cảm ơn bạn đã đặt hàng
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600 sm:text-base">
          Đơn hàng của bạn đã được ghi nhận và đang chờ xác nhận.
        </p>
        {orderCode ? (
          <p className="mt-4 inline-flex rounded-md bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-900">
            Mã đơn hàng: {orderCode}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700"
          >
            Về trang chủ
          </Link>
          <Link
            href="/gio-hang"
            className="inline-flex h-10 items-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-800 transition hover:border-zinc-400"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      </section>
    </main>
  );
}
