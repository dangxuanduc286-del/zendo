import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import "../globals.css";
import AppSessionProvider from "../../components/providers/session-provider";
import { authOptions } from "../../lib/auth";

interface AdminRootLayoutProps {
  children: ReactNode;
}

async function getSafeAdminSession() {
  try {
    return await getServerSession(authOptions);
  } catch {
    return null;
  }
}

export default async function AdminRootLayout({ children }: AdminRootLayoutProps): Promise<JSX.Element> {
  const session = await getSafeAdminSession();

  return (
    <html lang="vi">
      <body className="min-h-screen bg-[#F8FAFC] text-[#0F172A] antialiased">
        <AppSessionProvider session={session}>{children}</AppSessionProvider>
      </body>
    </html>
  );
}
