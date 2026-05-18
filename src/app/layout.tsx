import type { ReactNode } from "react";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="vi">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
