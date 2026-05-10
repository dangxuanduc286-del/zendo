import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import ChatSupportClient from "../../../../components/storefront/chat-support-client";
import { authOptions } from "../../../../lib/auth";

export const metadata: Metadata = {
  title: "Chat hỗ trợ | Zendo.vn",
  description: "Trang chat hỗ trợ tại Zendo.vn.",
  robots: {
    index: false,
    follow: false,
  },
};

function isStaffAdminRole(role: string | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "CONTENT_MANAGER" || role === "ADMIN";
}

export default async function ChatPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (session?.user?.id && isStaffAdminRole(session.user.role)) {
    redirect("/");
  }
  return <ChatSupportClient />;
}
