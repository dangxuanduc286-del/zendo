import type { ReactNode } from "react";

/**
 * Vỏ full-width cho trang tài khoản khách / CTV storefront.
 * Tách khỏi admin layout; chỉ dùng trên (storefront)/tai-khoan.
 */
export function StorefrontAccountShell({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="w-full min-w-0 max-w-none px-0 sm:px-4 lg:px-6 xl:px-8">
      <div className="mx-0 w-full min-w-0 max-w-none space-y-4">{children}</div>
    </div>
  );
}
