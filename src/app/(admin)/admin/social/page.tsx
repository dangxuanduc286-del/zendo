import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../lib/auth";
import { getWebsiteSettings } from "../../../../lib/settings";
import { adminPrimaryButton } from "../../../../lib/admin-ui";

export const metadata: Metadata = {
  title: "Mạng xã hội | Quản trị Zendo.vn",
  description: "Quản trị liên kết mạng xã hội của website Zendo.vn.",
  robots: { index: false, follow: false },
};

export default async function AdminSocialPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/social");
  }

  const websiteSettings = await getWebsiteSettings();
  const links = websiteSettings.socialLinks;

  return (
    <main className="w-full max-w-none space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl">Mạng xã hội</h1>
          <p className="mt-1 text-sm text-[#64748B]">Danh sách liên kết social hiện tại trên storefront.</p>
        </div>
        <Link
          href="/admin/settings"
          className={adminPrimaryButton}
        >
          Chỉnh sửa tại Cài đặt website
        </Link>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]">
            <tr>
              <th className="px-4 py-3 font-semibold">Nền tảng</th>
              <th className="px-4 py-3 font-semibold">Nhãn</th>
              <th className="px-4 py-3 font-semibold">URL</th>
            </tr>
          </thead>
          <tbody>
            {links.map((item) => (
              <tr key={`${item.platform}-${item.url}`} className="border-b border-[#E2E8F0] last:border-none">
                <td className="px-4 py-3 text-[#0F172A]">{item.platform}</td>
                <td className="px-4 py-3 text-[#0F172A]">{item.label}</td>
                <td className="px-4 py-3 break-all text-[#0F172A]">{item.url}</td>
              </tr>
            ))}
            {!links.length ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-[#64748B]">
                  Chưa có liên kết mạng xã hội.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
