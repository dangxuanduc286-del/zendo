import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect, RedirectType } from "next/navigation";
import { authOptions } from "../../../../lib/auth";
import AdminHomeBannersEditor from "../../../../components/admin/admin-home-banners-editor";
import AdminCampaignBackgroundEditor from "../../../../components/admin/admin-campaign-background-editor";
import AdminThemeSettingsForm from "../../../../components/admin/admin-theme-settings-form";
import { getThemeSettings } from "../../../../lib/settings";
import { adminTabActive, adminTabBase, adminTabInactive } from "../../../../lib/admin-ui";

export const metadata: Metadata = {
  title: "Banner | Quản trị Zendo.vn",
  description: "Quản lý banner trang chủ, vị trí hiển thị, màu sắc giao diện và các khối nổi bật.",
  robots: {
    index: false,
    follow: false,
  },
};

const TAB_ITEMS = [
  { key: "list", label: "Danh sách banner" },
  { key: "campaign", label: "Ảnh nền chiến dịch" },
  { key: "colors", label: "Màu sắc giao diện" },
  { key: "guide", label: "Hướng dẫn kích thước" },
] as const;

type BannerTabKey = (typeof TAB_ITEMS)[number]["key"];

function parseTab(value?: string): BannerTabKey {
  if (!value) return "list";
  return TAB_ITEMS.some((tab) => tab.key === value) ? (value as BannerTabKey) : "list";
}

export default async function AdminBannersPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/admin/login?callbackUrl=/admin/banners");
  }
  const resolvedSearchParams = (await searchParams) ?? {};
  if (resolvedSearchParams.tab === "hero" || resolvedSearchParams.tab === "new" || resolvedSearchParams.tab === "create") {
    redirect("/admin/banners", RedirectType.replace);
  }
  const activeTab = parseTab(resolvedSearchParams.tab);
  const theme = await getThemeSettings();

  return (
    <main className="w-full max-w-none space-y-5">
      <header className="space-y-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Banner</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Quản lý banner trang chủ, vị trí hiển thị, màu sắc giao diện và các khối nổi bật.
          </p>
        </div>
      </header>
      <nav aria-label="Tab quản lý banner" className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
        <div className="flex min-w-max gap-2">
          {TAB_ITEMS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <Link
                key={tab.key}
                href={`/admin/banners?tab=${tab.key}`}
                className={`whitespace-nowrap ${adminTabBase} ${
                  isActive ? adminTabActive : adminTabInactive
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {activeTab === "list" ? <AdminHomeBannersEditor themeSettings={theme} /> : null}
      {activeTab === "campaign" ? <AdminCampaignBackgroundEditor themeSettings={theme} /> : null}

      {activeTab === "guide" ? (
        <section className="space-y-4">
          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-[#0F172A]">Hướng dẫn kích thước 5 banner</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Trang chủ Zendo chỉ dùng đúng 5 vị trí banner. Mobile chỉ hiển thị banner chính; banner phụ không cần ảnh mobile.
            </p>

            <div className="mt-4 hidden overflow-hidden rounded-xl border border-slate-200 md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Vị trí</th>
                    <th className="px-3 py-2 font-semibold">Mã vị trí</th>
                    <th className="px-3 py-2 font-semibold">Kích thước khuyến nghị</th>
                    <th className="px-3 py-2 font-semibold">Hiển thị</th>
                    <th className="px-3 py-2 font-semibold">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="px-3 py-2 font-medium">Banner chính giữa</td>
                    <td className="px-3 py-2"><code>home_main</code></td>
                    <td className="px-3 py-2">1644x658px</td>
                    <td className="px-3 py-2"><span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">Desktop + Mobile</span></td>
                    <td className="px-3 py-2">Tối đa 4 ảnh. Storefront hiển thị 1 ảnh mỗi lần và cho phép vuốt/chuyển slide.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium">Banner phụ trái trên</td>
                    <td className="px-3 py-2"><code>home_left_top</code></td>
                    <td className="px-3 py-2">336x376px</td>
                    <td className="px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Chỉ desktop</span></td>
                    <td className="px-3 py-2">Ảnh gọn, ưu tiên nội dung chiến dịch phụ.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium">Banner phụ trái dưới</td>
                    <td className="px-3 py-2"><code>home_left_bottom</code></td>
                    <td className="px-3 py-2">336x376px</td>
                    <td className="px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Chỉ desktop</span></td>
                    <td className="px-3 py-2">Không cần ảnh mobile.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium">Banner phụ phải trên</td>
                    <td className="px-3 py-2"><code>home_right_top</code></td>
                    <td className="px-3 py-2">336x376px</td>
                    <td className="px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Chỉ desktop</span></td>
                    <td className="px-3 py-2">Không cần ảnh mobile.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium">Banner phụ phải dưới</td>
                    <td className="px-3 py-2"><code>home_right_bottom</code></td>
                    <td className="px-3 py-2">336x376px</td>
                    <td className="px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Chỉ desktop</span></td>
                    <td className="px-3 py-2">Không cần ảnh mobile.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-[#0F172A]">Hướng dẫn ảnh nền chiến dịch</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Ảnh nền chiến dịch dùng để trang trí hai bên website trong các dịp sale, lễ Tết hoặc chiến dịch marketing. Nội dung chính của web vẫn nằm ở giữa nên ảnh nền cần chừa vùng trung tâm sạch.
            </p>

            <div className="mt-4 hidden overflow-hidden rounded-xl border border-slate-200 md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Loại ảnh</th>
                    <th className="px-3 py-2 font-semibold">Kích thước khuyến nghị</th>
                    <th className="px-3 py-2 font-semibold">Tỷ lệ</th>
                    <th className="px-3 py-2 font-semibold">Hiển thị</th>
                    <th className="px-3 py-2 font-semibold">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="px-3 py-2 font-medium">Ảnh nền desktop</td>
                    <td className="px-3 py-2">2560x1440px hoặc 1920x1080px</td>
                    <td className="px-3 py-2">16:9</td>
                    <td className="px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Desktop</span></td>
                    <td className="px-3 py-2">Chừa vùng giữa khoảng 1376px ít chi tiết, ưu tiên trang trí hai bên. Dung lượng nên dưới 1.5MB, dùng WebP/JPG/PNG.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium">Ảnh nền mobile</td>
                    <td className="px-3 py-2">1080x1920px hoặc 1170x2532px</td>
                    <td className="px-3 py-2">9:16</td>
                    <td className="px-3 py-2"><span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">Mobile</span></td>
                    <td className="px-3 py-2">Tùy chọn. Nếu để trống, mobile dùng nền mặc định #F8FAFC để tối ưu tốc độ và dễ đọc.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium">Vùng nội dung giữa</td>
                    <td className="px-3 py-2">khoảng 1376px</td>
                    <td className="px-3 py-2">—</td>
                    <td className="px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Desktop</span></td>
                    <td className="px-3 py-2">Không đặt chữ/logo quan trọng vào vùng này vì sẽ bị nội dung website che phủ.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-3 md:hidden">
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">Ảnh nền desktop</p>
                <p className="mt-1 text-xs text-slate-600">Kích thước: 2560x1440px hoặc 1920x1080px</p>
                <p className="mt-1 text-xs text-slate-600">Tỷ lệ: 16:9 • Hiển thị: Desktop</p>
                <p className="mt-1 text-xs text-slate-600">Chừa vùng giữa khoảng 1376px ít chi tiết, ưu tiên trang trí hai bên. Dung lượng nên dưới 1.5MB, dùng WebP/JPG/PNG.</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">Ảnh nền mobile</p>
                <p className="mt-1 text-xs text-slate-600">Kích thước: 1080x1920px hoặc 1170x2532px</p>
                <p className="mt-1 text-xs text-slate-600">Tỷ lệ: 9:16 • Hiển thị: Mobile</p>
                <p className="mt-1 text-xs text-slate-600">Tùy chọn. Nếu để trống, mobile dùng nền mặc định #F8FAFC để tối ưu tốc độ và dễ đọc.</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">Vùng nội dung giữa</p>
                <p className="mt-1 text-xs text-slate-600">Kích thước: khoảng 1376px</p>
                <p className="mt-1 text-xs text-slate-600">Tỷ lệ: — • Hiển thị: Desktop</p>
                <p className="mt-1 text-xs text-slate-600">Không đặt chữ/logo quan trọng vào vùng này vì sẽ bị nội dung website che phủ.</p>
              </article>
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
              <ul className="list-disc space-y-1 pl-4">
                <li>Không dùng ảnh nền quá rối vì có thể làm giảm khả năng đọc.</li>
                <li>Nên nén ảnh trước khi upload.</li>
                <li>Desktop nên ưu tiên hiệu ứng ở hai bên trái/phải.</li>
                <li>Mobile chỉ nên dùng ảnh nền nhẹ, ít chi tiết.</li>
                <li>Ảnh nền không thay thế 5 banner trang chủ.</li>
              </ul>
            </div>
          </section>
        </section>
      ) : null}

      {activeTab === "colors" ? (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-slate-900">Màu sắc giao diện</h2>
          <p className="text-sm text-slate-600">
            Lưu cấu hình qua API theme settings hiện có để không làm mất dữ liệu banner/theme cũ.
          </p>
          <AdminThemeSettingsForm embedded />
        </section>
      ) : null}
    </main>
  );
}

