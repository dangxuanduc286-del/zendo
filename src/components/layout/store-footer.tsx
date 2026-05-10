import Link from "next/link";
import type { SocialLink, WebsiteSettings } from "@/lib/settings";

interface StoreFooterProps {
  footer: WebsiteSettings["footer"] | null;
  socialLinks: SocialLink[];
}

export default function StoreFooter({
  footer,
  socialLinks,
}: StoreFooterProps): JSX.Element {
  const currentYear = new Date().getFullYear();


  return (
    <footer className="mt-12 border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-zinc-900">
            {footer?.company ?? "Zendo.vn"}
          </h3>
          <p className="text-sm leading-6 text-zinc-600">
            {footer?.address ?? "Nền tảng thương mại điện tử hiện đại cho mọi nhà."}
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-800">
            Hỗ trợ
          </h4>
          <ul className="space-y-2 text-sm text-zinc-600">
            <li>
              <Link href="/chinh-sach-bao-mat" className="transition hover:text-zinc-900">
                Chính sách bảo mật
              </Link>
            </li>
            <li>
              <Link href="/chinh-sach-giao-hang" className="transition hover:text-zinc-900">
                Chính sách giao hàng
              </Link>
            </li>
            <li>
              <Link href="/chinh-sach-doi-tra" className="transition hover:text-zinc-900">
                Chính sách đổi trả
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-800">
            Kết nối
          </h4>
          <ul className="flex flex-wrap gap-2">
            {socialLinks.map((social) => (
              <li key={social.platform}>
                <a
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900"
                >
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-zinc-200">
        <div className="mx-auto w-full max-w-7xl px-4 py-4 text-sm text-zinc-600 sm:px-6 lg:px-8">
          {footer?.copyright ?? `© ${currentYear} Zendo.vn. Đã đăng ký bản quyền.`}
        </div>
      </div>
    </footer>
  );
}
