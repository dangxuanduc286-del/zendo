"use client";

import { useSupportChatStore } from "@/stores/supportChatStore";

import SupportPanel from "./support-panel";

/**
 * Popup chat toàn cục (floating phải). State mở/đóng dùng chung với {@link useSupportPanel}.
 */
export default function SupportChatPopup(): JSX.Element {
  const isOpen = useSupportChatStore((s) => s.isOpen);
  const close = useSupportChatStore((s) => s.close);
  return <SupportPanel open={isOpen} onClose={close} />;
}
