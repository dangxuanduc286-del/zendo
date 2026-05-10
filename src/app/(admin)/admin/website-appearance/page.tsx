import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../lib/auth";
import AdminWebsiteAppearanceSettings from "../../../../components/admin/admin-website-appearance-settings";

export const metadata: Metadata = {
  title: "Cài đặt website & giao diện | Quản trị Zendo.vn",
  description: "Cấu hình thông tin website, cửa hàng, chân trang, analytics và giao diện Zendo.vn.",
  robots: { index: false, follow: false },
};

export default async function WebsiteAppearanceSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ section?: string }>;
}): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/website-appearance");
  }
  const resolvedSearchParams = (await searchParams) ?? {};
  if (resolvedSearchParams.section === "theme") {
    redirect("/admin/banners");
  }

  return (
    <main className="w-full max-w-[1600px] space-y-5 bg-slate-50 py-2 sm:py-3">
      <header className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Cài đặt website & giao diện</h1>
        <p className="text-sm text-slate-500">
          Quản lý thông tin website, giao diện, SEO, tracking và các cấu hình hiển thị.{" "}
          <Link href="/admin/site-policies" className="font-medium text-sky-700 underline-offset-4 hover:underline">
            Chính sách hệ thống (tra cứu / đổi trả / CTV)
          </Link>
          .
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
            Đã nối cấu hình quản trị
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
            Cloudflare R2 media
          </span>
        </div>
      </header>
      <AdminWebsiteAppearanceSettings />
    </main>
  );
}
