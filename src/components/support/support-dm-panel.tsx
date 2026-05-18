"use client";

import { useSession } from "next-auth/react";
import Pusher from "pusher-js";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { isAdminSupportTicketRole } from "@/lib/admin-support-ticket-roles";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { notifyStorefrontSupportUnreadUpdated } from "@/lib/storefront-support-sync";
import { hasPusherClientConfig, supportDmChatChannelName } from "@/lib/support-dm-chat-channel";
import { acquireSupportStorefrontPusher, releaseSupportStorefrontPusher } from "@/lib/support-storefront-pusher-singleton";
import { useStorefrontSupportDisabledOnAdminRoute } from "@/lib/use-storefront-support-disabled-on-admin";
import { useSupportInboxStore } from "@/stores/supportInboxStore";

type ChatMsg = { id: string; body: string; fromAdmin: boolean; createdAt: string };

type ConvRow = {
  id: string;
  senderDisplayName: string;
  participantKind: "customer" | "affiliate";
  adminUnreadCount: number;
  lastMessageAt: string;
  blockedAt: string | null;
};

function scrollElToBottom(el: HTMLDivElement | null): void {
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}

export function SupportDmPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): JSX.Element {
  const { data: session, status } = useSession();
  const isUser = status === "authenticated" && session?.user?.role === "USER";
  const isStaffAdmin =
    status === "authenticated" && isAdminSupportTicketRole(session?.user?.role ?? "");
  const disabledOnAdminRoute = useStorefrontSupportDisabledOnAdminRoute();

  const [isNarrow, setIsNarrow] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"list" | "chat">("list");

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pusherUserRef = useRef<Pusher | null>(null);
  const pusherAdminRef = useRef<Pusher | null>(null);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = (): void => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) {
      setMobileTab("list");
      return;
    }
    if (isStaffAdmin && isNarrow && selectedConvId) setMobileTab("chat");
  }, [open, isStaffAdmin, isNarrow, selectedConvId]);

  useEffect(() => {
    if (!open || !isUser) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const me = await fetchWithAuth("/api/account/support-dm/me");
        const mj = (await me.json()) as {
          ok?: boolean;
          conversation?: { id: string; blockedAt?: string | null };
        };
        if (cancelled) return;
        const cid = mj.conversation?.id ?? null;
        setConversationId(cid);
        setBlocked(Boolean(mj.conversation?.blockedAt));
        const m = await fetchWithAuth("/api/account/support-dm/messages");
        const j = (await m.json()) as { ok?: boolean; messages?: ChatMsg[] };
        if (cancelled) return;
        setMessages(Array.isArray(j.messages) ? j.messages : []);
        void fetchWithAuth("/api/account/support-dm/seen", { method: "POST" });
      } catch {
        if (!cancelled) setError("Không tải được hội thoại.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, isUser]);

  const loadAdminConversations = useCallback(async (): Promise<void> => {
    const res = await fetchWithAuth("/api/admin/support-dm/conversations");
    const j = (await res.json()) as { ok?: boolean; conversations?: ConvRow[] };
    const list = Array.isArray(j.conversations) ? j.conversations : [];
    setConversations(list);
    setSelectedConvId((cur) => {
      if (cur && list.some((c) => c.id === cur)) return cur;
      const hot = list.find((c) => c.adminUnreadCount > 0);
      return hot?.id ?? list[0]?.id ?? null;
    });
  }, []);

  const [modBusy, setModBusy] = useState(false);
  const selectedThread = useMemo(
    () => conversations.find((c) => c.id === selectedConvId) ?? null,
    [conversations, selectedConvId],
  );

  const runModeration = useCallback(
    async (action: "block" | "unblock" | "hide"): Promise<void> => {
      if (!selectedConvId || modBusy) return;
      setModBusy(true);
      setError("");
      try {
        const res = await fetchWithAuth(
          `/api/admin/support-dm/conversations/${encodeURIComponent(selectedConvId)}/moderation`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          },
        );
        const j = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || j.ok !== true) {
          setError(j.message ?? "Không thực hiện được.");
          return;
        }
        await loadAdminConversations();
        if (action === "hide" && isNarrow) setMobileTab("list");
      } finally {
        setModBusy(false);
      }
    },
    [selectedConvId, modBusy, loadAdminConversations, isNarrow],
  );

  useEffect(() => {
    if (!open || !isStaffAdmin) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await loadAdminConversations();
      } catch {
        if (!cancelled) setError("Không tải được danh sách.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, isStaffAdmin, loadAdminConversations]);

  useEffect(() => {
    if (!open || !isStaffAdmin || !selectedConvId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithAuth(`/api/admin/support-dm/conversations/${encodeURIComponent(selectedConvId)}/messages`);
        const j = (await res.json()) as { ok?: boolean; messages?: ChatMsg[] };
        if (cancelled) return;
        setMessages(Array.isArray(j.messages) ? j.messages : []);
        void fetchWithAuth(`/api/admin/support-dm/conversations/${encodeURIComponent(selectedConvId)}/seen`, {
          method: "POST",
        });
        void loadAdminConversations();
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, isStaffAdmin, selectedConvId, loadAdminConversations]);

  useEffect(() => {
    queueMicrotask(() => scrollElToBottom(scrollRef.current));
  }, [messages, open]);

  /** Storefront user: Pusher DM channel */
  useEffect(() => {
    if (!open || !isUser || !conversationId || !hasPusherClientConfig()) return;
    const pusher = acquireSupportStorefrontPusher();
    if (!pusher) return;
    pusherUserRef.current = pusher;
    const chName = supportDmChatChannelName(conversationId);
    const ch = pusher.subscribe(chName);
    const onNew = (raw: unknown): void => {
      const o = raw as { id?: string; body?: string; fromAdmin?: boolean; createdAt?: string };
      if (!o?.id || typeof o.body !== "string" || typeof o.createdAt !== "string") return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === o.id)) return prev;
        return [
          ...prev,
          { id: o.id, body: o.body, fromAdmin: Boolean(o.fromAdmin), createdAt: o.createdAt },
        ];
      });
    };
    const onSeen = (): void => {
      void fetchWithAuth("/api/account/support-dm/unread-count").then(async (r) => {
        try {
          const j = (await r.json()) as { total?: number };
          if (typeof j.total === "number") {
            const v = Math.max(0, Math.floor(j.total));
            useSupportInboxStore.getState().setStorefrontSupportUnreadTotal(v);
            notifyStorefrontSupportUnreadUpdated(v);
          }
        } catch {
          /* ignore */
        }
      });
    };
    ch.bind("new-message", onNew);
    ch.bind("seen-update", onSeen);
    return () => {
      try {
        ch.unbind("new-message", onNew);
        ch.unbind("seen-update", onSeen);
      } catch {
        /* ignore */
      }
      releaseSupportStorefrontPusher();
      pusherUserRef.current = null;
    };
  }, [open, isUser, conversationId]);

  /** Admin: Pusher cho conversation đang chọn + inbox bump */
  useEffect(() => {
    if (!open || !isStaffAdmin || !hasPusherClientConfig()) return;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY?.trim();
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.trim();
    if (!key || !cluster) return;
    let pusher: Pusher | null = null;
    try {
      pusher = new Pusher(key, { cluster, forceTLS: true, authEndpoint: "/api/pusher/auth" });
    } catch {
      return;
    }
    pusherAdminRef.current = pusher;
    const inbox = pusher.subscribe("private-support-admin-inbox");
    const bump = (): void => {
      void loadAdminConversations();
    };
    inbox.bind("support.dm.message.created", bump);
    inbox.bind("support.dm.inbox.totals", bump);

    let dmCh: ReturnType<Pusher["subscribe"]> | null = null;
    let onDmNew: ((raw: unknown) => void) | null = null;
    if (selectedConvId) {
      dmCh = pusher.subscribe(supportDmChatChannelName(selectedConvId));
      onDmNew = (raw: unknown): void => {
        const o = raw as { id?: string; body?: string; fromAdmin?: boolean; createdAt?: string };
        if (!o?.id || typeof o.body !== "string" || typeof o.createdAt !== "string") return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === o.id)) return prev;
          return [
            ...prev,
            { id: o.id, body: o.body, fromAdmin: Boolean(o.fromAdmin), createdAt: o.createdAt },
          ];
        });
      };
      dmCh.bind("new-message", onDmNew);
    }

    return () => {
      try {
        inbox.unbind("support.dm.message.created", bump);
        inbox.unbind("support.dm.inbox.totals", bump);
        pusher?.unsubscribe("private-support-admin-inbox");
        if (dmCh && onDmNew) {
          dmCh.unbind("new-message", onDmNew);
          if (selectedConvId) pusher?.unsubscribe(supportDmChatChannelName(selectedConvId));
        }
        pusher?.disconnect();
      } catch {
        /* ignore */
      }
      pusherAdminRef.current = null;
    };
  }, [open, isStaffAdmin, selectedConvId, loadAdminConversations]);

  const sendUser = async (): Promise<void> => {
    const t = input.trim();
    if (!t || sending || blocked) return;
    setSending(true);
    setError("");
    try {
      const res = await fetchWithAuth("/api/account/support-dm/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: t }),
      });
      const j = (await res.json()) as { ok?: boolean; id?: string; message?: string };
      if (!res.ok || j.ok !== true || typeof j.id !== "string") {
        setError(j.message ?? "Không gửi được tin.");
        return;
      }
      setInput("");
      setMessages((prev) => {
        if (prev.some((m) => m.id === j.id)) return prev;
        return [...prev, { id: j.id!, body: t, fromAdmin: false, createdAt: new Date().toISOString() }];
      });
    } finally {
      setSending(false);
    }
  };

  const sendAdmin = async (): Promise<void> => {
    const t = input.trim();
    if (!t || !selectedConvId || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetchWithAuth(
        `/api/admin/support-dm/conversations/${encodeURIComponent(selectedConvId)}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: t }),
        },
      );
      const j = (await res.json()) as { ok?: boolean; id?: string; message?: string };
      if (!res.ok || j.ok !== true || typeof j.id !== "string") {
        setError(j.message ?? "Không gửi được tin.");
        return;
      }
      setInput("");
      setMessages((prev) => {
        if (prev.some((m) => m.id === j.id)) return prev;
        return [...prev, { id: j.id!, body: t, fromAdmin: true, createdAt: new Date().toISOString() }];
      });
      void loadAdminConversations();
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;
  if (disabledOnAdminRoute && !isStaffAdmin) return null;
  if (typeof document === "undefined") return null;

  const showList = isStaffAdmin && (!isNarrow || mobileTab === "list");
  const showChat = !isStaffAdmin || !isNarrow || mobileTab === "chat";

  /** Desktop (sm+): widget góc phải — khách ~400×560px; admin vừa sidebar. Mobile: full-screen giữ nguyên. */
  const desktopShellClass = isStaffAdmin
    ? "sm:inset-auto sm:top-auto sm:left-auto sm:bottom-6 sm:right-6 sm:h-[600px] sm:max-h-[620px] sm:min-h-0 sm:w-[min(480px,calc(100vw-3rem))] sm:max-w-[520px] sm:min-w-0 sm:rounded-xl sm:border sm:border-slate-200/80 sm:pt-0 sm:pb-0 sm:shadow-[0_12px_40px_rgba(15,23,42,0.14)] sm:ring-1 sm:ring-slate-200/50"
    : "sm:inset-auto sm:top-auto sm:left-auto sm:bottom-6 sm:right-6 sm:h-[560px] sm:max-h-[620px] sm:min-h-[420px] sm:w-[min(400px,calc(100vw-3rem))] sm:max-w-[420px] sm:min-w-[360px] sm:rounded-xl sm:border sm:border-slate-200/80 sm:pt-0 sm:pb-0 sm:shadow-[0_12px_40px_rgba(15,23,42,0.14)] sm:ring-1 sm:ring-slate-200/50";

  const bubbleMaxClass = isStaffAdmin ? "max-w-[min(100%,24rem)]" : "max-w-[min(100%,17.5rem)] sm:max-w-[min(100%,16.5rem)]";

  return createPortal(
    <div
      role="dialog"
      aria-modal
      aria-labelledby="support-dm-title"
      className={`support-popup-animate fixed z-[9999] flex flex-col overflow-hidden overscroll-y-contain bg-white shadow-none inset-0 h-[100dvh] max-h-[100dvh] w-full min-w-0 rounded-none border-0 pt-[env(safe-area-inset-top)] pb-0 ${desktopShellClass}`}
    >
      <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-slate-200/90 bg-white px-3 py-2 sm:min-h-11 sm:gap-x-2 sm:px-3 sm:py-2">
        <span id="support-dm-title" className="shrink-0 text-sm font-semibold tracking-tight text-slate-900">
          Hỗ trợ
        </span>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          {isStaffAdmin && selectedConvId ? (
            <>
              <button
                type="button"
                disabled={modBusy}
                onClick={() => void runModeration("hide")}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-45 sm:text-xs"
              >
                Ẩn khỏi danh sách
              </button>
              {selectedThread?.blockedAt ? (
                <button
                  type="button"
                  disabled={modBusy}
                  onClick={() => void runModeration("unblock")}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-45 sm:text-xs"
                >
                  Bỏ chặn
                </button>
              ) : (
                <button
                  type="button"
                  disabled={modBusy}
                  onClick={() => void runModeration("block")}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-900 transition hover:bg-rose-100 disabled:opacity-45 sm:text-xs"
                >
                  Chặn
                </button>
              )}
            </>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full text-lg leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 sm:h-7 sm:min-w-7 sm:text-base"
            aria-label="Đóng chat hỗ trợ"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden sm:flex-row">
        {isStaffAdmin && showList ? (
          <div className="flex max-h-[40vh] min-h-0 w-full shrink-0 flex-col overflow-y-auto overflow-x-hidden border-slate-200 sm:max-h-none sm:w-[188px] sm:shrink-0 sm:border-r">
            {loading && conversations.length === 0 ? (
              <p className="p-3 text-xs text-slate-500">Đang tải…</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedConvId(c.id);
                    if (isNarrow) setMobileTab("chat");
                  }}
                  className={`border-b border-slate-100 px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 ${
                    selectedConvId === c.id ? "bg-sky-50 font-semibold text-sky-900" : "text-slate-800"
                  }`}
                >
                  <span className="line-clamp-2">{c.senderDisplayName}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1">
                    {c.blockedAt ? (
                      <span className="inline-flex rounded bg-rose-100 px-1 py-0.5 text-[9px] font-bold uppercase text-rose-800">
                        Chặn
                      </span>
                    ) : null}
                    {c.adminUnreadCount > 0 ? (
                      <span className="inline-flex rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                        {c.adminUnreadCount > 99 ? "99+" : c.adminUnreadCount}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}

        {(!isStaffAdmin || selectedConvId) && showChat ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div ref={scrollRef} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-2.5 py-2 sm:space-y-2 sm:px-3 sm:py-2">
              {loading && messages.length === 0 ? <p className="text-center text-sm text-slate-500">Đang tải…</p> : null}
              {error ? <p className="text-center text-sm text-rose-600">{error}</p> : null}
              {blocked && isUser ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-sm text-amber-900">
                  Bạn đã bị chặn hỗ trợ.
                </p>
              ) : null}
              {isStaffAdmin && selectedThread?.blockedAt ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs text-slate-700">
                  Khách đang bị chặn gửi tin — bạn vẫn có thể trả lời.
                </p>
              ) : null}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex w-full ${m.fromAdmin ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`${bubbleMaxClass} whitespace-pre-wrap break-words rounded-2xl px-2.5 py-1.5 text-sm sm:px-3 sm:py-2 ${
                      m.fromAdmin
                        ? "border border-slate-200 bg-white text-slate-900"
                        : "bg-[#0084ff] text-white"
                    }`}
                  >
                    {m.body}
                  </div>
                </div>
              ))}
            </div>
            <div className="shrink-0 border-t border-slate-200/90 bg-white px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-2.5 sm:py-2 sm:pb-2">
              <div className="flex items-end gap-1.5 sm:items-center sm:gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={sending || (isUser && blocked) || (isStaffAdmin && !selectedConvId)}
                  placeholder="Nhập tin nhắn…"
                  rows={isNarrow ? 2 : 1}
                  className={`min-w-0 flex-1 resize-none rounded-lg border border-slate-200 px-2.5 text-sm outline-none focus:border-sky-400 sm:rounded-xl sm:px-3 ${
                    isNarrow ? "min-h-[44px] py-2" : "min-h-[36px] max-h-24 py-2 leading-snug sm:h-9 sm:py-1.5 sm:leading-normal"
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void (isStaffAdmin ? sendAdmin() : sendUser());
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={sending || (isUser && blocked) || (isStaffAdmin && !selectedConvId)}
                  onClick={() => void (isStaffAdmin ? sendAdmin() : sendUser())}
                  className="h-10 shrink-0 rounded-lg bg-sky-600 px-3.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-45 sm:h-9 sm:rounded-xl sm:px-3"
                >
                  Gửi
                </button>
              </div>
            </div>
          </div>
        ) : isStaffAdmin ? (
          <div className="flex flex-1 items-center justify-center p-4 text-sm text-slate-500">Chọn một hội thoại</div>
        ) : null}
      </div>

      {isStaffAdmin && isNarrow ? (
        <div className="flex shrink-0 border-t border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setMobileTab("list")}
            className={`min-h-12 flex-1 text-xs font-semibold ${mobileTab === "list" ? "text-sky-600" : "text-slate-500"}`}
          >
            Hội thoại
          </button>
          <button
            type="button"
            disabled={!selectedConvId}
            onClick={() => setMobileTab("chat")}
            className={`min-h-12 flex-1 text-xs font-semibold disabled:opacity-40 ${mobileTab === "chat" ? "text-sky-600" : "text-slate-500"}`}
          >
            Chat
          </button>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
