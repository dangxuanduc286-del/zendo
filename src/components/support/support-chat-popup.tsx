"use client";

import dynamic from "next/dynamic";
import { useSupportChatStore } from "@/stores/supportChatStore";

const SupportDmPanel = dynamic(
  () => import("./support-dm-panel").then((m) => ({ default: m.SupportDmPanel })),
  { ssr: false, loading: () => null },
);

/**
 * Popup chat toàn cục — chỉ mount chunk + panel khi mở (giảm JS/Pusher khi đóng).
 */
export default function SupportChatPopup(): JSX.Element | null {
  const isOpen = useSupportChatStore((s) => s.isOpen);
  const close = useSupportChatStore((s) => s.close);
  if (!isOpen) return null;
  return <SupportDmPanel open={isOpen} onClose={close} />;
}
