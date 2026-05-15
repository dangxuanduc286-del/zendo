import type { ReactNode } from "react";
import { APP_FRAME } from "../../lib/storefront-frame";
import { clsx } from "clsx";

type StorefrontAccountShellProps = {
  children: ReactNode;
  /** `flush`: bỏ padding ngang — dùng cho analytics dashboard tự set gutter (full-bleed trong main). */
  variant?: "default" | "flush";
};

/**
 * Vỏ full-width cho trang tài khoản khách / CTV storefront (fluid, không cap max-width).
 */
export function StorefrontAccountShell({ children, variant = "default" }: StorefrontAccountShellProps): JSX.Element {
  return (
    <div
      className={clsx(
        "flex min-h-0 w-full max-w-none flex-1 flex-col space-y-4",
        variant === "flush" ? "px-0" : APP_FRAME,
      )}
    >
      {children}
    </div>
  );
}
