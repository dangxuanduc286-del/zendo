"use client";

import Link from "next/link";
import Pusher from "pusher-js";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { fetchWithAuth, FetchUnauthorizedError } from "../../lib/fetchWithAuth";
import { hasPusherClientConfig, supportTicketChatChannelName } from "../../lib/support-ticket-chat-channel";
import { releaseMarkSeenTabLock, tryReserveMarkSeenForTicket } from "../../lib/support-ticket-mark-seen-tab-lock";

type ChatMessage = {
  id: string;
  body: string;
  fromAdmin: boolean;
  createdAt: string;
  seenBy: string[];
  /** Tin tạm trên client trước khi server/Pusher trả id thật */
  isTemp?: boolean;
  /** Epoch ms lúc tạo temp trên client — dùng so khớp với serverTime, tránh lệch đồng hồ */
  clientCreatedAt?: number;
  /** Epoch ms lúc gửi (temp) — dùng timeout fallback khi Pusher không xác nhận */
  sentAt?: number;
  /** Quá thời gian chờ mà vẫn là temp → coi như lỗi realtime / không xác nhận */
  isFailed?: boolean;
};


function isStaffAdminRole(role: string | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "CONTENT_MANAGER" || role === "ADMIN";
}

function normalizeBodyForTempMatch(body: string): string {
  return body.trim().toLowerCase();
}

const TEMP_REPLACE_WINDOW_MS = 5000;
const TEMP_CONFIRM_TIMEOUT_MS = 10_000;
const TEMP_FALLBACK_POLL_MS = 3000;
const MARK_SEEN_DEBOUNCE_MS = 300;

/**
 * Chọn temp thay thế: cùng body (chuẩn hóa), trong cửa sổ thời gian.
 * Ưu tiên: score = |tempTime − serverTime| nhỏ nhất → hòa score thì temp mới hơn (tempTime lớn hơn)
 * → vẫn hòa thì index nhỏ hơn. tempTime = clientCreatedAt ?? Date.parse(createdAt).
 */
function findBestTempIndexToReplace(prev: ChatMessage[], newMessage: ChatMessage): number {
  const serverTime = new Date(newMessage.createdAt).getTime();
  if (!Number.isFinite(serverTime)) return -1;
  const normNew = normalizeBodyForTempMatch(newMessage.body);
  let bestIndex = -1;
  let bestScore = Infinity;
  let bestTempTime = -Infinity;

  for (let i = 0; i < prev.length; i++) {
    const m = prev[i];
    if (!m.isTemp) continue;
    if (normalizeBodyForTempMatch(m.body) !== normNew) continue;
    const tempTime = m.clientCreatedAt ?? m.sentAt ?? new Date(m.createdAt).getTime();
    if (!Number.isFinite(tempTime)) continue;
    const score = Math.abs(tempTime - serverTime);
    if (score >= TEMP_REPLACE_WINDOW_MS) continue;

    if (
      bestIndex === -1 ||
      score < bestScore ||
      (score === bestScore && tempTime > bestTempTime) ||
      (score === bestScore && tempTime === bestTempTime && i < bestIndex)
    ) {
      bestIndex = i;
      bestScore = score;
      bestTempTime = tempTime;
    }
  }
  return bestIndex;
}

function normalizeSeenBy(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

function applySeenUpdatesFromMarkResponse(
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>,
  mj: { ok?: boolean; updates?: unknown },
): void {
  if (!mj.ok || !Array.isArray(mj.updates)) return;
  const patch = new Map<string, string[]>();
  for (const u of mj.updates) {
    if (!u || typeof u !== "object" || Array.isArray(u)) continue;
    const rec = u as Record<string, unknown>;
    const mid = typeof rec.id === "string" ? rec.id : "";
    if (!mid) continue;
    patch.set(mid, normalizeSeenBy(rec.seenBy));
  }
  if (patch.size === 0) return;
  setMessages((prev) =>
    prev.map((msg) => {
      const sn = patch.get(msg.id);
      return sn ? { ...msg, seenBy: sn } : msg;
    }),
  );
}

export default function ChatSupportClient(): JSX.Element {
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const isUser = status === "authenticated" && role === "USER";
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated" || !isStaffAdminRole(role)) return;
    router.replace("/");
  }, [status, role, router]);

  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketStatus, setTicketStatus] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [bootLoading, setBootLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;
  const markSeenAfterPusherTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFlushedRef = useRef(false);

  useEffect(() => {
    hasFlushedRef.current = false;
  }, [ticketId]);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const fetchMessages = useCallback(
    async (id: string) => {
      setMessagesLoading(true);
      setError("");
      try {
        if (tryReserveMarkSeenForTicket(id)) {
          try {
            await fetchWithAuth(`/api/account/support-tickets/${encodeURIComponent(id)}/seen`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: "{}",
            });
          } finally {
            releaseMarkSeenTabLock(id);
          }
        }
        const res = await fetchWithAuth(`/api/account/support-tickets/${encodeURIComponent(id)}`);
        const j = (await res.json()) as {
          ok?: boolean;
          ticket?: { status?: string };
          messages?: ChatMessage[];
          message?: string;
        };
        if (!res.ok || !j.ok || !j.ticket || !Array.isArray(j.messages)) {
          setError(j.message ?? "Không tải được tin nhắn.");
          return;
        }
        setTicketStatus(j.ticket.status ?? "");
        const mapped: ChatMessage[] = j.messages.map((m) => ({
          id: m.id,
          body: m.body,
          fromAdmin: Boolean(m.fromAdmin),
          createdAt: typeof m.createdAt === "string" ? m.createdAt : String(m.createdAt),
          seenBy: normalizeSeenBy((m as { seenBy?: unknown }).seenBy),
          isTemp: false,
        }));
        setMessages(mapped);
      } catch (e) {
        setError(e instanceof FetchUnauthorizedError ? e.message : "Không tải được tin nhắn.");
      } finally {
        setMessagesLoading(false);
      }
    },
    [],
  );

  const mergePusherNewMessage = useCallback((raw: unknown) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
    const o = raw as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const body = typeof o.body === "string" ? o.body : "";
    const createdAt = typeof o.createdAt === "string" ? o.createdAt : "";
    if (!id || !body || !createdAt) return;

    const newMessage: ChatMessage = {
      id,
      body,
      fromAdmin: Boolean(o.fromAdmin),
      createdAt,
      seenBy: normalizeSeenBy(o.seenBy),
      isTemp: false,
    };

    setMessages((prev) => {
      if (prev.some((m) => m.id === newMessage.id)) return prev;

      if (!newMessage.fromAdmin) {
        const tempIndex = findBestTempIndexToReplace(prev, newMessage);
        if (tempIndex !== -1) {
          const updated = [...prev];
          updated[tempIndex] = newMessage;
          return updated;
        }
      }

      return [...prev, newMessage];
    });
  }, []);

  const mergeSeenUpdate = useCallback((raw: unknown) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
    const o = raw as Record<string, unknown>;
    const updates = Array.isArray(o.updates) ? o.updates : [];
    const patch = new Map<string, string[]>();
    for (const u of updates) {
      if (!u || typeof u !== "object" || Array.isArray(u)) continue;
      const rec = u as Record<string, unknown>;
      const mid = typeof rec.id === "string" ? rec.id : "";
      if (!mid) continue;
      patch.set(mid, normalizeSeenBy(rec.seenBy));
    }
    if (patch.size === 0) return;
    setMessages((prev) =>
      prev.map((msg) => {
        const sn = patch.get(msg.id);
        return sn ? { ...msg, seenBy: sn } : msg;
      }),
    );
  }, []);

  const flushMarkSeenIfUnread = useCallback(
    async (tid: string, opts?: { keepalive?: boolean; leaveBurst?: boolean }) => {
      const leaveBurst = Boolean(opts?.leaveBurst);
      if (leaveBurst) {
        if (hasFlushedRef.current) return;
        hasFlushedRef.current = true;
      }
      const rollbackLeaveBurst = () => {
        if (leaveBurst) hasFlushedRef.current = false;
      };

      try {
        const uid = session?.user?.id;
        if (!uid || !tid) {
          rollbackLeaveBurst();
          return;
        }
        const list = messagesRef.current;
        const hasUnread = list.some((m) => !m.seenBy.includes(uid));
        if (!hasUnread) {
          rollbackLeaveBurst();
          return;
        }
        if (!tryReserveMarkSeenForTicket(tid)) {
          rollbackLeaveBurst();
          return;
        }
        const markRes = await fetchWithAuth(`/api/account/support-tickets/${encodeURIComponent(tid)}/seen`, {
          method: "POST",
          keepalive: Boolean(opts?.keepalive),
        });
        if (!markRes.ok) {
          releaseMarkSeenTabLock(tid);
          rollbackLeaveBurst();
          return;
        }
        releaseMarkSeenTabLock(tid);
        if (opts?.keepalive) return;
        const mj = (await markRes.json()) as { ok?: boolean; updates?: unknown };
        applySeenUpdatesFromMarkResponse(setMessages, mj);
      } catch {
        releaseMarkSeenTabLock(tid);
        rollbackLeaveBurst();
      }
    },
    [session?.user?.id],
  );

  const scheduleMarkSeenIfUnread = useCallback(
    (tid: string) => {
      if (markSeenAfterPusherTimerRef.current) clearTimeout(markSeenAfterPusherTimerRef.current);
      markSeenAfterPusherTimerRef.current = setTimeout(() => {
        markSeenAfterPusherTimerRef.current = null;
        void flushMarkSeenIfUnread(tid);
      }, MARK_SEEN_DEBOUNCE_MS);
    },
    [flushMarkSeenIfUnread],
  );

  const ensureTicket = useCallback(async (): Promise<string | null> => {
    try {
      const createRes = await fetchWithAuth("/api/account/support-tickets/ensure-default", {
        method: "POST",
      });
      const createJson = (await createRes.json()) as { ok?: boolean; id?: string; message?: string };
      if (!createRes.ok || !createJson.ok || !createJson.id) {
        setError(createJson.message ?? "Không tạo được cuộc hội thoại.");
        return null;
      }
      return createJson.id;
    } catch (e) {
      setError(e instanceof FetchUnauthorizedError ? e.message : "Không tải được ticket.");
      return null;
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !isUser) {
      setBootLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setBootLoading(true);
      setError("");
      const id = await ensureTicket();
      if (cancelled) return;
      if (!id) {
        setBootLoading(false);
        return;
      }
      setTicketId(id);
      await fetchMessages(id);
      if (!cancelled) setBootLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [status, isUser, ensureTicket, fetchMessages]);

  useEffect(() => {
    if (!ticketId || !isUser) return;
    scrollToBottom();
  }, [messages, ticketId, isUser, scrollToBottom]);

  useEffect(() => {
    if (!ticketId || !isUser || !hasPusherClientConfig()) return;

    const key = process.env.NEXT_PUBLIC_PUSHER_KEY!.trim();
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER!.trim();
    const channelName = supportTicketChatChannelName(ticketId);

    const pusher = new Pusher(key, {
      cluster,
      forceTLS: true,
      authEndpoint: "/api/pusher/auth",
    });
    const channel = pusher.subscribe(channelName);
    const onNew = (data: unknown) => {
      mergePusherNewMessage(data);
      scheduleMarkSeenIfUnread(ticketId);
    };
    const onSeen = (data: unknown) => {
      mergeSeenUpdate(data);
    };
    channel.bind("new-message", onNew);
    channel.bind("seen-update", onSeen);

    return () => {
      if (markSeenAfterPusherTimerRef.current) {
        clearTimeout(markSeenAfterPusherTimerRef.current);
        markSeenAfterPusherTimerRef.current = null;
      }
      void flushMarkSeenIfUnread(ticketId, { leaveBurst: true });
      channel.unbind("new-message", onNew);
      channel.unbind("seen-update", onSeen);
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [
    ticketId,
    isUser,
    mergePusherNewMessage,
    mergeSeenUpdate,
    scheduleMarkSeenIfUnread,
    flushMarkSeenIfUnread,
  ]);

  useEffect(() => {
    if (!ticketId || !isUser) return;
    const onBeforeUnload = () => {
      void flushMarkSeenIfUnread(ticketId, { keepalive: true, leaveBurst: true });
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [ticketId, isUser, flushMarkSeenIfUnread]);

  useEffect(() => {
    if (!isUser) return;
    if (!messages.some((m) => m.isTemp && !m.isFailed)) return;

    const interval = setInterval(() => {
      setMessages((prev) =>
        prev.map((m) => {
          if (!m.isTemp || m.isFailed) return m;
          const sent = m.sentAt ?? m.clientCreatedAt;
          if (sent == null || !Number.isFinite(sent)) return m;
          if (Date.now() - sent > TEMP_CONFIRM_TIMEOUT_MS) {
            return { ...m, isFailed: true };
          }
          return m;
        }),
      );
    }, TEMP_FALLBACK_POLL_MS);

    return () => clearInterval(interval);
  }, [isUser, messages]);

  const retryFailedMessage = async (failed: ChatMessage) => {
    if (!ticketId || sendLoading || !failed.isTemp || !failed.isFailed) return;
    const body = failed.body;
    const newTempId = `temp-${Date.now()}`;
    const ts = Date.now();
    setMessages((prev) =>
      prev.map((m) =>
        m.id === failed.id
          ? {
              id: newTempId,
              body,
              fromAdmin: false,
              createdAt: new Date().toISOString(),
              seenBy: [],
              isTemp: true,
              isFailed: false,
              clientCreatedAt: ts,
              sentAt: ts,
            }
          : m,
      ),
    );
    setSendLoading(true);
    setError("");
    try {
      const res = await fetchWithAuth(`/api/account/support-tickets/${encodeURIComponent(ticketId)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const j = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !j.ok) {
        setError(j.message ?? "Không gửi được tin nhắn.");
        setMessages((prev) =>
          prev.map((m) => (m.id === newTempId ? { ...m, isFailed: true } : m)),
        );
      }
    } catch (e) {
      setError(e instanceof FetchUnauthorizedError ? e.message : "Không gửi được tin nhắn.");
      setMessages((prev) =>
        prev.map((m) => (m.id === newTempId ? { ...m, isFailed: true } : m)),
      );
    } finally {
      setSendLoading(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!ticketId || !text || sendLoading) return;
    setSendLoading(true);
    setError("");

    const useRealtime = hasPusherClientConfig();
    const tempId = useRealtime ? `temp-${Date.now()}` : null;

    if (useRealtime && tempId) {
      const ts = Date.now();
      const tempMessage: ChatMessage = {
        id: tempId,
        body: text,
        fromAdmin: false,
        createdAt: new Date().toISOString(),
        seenBy: [],
        isTemp: true,
        clientCreatedAt: ts,
        sentAt: ts,
      };
      setMessages((prev) => [...prev, tempMessage]);
      setInput("");
    }

    const removeTemp = () => {
      if (!tempId) return;
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    };

    try {
      const res = await fetchWithAuth(`/api/account/support-tickets/${encodeURIComponent(ticketId)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const j = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !j.ok) {
        setError(j.message ?? "Không gửi được tin nhắn.");
        removeTemp();
        if (useRealtime) setInput(text);
        return;
      }
      if (!useRealtime) {
        setInput("");
        await fetchMessages(ticketId);
      }
    } catch (e) {
      setError(e instanceof FetchUnauthorizedError ? e.message : "Không gửi được tin nhắn.");
      removeTemp();
      if (useRealtime) setInput(text);
    } finally {
      setSendLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <p className="text-sm text-slate-600">Đang tải…</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-lg font-semibold text-slate-900">Liên hệ hỗ trợ</h1>
        <p className="mt-2 text-sm text-slate-600">Đăng nhập để chat với đội ngũ Zendo.vn.</p>
        <Link
          href="/tai-khoan?callbackUrl=%2Fchat"
          className="mt-4 inline-flex h-11 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (status === "authenticated" && isStaffAdminRole(role)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <p className="text-sm text-slate-600">Đang chuyển tới quản trị hỗ trợ…</p>
      </div>
    );
  }

  if (!isUser) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-lg font-semibold text-slate-900">Liên hệ hỗ trợ</h1>
        <p className="mt-2 text-sm text-slate-600">Tài khoản hiện tại không thể dùng kênh chat này.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-full flex-col px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 md:max-w-3xl md:px-5 lg:max-w-4xl">
      <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200 bg-white/95 py-3 backdrop-blur-sm">
        <h1 className="text-base font-semibold leading-snug text-slate-900 sm:text-lg">Liên hệ hỗ trợ</h1>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
          Tin nhắn đồng bộ với ticket hỗ trợ — đội ngũ sẽ phản hồi tại đây.
        </p>
        {!hasPusherClientConfig() ? (
          <p className="mt-2 text-xs leading-relaxed text-amber-900 sm:text-sm">
            Realtime (Pusher) chưa cấu hình — tin từ admin có thể cập nhật sau khi tải lại trang.
          </p>
        ) : null}
      </header>

      {bootLoading ? (
        <p className="mt-4 text-sm text-slate-600 sm:text-base">Đang mở cuộc hội thoại…</p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm leading-relaxed text-rose-600 sm:text-base" role="alert">
          {error}
        </p>
      ) : null}

      {!bootLoading && ticketId ? (
        <div className="mt-3 flex min-h-[min(55dvh,calc(100dvh-14rem))] flex-1 flex-col gap-3 sm:min-h-[min(50dvh,calc(100dvh-12rem))] md:min-h-[min(480px,calc(100dvh-11rem))]">
          <div
            ref={listRef}
            className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4"
            aria-live="polite"
          >
            {messagesLoading && messages.length === 0 ? (
              <p className="text-sm text-slate-500 sm:text-base">Đang tải tin nhắn…</p>
            ) : null}
            {!messagesLoading && messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500 sm:text-base">Chưa có tin nhắn</p>
            ) : null}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[min(70vw,70%)] min-w-0 rounded-2xl px-3 py-2.5 text-sm leading-relaxed shadow-sm sm:max-w-[70%] sm:px-3.5 sm:text-[15px] md:text-base ${
                  m.fromAdmin
                    ? "self-start border border-violet-200 bg-violet-50 text-slate-900"
                    : m.isFailed
                      ? "self-end border border-rose-300 bg-rose-50 text-slate-900"
                      : "self-end border border-slate-200 bg-white text-slate-900"
                }${m.isTemp && !m.isFailed ? " opacity-90" : ""}`}
              >
                <p className="flex flex-wrap items-center gap-x-1.5 text-[11px] font-medium text-slate-500 sm:text-xs">
                  <span>
                    {m.fromAdmin ? "Zendo.vn" : "Bạn"} · {new Date(m.createdAt).toLocaleString("vi-VN")}
                  </span>
                  {!m.fromAdmin && !m.isTemp && session?.user?.id && m.seenBy.some((x) => x !== session.user.id) ? (
                    <span className="inline-flex shrink-0 text-emerald-600" title="Đã xem" aria-label="Đã xem">
                      ✔
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words">{m.body}</p>
                {m.isTemp && m.isFailed ? (
                  <div className="mt-2 flex min-w-0 flex-col gap-2 border-t border-rose-200/90 pt-2">
                    <p className="text-xs font-medium text-rose-800 sm:text-sm">Gửi thất bại</p>
                    <button
                      type="button"
                      disabled={sendLoading || ticketStatus === "CLOSED"}
                      onClick={() => void retryFailedMessage(m)}
                      className="inline-flex min-h-[44px] max-w-full items-center justify-center rounded-lg border border-rose-300 bg-white px-3 text-sm font-semibold text-rose-900 transition hover:bg-rose-100 active:scale-[0.98] disabled:opacity-50"
                    >
                      Gửi lại
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {ticketStatus === "CLOSED" ? (
            <p className="text-sm text-slate-600 sm:text-base">Cuộc hội thoại đã đóng — không thể gửi thêm tin nhắn.</p>
          ) : (
            <div className="sticky bottom-0 z-10 shrink-0 border-t border-slate-200/90 bg-gradient-to-t from-white via-white to-white/95 pt-3 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:static sm:border-0 sm:bg-transparent sm:pb-0 sm:pt-0 sm:backdrop-blur-none">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
                <label className="sr-only" htmlFor="chat-input">
                  Nội dung tin nhắn
                </label>
                <textarea
                  id="chat-input"
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Nhập tin nhắn…"
                  disabled={sendLoading}
                  className="min-h-[48px] w-full min-w-0 flex-1 resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-base text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-60 sm:min-h-[44px] sm:text-sm md:text-[15px]"
                />
                <button
                  type="button"
                  disabled={sendLoading || !input.trim()}
                  onClick={() => void sendMessage()}
                  className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl bg-blue-600 px-5 text-base font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 sm:min-h-[48px] sm:px-6 sm:text-sm"
                >
                  {sendLoading ? "Đang gửi…" : "Gửi"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
