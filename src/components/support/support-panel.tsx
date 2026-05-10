"use client";

import Pusher from "pusher-js";
import { useSession } from "next-auth/react";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import { fetchWithAuth, FetchUnauthorizedError } from "@/lib/fetchWithAuth";
import type { AdminSupportTicketListFilter } from "@/lib/admin-support-tickets";
import { isAdminSupportTicketRole } from "@/lib/admin-support-ticket-roles";
import { useStorefrontSupportDisabledOnAdminRoute } from "@/lib/use-storefront-support-disabled-on-admin";
import { isGlobalOverlayOpen, subscribeGlobalOverlayOpen } from "@/lib/ui-state";
import {
  STOREFRONT_SUPPORT_BROADCAST,
  STOREFRONT_SUPPORT_BC_DEBOUNCE_MS,
  formatSupportUnreadBadge,
  type StorefrontSupportBroadcastPayload,
} from "@/lib/storefront-support-sync";
import { hasPusherClientConfig, supportTicketChatChannelName } from "@/lib/support-ticket-chat-channel";
import {
  STORE_QUICK_QUESTIONS_AFFILIATE,
  STORE_QUICK_QUESTIONS_CUSTOMER,
  allAdminQuickReplyPresets,
  rankAdminQuickReplyPresets,
  type AdminQuickReplyPreset,
} from "@/lib/support-ticket-faq-presets";
import { formatSenderRoleForUi, formatSupportTicketStatusUi } from "@/lib/support-ticket-status";
import { mergeSupportTicketTags } from "@/lib/support-ticket-tags";
import { postEnsureDefaultSupportTicketForStorefront } from "@/lib/support-ticket-storefront-client";
import { isAffiliateTicketType } from "./support-ticket-buckets";

const MAX_PUSHER_TICKET_CHANNELS = 30;
const MAX_HANDLED_MESSAGE_IDS = 800;
const MAX_CHAT_MESSAGES = 200;
const COMPOSER_TEXTAREA_MAX_PX = 192;

const ADMIN_QUICK_REPLY_STORAGE_KEY = "zendo-support-admin-quick-reply-last";

type AdminQuickReplyItem = AdminQuickReplyPreset;

const ADMIN_QUICK_REPLY_ITEMS: readonly AdminQuickReplyItem[] = allAdminQuickReplyPresets();

function logSupportPanelDev(message: string, details?: unknown): void {
  if (process.env.NODE_ENV !== "development") return;
  if (details !== undefined) console.error(message, details);
  else console.error(message);
}

function flushSeenKeepalive(ticketId: string, useAdminApi: boolean): void {
  if (!ticketId) return;
  const base = useAdminApi ? "/api/admin/support-tickets" : "/api/account/support-tickets";
  const url = `${base}/${encodeURIComponent(ticketId)}/seen`;
  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([JSON.stringify({})], { type: "application/json" });
      const sent = navigator.sendBeacon(url, blob);
      if (!sent) {
        void fetchWithAuth(url, {
          method: "POST",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }).catch(() => {});
      }
    } else {
      void fetchWithAuth(url, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

type AssignedAdminBrief = { id: string; fullName: string; email: string };

type SupportTicketListRow = {
  id: string;
  subject: string;
  type: string;
  customerUnreadCount: number;
  status: string;
  priority?: string;
  lastMessageAt?: string;
  /** Admin API: affiliate vs customer (ưu tiên hơn heuristic theo `type`). */
  participantKind?: "affiliate" | "customer";
};

type ChatMessage = {
  id: string;
  body: string;
  fromAdmin: boolean;
  createdAt: string;
  /** AFFILIATE | CUSTOMER | ADMIN — hiển thị UI map AFFILIATE → CTV */
  senderRole?: string;
  isTemp?: boolean;
  isFailed?: boolean;
  clientCreatedAt?: number;
};

function capChatMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.length <= MAX_CHAT_MESSAGES ? messages : messages.slice(-MAX_CHAT_MESSAGES);
}

function computePusherChannelIdsKey(tickets: SupportTicketListRow[]): string {
  if (tickets.length === 0) return "";
  return [...new Set(tickets.map((t) => t.id))].sort().join("|");
}

function messagesListShallowEqual(a: ChatMessage[], b: ChatMessage[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.body !== y.body ||
      x.fromAdmin !== y.fromAdmin ||
      x.createdAt !== y.createdAt ||
      (x.senderRole ?? "") !== (y.senderRole ?? "") ||
      Boolean(x.isTemp) !== Boolean(y.isTemp) ||
      Boolean(x.isFailed) !== Boolean(y.isFailed)
    ) {
      return false;
    }
  }
  return true;
}

function mergeServerAndLocalMessages(serverOrdered: ChatMessage[], local: ChatMessage[]): ChatMessage[] {
  const serverIds = new Set(serverOrdered.map((m) => m.id));
  const seen = new Set(serverOrdered.map((m) => m.id));
  const out: ChatMessage[] = [...serverOrdered];
  for (const m of local) {
    if (seen.has(m.id)) continue;
    if (m.id.startsWith("temp-")) {
      out.push(m);
      seen.add(m.id);
      continue;
    }
    if (!serverIds.has(m.id)) {
      out.push(m);
      seen.add(m.id);
    }
  }
  out.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  return capChatMessages(out);
}

const SupportChatBubble = memo(
  function SupportChatBubble({
    m,
    ticketClosed,
    sending,
    detailLoading,
    onRetry,
  }: {
    m: ChatMessage;
    ticketClosed: boolean;
    sending: boolean;
    detailLoading: boolean;
    onRetry: (msg: ChatMessage) => void;
  }): JSX.Element {
    const bubbleUser =
      m.isFailed && !m.fromAdmin
        ? "rounded-2xl rounded-br-md bg-rose-500 text-white shadow-sm"
        : m.isTemp && !m.isFailed && !m.fromAdmin
          ? "rounded-2xl rounded-br-md bg-[#0b74da] text-white shadow-sm ring-1 ring-blue-400/40"
          : "rounded-2xl rounded-br-md bg-[#0084ff] text-white shadow-sm";
    const bubbleAdmin =
      "rounded-2xl rounded-bl-md border border-slate-200/80 bg-white text-slate-900 shadow-sm";

    if (m.fromAdmin) {
      return (
        <div className="flex w-full min-w-0 items-end justify-start gap-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-[11px] font-bold text-slate-700"
            aria-hidden
          >
            Z
          </div>
          <div
            className={`min-w-0 max-w-[min(calc(100%-2.75rem),40rem)] break-words px-3.5 py-2.5 text-sm leading-relaxed ${bubbleAdmin}`}
          >
            <span className="whitespace-pre-wrap break-words">{m.body}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex w-full min-w-0 items-end justify-end gap-2">
        <div
          className={`min-w-0 max-w-[min(calc(100%-2.75rem),40rem)] break-words px-3.5 py-2.5 text-sm leading-relaxed ${bubbleUser}`}
        >
          <span className="whitespace-pre-wrap break-words">{m.body}</span>
          {m.isFailed ? (
            <button
              type="button"
              disabled={sending || detailLoading || ticketClosed}
              onClick={() => void onRetry(m)}
              className="mt-1 block text-left text-xs font-semibold text-white/95 underline decoration-white/70 hover:text-white disabled:opacity-50"
            >
              Thử lại
            </button>
          ) : null}
          {m.isTemp && !m.isFailed ? (
            <span className="mt-1 block text-[10px] font-medium text-white/85">Đang gửi…</span>
          ) : null}
        </div>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-[#0084ff] text-[11px] font-bold text-white"
          aria-hidden
          title={formatSenderRoleForUi(m.senderRole ?? "CUSTOMER")}
        >
          {(formatSenderRoleForUi(m.senderRole ?? "CUSTOMER").charAt(0) || "K").toUpperCase()}
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.m.id === next.m.id &&
    prev.m.body === next.m.body &&
    prev.m.fromAdmin === next.m.fromAdmin &&
    (prev.m.senderRole ?? "") === (next.m.senderRole ?? "") &&
    prev.m.isTemp === next.m.isTemp &&
    prev.m.isFailed === next.m.isFailed &&
    prev.m.createdAt === next.m.createdAt &&
    prev.ticketClosed === next.ticketClosed &&
    prev.sending === next.sending &&
    prev.detailLoading === next.detailLoading,
);

type SupportChatMessagesListProps = {
  messages: ChatMessage[];
  ticketClosed: boolean;
  sending: boolean;
  detailLoading: boolean;
  onRetry: (msg: ChatMessage) => void;
};

const SupportChatMessagesList = memo(
  function SupportChatMessagesList({
    messages,
    ticketClosed,
    sending,
    detailLoading,
    onRetry,
  }: SupportChatMessagesListProps): JSX.Element {
    return (
      <>
        {messages.map((m) => (
          <SupportChatBubble
            key={m.id}
            m={m}
            ticketClosed={ticketClosed}
            sending={sending}
            detailLoading={detailLoading}
            onRetry={onRetry}
          />
        ))}
      </>
    );
  },
  (prev, next) => {
    if (
      prev.ticketClosed !== next.ticketClosed ||
      prev.sending !== next.sending ||
      prev.detailLoading !== next.detailLoading ||
      prev.onRetry !== next.onRetry
    ) {
      return false;
    }
    return messagesListShallowEqual(prev.messages, next.messages);
  },
);

type DetailTicket = {
  id: string;
  subject: string;
  type: string;
  status: string;
  customerUnreadCount: number;
  priority: string;
  tags: string[];
  assignedAdmin: AssignedAdminBrief | null;
};

function normalizeBodyKey(s: string): string {
  return s.trim();
}

function parseTagsFromApi(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const t = x.trim();
    if (t) out.push(t);
  }
  return out;
}

function parseAssignedAdminFromApi(raw: unknown): AssignedAdminBrief | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  if (!id) return null;
  const fullName = typeof o.fullName === "string" ? o.fullName : "";
  const email = typeof o.email === "string" ? o.email : "";
  return { id, fullName, email };
}

function ticketStatusBadgeClass(status: string): string {
  const s = status.trim().toUpperCase();
  if (s === "OPEN") return "bg-slate-100 text-slate-700 ring-slate-200/80";
  if (s === "PENDING") return "bg-amber-100 text-amber-900 ring-amber-200/80";
  if (s === "WAITING_ADMIN") return "bg-rose-100 text-rose-900 ring-rose-200/80";
  if (s === "WAITING_USER") return "bg-amber-100 text-amber-950 ring-amber-300/80";
  if (s === "RESOLVED") return "bg-slate-200/70 text-slate-600 ring-slate-300/60";
  if (s === "CLOSED") return "bg-zinc-200 text-zinc-700 ring-zinc-300/70";
  return "bg-slate-100 text-slate-600 ring-slate-200/80";
}

function priorityBadgeClass(priority: string): string {
  const p = priority.trim().toUpperCase();
  if (p === "HIGH") return "bg-rose-100 text-rose-900 ring-rose-200/80";
  if (p === "LOW") return "bg-slate-100 text-slate-600 ring-slate-200/80";
  return "bg-sky-100 text-sky-900 ring-sky-200/80";
}

function TicketStatusBadge({ status }: { status: string }): JSX.Element {
  const s = status.trim().toUpperCase() || "OPEN";
  const label = formatSupportTicketStatusUi(s);
  return (
    <span
      className={`inline-flex max-w-full shrink-0 truncate rounded px-1 py-px text-[9px] font-semibold leading-none tracking-wide ring-1 sm:text-[10px] ${ticketStatusBadgeClass(s)}`}
      title={s}
    >
      {label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }): JSX.Element {
  const p = priority.trim().toUpperCase() || "MEDIUM";
  return (
    <span
      className={`inline-flex max-w-full shrink-0 truncate rounded px-1 py-px text-[9px] font-semibold uppercase leading-none ring-1 sm:text-[10px] ${priorityBadgeClass(p)}`}
      title={p}
    >
      {p}
    </span>
  );
}

function normalizeTicket(raw: unknown): SupportTicketListRow | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  if (!id) return null;
  const subject = typeof o.subject === "string" ? o.subject : "";
  const type = typeof o.type === "string" ? o.type : "GENERAL";
  const cu = o.customerUnreadCount;
  const customerUnreadCount =
    typeof cu === "number" && Number.isFinite(cu) ? Math.max(0, Math.floor(cu)) : 0;
  const st = typeof o.status === "string" && o.status.trim() ? o.status.trim().toUpperCase() : "OPEN";
  const pr = typeof o.priority === "string" && o.priority.trim() ? o.priority.trim().toUpperCase() : undefined;
  const lm = typeof o.lastMessageAt === "string" ? o.lastMessageAt : "";
  return {
    id,
    subject,
    type,
    customerUnreadCount,
    status: st,
    ...(pr ? { priority: pr } : {}),
    ...(lm ? { lastMessageAt: lm } : {}),
  };
}

/** Danh sách admin: badge unread dùng `adminUnreadCount` (map vào field list giống khách). */
function normalizeTicketAdmin(raw: unknown): SupportTicketListRow | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  if (!id) return null;
  const subject = typeof o.subject === "string" ? o.subject : "";
  const type = typeof o.type === "string" ? o.type : "GENERAL";
  const au = o.adminUnreadCount;
  const customerUnreadCount =
    typeof au === "number" && Number.isFinite(au) ? Math.max(0, Math.floor(au)) : 0;
  const st = typeof o.status === "string" && o.status.trim() ? o.status.trim().toUpperCase() : "OPEN";
  const pr = typeof o.priority === "string" && o.priority.trim() ? o.priority.trim().toUpperCase() : undefined;
  const pk = o.participantKind;
  const participantKind = pk === "affiliate" || pk === "customer" ? pk : undefined;
  const lm = typeof o.lastMessageAt === "string" ? o.lastMessageAt : "";
  return {
    id,
    subject,
    type,
    customerUnreadCount,
    status: st,
    ...(pr ? { priority: pr } : {}),
    ...(participantKind ? { participantKind } : {}),
    ...(lm ? { lastMessageAt: lm } : {}),
  };
}

function normalizeMessage(raw: unknown): ChatMessage | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  const body = typeof o.body === "string" ? o.body : "";
  const createdAt =
    typeof o.createdAt === "string"
      ? o.createdAt
      : o.createdAt instanceof Date
        ? o.createdAt.toISOString()
        : "";
  if (!id || !createdAt) return null;
  const sr = typeof o.senderRole === "string" && o.senderRole.trim() ? o.senderRole.trim() : undefined;
  return {
    id,
    body,
    fromAdmin: o.fromAdmin === true,
    createdAt,
    ...(sr ? { senderRole: sr } : {}),
  };
}

function normalizeDetailTicket(raw: unknown): DetailTicket | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  if (!id) return null;
  const statusRaw = typeof o.status === "string" ? o.status.trim() : "";
  const status = statusRaw ? statusRaw.toUpperCase() : "OPEN";
  const subject = typeof o.subject === "string" ? o.subject : "";
  const type = typeof o.type === "string" ? o.type : "GENERAL";
  const cu = o.customerUnreadCount;
  const customerUnreadCount =
    typeof cu === "number" && Number.isFinite(cu) ? Math.max(0, Math.floor(cu)) : 0;
  const priority =
    typeof o.priority === "string" && o.priority.trim() ? o.priority.trim().toUpperCase() : "MEDIUM";
  const tags = parseTagsFromApi(o.tags);
  const assignedAdmin = parseAssignedAdminFromApi(o.assignedAdmin);
  return { id, subject, type, status, customerUnreadCount, priority, tags, assignedAdmin };
}

async function postSupportMessage(
  ticketId: string,
  body: string,
  useAdminApi: boolean,
): Promise<{
  ok: boolean;
  message?: string;
  messageId?: string;
  adminUnreadCount?: number;
  customerUnreadCount?: number;
}> {
  try {
    const path = useAdminApi
      ? `/api/admin/support-tickets/${encodeURIComponent(ticketId)}/messages`
      : `/api/account/support-tickets/${encodeURIComponent(ticketId)}/messages`;
    const res = await fetchWithAuth(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const j = (await res.json()) as {
      ok?: boolean;
      message?: string;
      messageId?: string;
      id?: string;
      adminUnreadCount?: unknown;
      customerUnreadCount?: unknown;
    };
    if (!res.ok || j.ok !== true) {
      return { ok: false, message: j.message ?? "Không gửi được tin nhắn." };
    }
    const messageId =
      typeof j.messageId === "string"
        ? j.messageId.trim()
        : typeof j.id === "string"
          ? j.id.trim()
          : "";
    const ac =
      typeof j.adminUnreadCount === "number" && Number.isFinite(j.adminUnreadCount)
        ? Math.max(0, Math.floor(j.adminUnreadCount))
        : undefined;
    const cc =
      typeof j.customerUnreadCount === "number" && Number.isFinite(j.customerUnreadCount)
        ? Math.max(0, Math.floor(j.customerUnreadCount))
        : undefined;
    return {
      ok: true,
      messageId,
      ...(ac !== undefined ? { adminUnreadCount: ac } : {}),
      ...(cc !== undefined ? { customerUnreadCount: cc } : {}),
    };
  } catch (e) {
    if (e instanceof FetchUnauthorizedError) {
      return { ok: false, message: e.message };
    }
    return { ok: false, message: "Không gửi được tin nhắn." };
  }
}

export default function SupportPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): JSX.Element {
  const { data: session, status: sessionStatus } = useSession();
  const isStorefrontCustomer =
    sessionStatus === "authenticated" && session?.user?.role === "USER";
  const isStaffAdmin =
    sessionStatus === "authenticated" && isAdminSupportTicketRole(session?.user?.role);
  const canUseSupportTicketsApi = isStorefrontCustomer || isStaffAdmin;

  const disabledOnAdminRoute = useStorefrontSupportDisabledOnAdminRoute();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const composerResizeRef = useRef<HTMLDivElement | null>(null);
  const skipNextScrollFromFetchRef = useRef(false);
  const previousFetchTicketIdRef = useRef<string | null>(null);

  const syncComposerHeight = useCallback((): void => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_TEXTAREA_MAX_PX)}px`;
  }, []);
  const shouldAutoScrollRef = useRef(true);
  const selectedIdRef = useRef<string | null>(null);
  const openRef = useRef(open);
  const tabVisibleRef = useRef(
    typeof document !== "undefined" ? document.visibilityState === "visible" : true,
  );
  const bcRef = useRef<BroadcastChannel | null>(null);
  const bcInboundDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refetchTicketsListRef = useRef<(opts?: { silent?: boolean }) => Promise<number>>(async () => -1);
  const customerBootstrapOnceKeyRef = useRef<string>("");
  /** Tăng mỗi lần gọi list; chỉ apply state khi khớp (chống race). */
  const listTicketsFetchGenRef = useRef(0);
  /** Chỉ non-silent mới tăng; khi về 0 thì tắt loading. */
  const listNonSilentFetchDepthRef = useRef(0);
  const postUnreadSyncRef = useRef<(ticketId: string) => void>(() => {});
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mountedRef = useRef(true);
  const listHydratedRef = useRef(false);
  const canUseSupportTicketsApiRef = useRef(false);
  const isStaffAdminRef = useRef(false);
  const customerSessionIdRef = useRef("");

  const [tickets, setTickets] = useState<SupportTicketListRow[]>([]);
  const lastGoodTicketsRef = useRef<SupportTicketListRow[]>([]);
  const [loading, setLoading] = useState(true);
  /** Đã nhận ít nhất một response list hợp lệ (kể cả mảng rỗng) — tránh nhãn empty giả trước lần load đầu. */
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [listError, setListError] = useState("");
  const [adminListFilter, setAdminListFilter] = useState<AdminSupportTicketListFilter>("all");
  const adminListFilterRef = useRef<AdminSupportTicketListFilter>("all");
  adminListFilterRef.current = adminListFilter;
  const [adminTagFilter, setAdminTagFilter] = useState<string>("");
  const adminTagFilterRef = useRef<string>("");
  adminTagFilterRef.current = adminTagFilter;

  const [selectedTicket, setSelectedTicket] = useState<SupportTicketListRow | null>(null);
  const [detailTicket, setDetailTicket] = useState<DetailTicket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const [isNarrow, setIsNarrow] = useState(false);
  const [mobileChatTab, setMobileChatTab] = useState<"list" | "chat">("list");
  const [keyboardInsetPx, setKeyboardInsetPx] = useState(0);

  selectedIdRef.current = selectedTicket?.id ?? null;
  openRef.current = open;
  customerSessionIdRef.current = typeof session?.user?.id === "string" ? session.user.id : "";

  const globalOverlayBlocks = useSyncExternalStore(
    subscribeGlobalOverlayOpen,
    () => isGlobalOverlayOpen,
    () => false,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = (): void => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) {
      setMobileChatTab("list");
      setKeyboardInsetPx(0);
      return;
    }
    if (!isNarrow) {
      setKeyboardInsetPx(0);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;
    const onVv = (): void => {
      const gap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInsetPx(gap);
    };
    onVv();
    vv.addEventListener("resize", onVv);
    vv.addEventListener("scroll", onVv);
    return () => {
      vv.removeEventListener("resize", onVv);
      vv.removeEventListener("scroll", onVv);
    };
  }, [open, isNarrow]);

  useEffect(() => {
    if (isNarrow && mobileChatTab === "chat" && !selectedTicket?.id) setMobileChatTab("list");
  }, [isNarrow, mobileChatTab, selectedTicket?.id]);

  canUseSupportTicketsApiRef.current = canUseSupportTicketsApi;
  isStaffAdminRef.current = isStaffAdmin;

  /** Số ticket sau khi normalize; -1 khi lỗi hoặc stale. Silent: không đụng tickets/loading/listError khi lỗi. */
  const refetchTicketsList = useCallback(async (opts?: { silent?: boolean }): Promise<number> => {
    if (!canUseSupportTicketsApiRef.current) {
      if (!opts?.silent && mountedRef.current) setLoading(false);
      return -1;
    }

    const silent = opts?.silent === true;
    const requestId = ++listTicketsFetchGenRef.current;

    if (!silent) {
      listNonSilentFetchDepthRef.current += 1;
      setLoading(true);
      setListError("");
    }

    const staff = isStaffAdminRef.current;
    const tagQ =
      staff && adminTagFilterRef.current.trim()
        ? `&tag=${encodeURIComponent(adminTagFilterRef.current.trim())}`
        : "";
    const listUrl = staff
      ? `/api/admin/support-tickets?filter=${encodeURIComponent(adminListFilterRef.current)}${tagQ}`
      : "/api/account/support-tickets";

    const finishNonSilentLoading = (): void => {
      if (silent) return;
      listNonSilentFetchDepthRef.current = Math.max(0, listNonSilentFetchDepthRef.current - 1);
      if (listNonSilentFetchDepthRef.current === 0 && mountedRef.current) setLoading(false);
    };

    try {
      const res = await fetchWithAuth(listUrl);
      let data: { ok?: boolean; tickets?: unknown[]; message?: string } = {};
      try {
        data = (await res.json()) as { ok?: boolean; tickets?: unknown[]; message?: string };
      } catch {
        /* body không parse được */
      }
      if (!mountedRef.current) {
        finishNonSilentLoading();
        return -1;
      }
      if (requestId !== listTicketsFetchGenRef.current) {
        finishNonSilentLoading();
        return -1;
      }

      const validListResponse = res.ok && data.ok === true && Array.isArray(data.tickets);

      if (!validListResponse) {
        const hasDataBefore = lastGoodTicketsRef.current.length > 0;
        if (!silent) {
          logSupportPanelDev("[SupportPanel] REFETCH ERROR", {
            silent: false,
            requestId,
            httpOk: res.ok,
            dataOk: data.ok,
            hasTicketsArray: Array.isArray(data.tickets),
            message: data.message,
            hasDataBefore,
          });
          if (!hasDataBefore) {
            setListError(data.message ?? "Không tải được danh sách.");
          }
        } else {
          logSupportPanelDev("[SupportPanel] REFETCH ERROR (silent, state unchanged)", {
            silent: true,
            requestId,
            httpOk: res.ok,
            dataOk: data.ok,
            hasTicketsArray: Array.isArray(data.tickets),
            message: data.message,
          });
        }
        finishNonSilentLoading();
        return -1;
      }

      const norm = staff ? normalizeTicketAdmin : normalizeTicket;
      const rows = data.tickets.map(norm).filter((t): t is SupportTicketListRow => t !== null);

      if (!mountedRef.current || requestId !== listTicketsFetchGenRef.current) {
        finishNonSilentLoading();
        return -1;
      }

      setTickets(rows);
      lastGoodTicketsRef.current = rows;
      setHasLoadedOnce(true);
      setListError("");
      setSelectedTicket((st) => {
        if (!st) return st;
        const fresh = rows.find((r) => r.id === st.id);
        if (!fresh) return st;
        return {
          ...st,
          customerUnreadCount: fresh.customerUnreadCount,
          status: fresh.status,
          ...(typeof fresh.priority === "string" ? { priority: fresh.priority } : {}),
          ...(fresh.participantKind ? { participantKind: fresh.participantKind } : {}),
          ...(fresh.lastMessageAt ? { lastMessageAt: fresh.lastMessageAt } : {}),
        };
      });
      setDetailTicket((d) => {
        if (!d) return d;
        const fresh = rows.find((r) => r.id === d.id);
        if (!fresh) return d;
        return {
          ...d,
          customerUnreadCount: fresh.customerUnreadCount,
          status: fresh.status,
          ...(typeof fresh.priority === "string" ? { priority: fresh.priority } : {}),
        };
      });

      finishNonSilentLoading();
      return rows.length;
    } catch (e) {
      if (!mountedRef.current) {
        finishNonSilentLoading();
        return -1;
      }
      if (requestId !== listTicketsFetchGenRef.current) {
        finishNonSilentLoading();
        return -1;
      }

      if (!silent) {
        const hasDataBefore = lastGoodTicketsRef.current.length > 0;
        logSupportPanelDev("[SupportPanel] REFETCH ERROR", e);
        if (!hasDataBefore) {
          setListError(e instanceof FetchUnauthorizedError ? e.message : "Không tải được danh sách.");
        }
      } else {
        logSupportPanelDev("[SupportPanel] REFETCH ERROR (silent, state unchanged)", e);
      }
      finishNonSilentLoading();
      return -1;
    }
  }, []);

  refetchTicketsListRef.current = refetchTicketsList;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setAdminListFilter("all");
      adminListFilterRef.current = "all";
      setAdminTagFilter("");
      adminTagFilterRef.current = "";
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (sessionStatus === "loading") return;

    if (!canUseSupportTicketsApi) {
      setLoading(false);
      setTickets([]);
      lastGoodTicketsRef.current = [];
      setHasLoadedOnce(false);
      setListError(
        sessionStatus === "unauthenticated"
          ? "Vui lòng đăng nhập tài khoản khách để dùng chat hỗ trợ."
          : "Chat hỗ trợ chỉ dành cho tài khoản khách hàng (mua hàng). Tài khoản quản trị không dùng kênh này.",
      );
      return;
    }

    let cancelled = false;

    /** Khách (popup): luôn ensure → GET list với loading bao phủ; không phụ thuộc silent/lần mở trước. */
    void (async () => {
      if (isStorefrontCustomer) {
        const customerId = customerSessionIdRef.current;
        const bootstrapKey = `${customerId}:${open ? "open" : "closed"}`;
        if (customerBootstrapOnceKeyRef.current === bootstrapKey) return;
        customerBootstrapOnceKeyRef.current = bootstrapKey;

        setLoading(true);
        setListError("");

        const abortBootstrap = (): void => {
          if (!mountedRef.current) return;
          setLoading(false);
        };

        for (let attempt = 0; attempt < 2; attempt++) {
          if (cancelled || !mountedRef.current) {
            abortBootstrap();
            return;
          }

          let ensureRes: Awaited<ReturnType<typeof postEnsureDefaultSupportTicketForStorefront>>;
          try {
            ensureRes = await postEnsureDefaultSupportTicketForStorefront();
          } catch {
            ensureRes = { ok: false, status: 0, message: "unexpected_error" };
          }

          if (ensureRes.ok !== false) {
            break;
          }

          // Retry một lần sau lỗi (auth tạm thời / race session).
          if (attempt === 0) {
            await new Promise<void>((resolve) => {
              setTimeout(resolve, 300);
            });
          }
        }

        if (cancelled || !mountedRef.current) {
          abortBootstrap();
          return;
        }

        let ticketCount = await refetchTicketsList({ silent: false });

        if (ticketCount === 0 && mountedRef.current && !cancelled) {
          await new Promise<void>((resolve) => {
            setTimeout(resolve, 300);
          });
          if (cancelled || !mountedRef.current) {
            abortBootstrap();
            return;
          }
          ticketCount = await refetchTicketsList({ silent: false });
        }

        if (mountedRef.current && ticketCount < 0 && lastGoodTicketsRef.current.length === 0) {
          setListError((prev) => prev || "Không thấy hội thoại hỗ trợ. Thử đóng mở lại hoặc tải lại trang.");
        }
        return;
      }

      const silent = listHydratedRef.current;
      listHydratedRef.current = true;
      if (cancelled || !mountedRef.current) return;
      await refetchTicketsList({ silent });
    })();
    return () => {
      cancelled = true;
    };
  }, [open, sessionStatus, canUseSupportTicketsApi, isStorefrontCustomer, refetchTicketsList]);

  useEffect(() => {
    function onVis(): void {
      const vis = document.visibilityState === "visible";
      tabVisibleRef.current = vis;
      if (vis === true && openRef.current && canUseSupportTicketsApiRef.current) {
        void refetchTicketsListRef.current({ silent: true });
      }
    }
    tabVisibleRef.current =
      typeof document !== "undefined" ? document.visibilityState === "visible" : true;
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (!open || !canUseSupportTicketsApi) return;
    const id = window.setInterval(() => {
      if (!openRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (!tabVisibleRef.current) return;
      void refetchTicketsListRef.current({ silent: true });
    }, 5000);
    return () => window.clearInterval(id);
  }, [open, canUseSupportTicketsApi]);

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      const ua = a.customerUnreadCount || 0;
      const ub = b.customerUnreadCount || 0;
      if (ub !== ua) return ub - ua;
      const ta = Date.parse(a.lastMessageAt ?? "") || 0;
      const tb = Date.parse(b.lastMessageAt ?? "") || 0;
      return tb - ta;
    });
  }, [tickets]);

  const storefrontQuickQuestions = useMemo(() => {
    return session?.user?.affiliateActive === true
      ? [...STORE_QUICK_QUESTIONS_AFFILIATE]
      : [...STORE_QUICK_QUESTIONS_CUSTOMER];
  }, [session?.user?.affiliateActive]);

  const [lastAdminQuickReplyId, setLastAdminQuickReplyId] = useState<string | null>(null);

  const detailForSelected = useMemo((): DetailTicket | null => {
    const sid = selectedTicket?.id;
    if (!sid || !detailTicket || detailTicket.id !== sid) return null;
    return detailTicket;
  }, [detailTicket, selectedTicket?.id]);

  const sortedAdminQuickReplyItems = useMemo(() => {
    const tags = detailForSelected?.tags ?? [];
    const pk = selectedTicket?.participantKind;
    const ranked = rankAdminQuickReplyPresets([...ADMIN_QUICK_REPLY_ITEMS], {
      ticketTags: tags,
      participantKind: pk,
    });
    if (!lastAdminQuickReplyId) return ranked;
    const hit = ranked.find((i) => i.id === lastAdminQuickReplyId);
    if (!hit) return ranked;
    return [hit, ...ranked.filter((i) => i.id !== lastAdminQuickReplyId)];
  }, [lastAdminQuickReplyId, detailForSelected?.tags, selectedTicket?.participantKind]);

  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined" ? localStorage.getItem(ADMIN_QUICK_REPLY_STORAGE_KEY) : null;
      if (!raw) return;
      const id = raw.trim();
      if (ADMIN_QUICK_REPLY_ITEMS.some((i) => i.id === id)) setLastAdminQuickReplyId(id);
    } catch {
      /* ignore */
    }
  }, []);

  const playNotifyBeep = useCallback((): void => {
    try {
      const w = window as Window & { webkitAudioContext?: typeof AudioContext };
      const Ctor = window.AudioContext ?? w.webkitAudioContext;
      if (!Ctor) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new Ctor();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.value = 0.05;
      o.start();
      o.stop(ctx.currentTime + 0.08);
    } catch {
      /* ignore */
    }
  }, []);

  const playNotifyBeepRef = useRef(playNotifyBeep);
  playNotifyBeepRef.current = playNotifyBeep;

  postUnreadSyncRef.current = (ticketId: string): void => {
    try {
      const payload: StorefrontSupportBroadcastPayload = { type: "unread_sync", ticketId };
      bcRef.current?.postMessage(payload);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(STOREFRONT_SUPPORT_BROADCAST);
    bcRef.current = bc;
    bc.onmessage = (ev: MessageEvent<StorefrontSupportBroadcastPayload>) => {
      const d = ev.data;
      if (!d || d.type !== "unread_sync" || typeof d.ticketId !== "string") return;
      if (!openRef.current) return;
      if (!tabVisibleRef.current) return;
      if (bcInboundDebounceRef.current) clearTimeout(bcInboundDebounceRef.current);
      bcInboundDebounceRef.current = setTimeout(() => {
        bcInboundDebounceRef.current = null;
        if (!openRef.current) return;
        if (!tabVisibleRef.current) return;
        refetchTicketsListRef.current({ silent: true });
      }, STOREFRONT_SUPPORT_BC_DEBOUNCE_MS);
    };
    return () => {
      if (bcInboundDebounceRef.current) {
        clearTimeout(bcInboundDebounceRef.current);
        bcInboundDebounceRef.current = null;
      }
      bc.onmessage = null;
      try {
        bc.close();
      } catch {
        /* ignore */
      }
      bcRef.current = null;
    };
  }, []);

  /** Flush seen khi đổi ticket / rời chi tiết. */
  useEffect(() => {
    const tid = selectedTicket?.id;
    const admin = isStaffAdminRef.current;
    return () => {
      if (!tid) return;
      flushSeenKeepalive(tid, admin);
    };
  }, [selectedTicket?.id]);

  /** Flush seen khi đóng panel (vẫn có thể đang mở một ticket). */
  useEffect(() => {
    if (open) return;
    const tid = selectedTicket?.id;
    if (!tid) return;
    flushSeenKeepalive(tid, isStaffAdminRef.current);
  }, [open, selectedTicket?.id]);

  const handleMessagesScroll = useCallback((): void => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    shouldAutoScrollRef.current = isNearBottom;
  }, []);

  const scrollChatToBottom = useCallback((behavior: ScrollBehavior = "auto"): void => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ block: "end", behavior });
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!canUseSupportTicketsApi) return;

    const ticketId = selectedTicket?.id;
    if (!ticketId) {
      previousFetchTicketIdRef.current = null;
      setMessages([]);
      setDetailTicket(null);
      setDetailError("");
      setDetailLoading(false);
      setInput("");
      setSendError("");
      return;
    }

    shouldAutoScrollRef.current = true;

    let cancelled = false;
    setDetailLoading(true);
    setDetailError("");
    setSendError("");

    const prevFetchId = previousFetchTicketIdRef.current;
    previousFetchTicketIdRef.current = ticketId;
    if (prevFetchId !== ticketId) {
      setMessages([]);
    }

    const base = isStaffAdminRef.current ? "/api/admin/support-tickets" : "/api/account/support-tickets";
    const tidEnc = encodeURIComponent(ticketId);

    void fetchWithAuth(`${base}/${tidEnc}/seen`, {
      method: "POST",
    }).catch(() => {});

    void fetchWithAuth(`${base}/${tidEnc}`)
      .then((res) => res.json() as Promise<{ ok?: boolean; ticket?: unknown; messages?: unknown[]; message?: string }>)
      .then((data) => {
        if (cancelled || selectedIdRef.current !== ticketId) return;
        if (!data.ok || !data.ticket || !Array.isArray(data.messages)) {
          if (selectedIdRef.current !== ticketId) return;
          setMessages([]);
          setDetailTicket(null);
          setDetailError(data.message ?? "Không tải được hội thoại.");
          return;
        }
        const dtBase = normalizeDetailTicket(data.ticket);
        const rawTick = data.ticket as Record<string, unknown>;
        const staffView = isStaffAdminRef.current;
        const dt =
          dtBase && staffView
            ? (() => {
                const au = rawTick.adminUnreadCount;
                const n =
                  typeof au === "number" && Number.isFinite(au)
                    ? Math.max(0, Math.floor(au))
                    : dtBase.customerUnreadCount;
                return { ...dtBase, customerUnreadCount: n };
              })()
            : dtBase;
        if (selectedIdRef.current !== ticketId) return;
        setDetailTicket(dt);
        const msgs = data.messages
          .map(normalizeMessage)
          .filter((m): m is ChatMessage => m !== null);
        const incoming = capChatMessages(msgs);
        setMessages((prev) => {
          if (selectedIdRef.current !== ticketId) return prev;
          if (prev.length === 0) return incoming;
          skipNextScrollFromFetchRef.current = true;
          const merged = mergeServerAndLocalMessages(incoming, prev);
          if (messagesListShallowEqual(prev, merged)) {
            skipNextScrollFromFetchRef.current = false;
            return prev;
          }
          return merged;
        });
        const unread = dt?.customerUnreadCount ?? 0;
        const sid = ticketId;
        setTickets((prev) =>
          prev.map((row) =>
            row.id === sid && dt
              ? {
                  ...row,
                  customerUnreadCount: unread,
                  status: dt.status,
                  priority: dt.priority,
                }
              : row.id === sid
                ? { ...row, customerUnreadCount: unread }
                : row,
          ),
        );
        setSelectedTicket((st) =>
          st && st.id === sid && dt
            ? { ...st, customerUnreadCount: unread, status: dt.status, priority: dt.priority }
            : st && st.id === sid
              ? { ...st, customerUnreadCount: unread }
              : st,
        );
      })
      .catch((e) => {
        if (cancelled) return;
        if (selectedIdRef.current !== ticketId) return;
        setMessages([]);
        setDetailTicket(null);
        setDetailError(
          e instanceof FetchUnauthorizedError ? e.message : "Không tải được hội thoại.",
        );
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, selectedTicket?.id, canUseSupportTicketsApi, detailRefreshKey]);

  const chatScrollSignal = useMemo(() => {
    if (messages.length === 0) return "0";
    const last = messages[messages.length - 1];
    return `${messages.length}:${last.id}`;
  }, [messages]);

  useEffect(() => {
    if (!open || !selectedTicket?.id || detailLoading) return;
    if (skipNextScrollFromFetchRef.current) {
      skipNextScrollFromFetchRef.current = false;
      return;
    }
    if (!shouldAutoScrollRef.current) return;
    scrollChatToBottom(isNarrow ? "auto" : "smooth");
  }, [chatScrollSignal, open, selectedTicket?.id, detailLoading, isNarrow, scrollChatToBottom]);

  useEffect(() => {
    if (!open || !selectedTicket?.id) return;
    if (typeof ResizeObserver === "undefined") return;
    let ro: ResizeObserver | null = null;
    const raf = requestAnimationFrame(() => {
      const el = composerResizeRef.current;
      if (!el) return;
      ro = new ResizeObserver(() => {
        if (shouldAutoScrollRef.current) scrollChatToBottom("auto");
      });
      ro.observe(el);
    });
    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
    };
  }, [open, selectedTicket?.id, scrollChatToBottom]);

  const pusherChannelIdsKey = useMemo(() => computePusherChannelIdsKey(tickets), [tickets]);

  const handledMessageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    handledMessageIdsRef.current.clear();
  }, [pusherChannelIdsKey]);

  useEffect(() => {
    if (!open || !canUseSupportTicketsApi) return;
    const ids = pusherChannelIdsKey ? pusherChannelIdsKey.split("|").filter(Boolean) : [];
    if (ids.length === 0) return;

    const key = process.env.NEXT_PUBLIC_PUSHER_KEY?.trim();
    if (!key) return;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.trim();
    if (!cluster || !hasPusherClientConfig()) return;

    let disposed = false;
    let pusher: InstanceType<typeof Pusher>;

    try {
      pusher = new Pusher(key, {
        cluster,
        forceTLS: true,
        authEndpoint: "/api/pusher/auth",
      });
    } catch {
      return;
    }

    const onNewMessage =
      (ticketId: string) =>
      (raw: unknown): void => {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
        const o = raw as Record<string, unknown>;
        const mid = typeof o.id === "string" ? o.id.trim() : "";
        if (!mid) return;

        const staff = isStaffAdminRef.current;
        const fromAdmin = o.fromAdmin === true;
        const viewing = selectedIdRef.current === ticketId;

        if (viewing && (staff ? !fromAdmin : fromAdmin)) {
          const base = staff ? "/api/admin/support-tickets" : "/api/account/support-tickets";
          void fetchWithAuth(`${base}/${encodeURIComponent(ticketId)}/seen`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          }).catch(() => {});
        }

        if (selectedIdRef.current === ticketId) {
          const msg = normalizeMessage(raw);
          if (msg) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              if (existingIds.has(msg.id)) return prev;
              const tempIdx = prev.findIndex(
                (m) =>
                  m.isTemp === true &&
                  m.isFailed !== true &&
                  m.fromAdmin === msg.fromAdmin &&
                  normalizeBodyKey(m.body) === normalizeBodyKey(msg.body) &&
                  Math.abs(Date.parse(msg.createdAt) - (m.clientCreatedAt ?? 0)) < 120_000,
              );
              if (tempIdx >= 0) {
                const next = [...prev];
                next[tempIdx] = {
                  id: msg.id,
                  body: msg.body,
                  fromAdmin: msg.fromAdmin,
                  createdAt: msg.createdAt,
                };
                const capped = capChatMessages(next);
                if (messagesListShallowEqual(prev, capped)) return prev;
                return capped;
              }
              const appended = capChatMessages([...prev, msg]);
              if (messagesListShallowEqual(prev, appended)) return prev;
              return appended;
            });
          }
        }

        const acRaw = o.adminUnreadCount;
        const ccRaw = o.customerUnreadCount;
        if (
          typeof acRaw === "number" &&
          Number.isFinite(acRaw) &&
          typeof ccRaw === "number" &&
          Number.isFinite(ccRaw)
        ) {
          const ac = Math.max(0, Math.floor(acRaw));
          const cc = Math.max(0, Math.floor(ccRaw));
          const n = staff ? ac : cc;
          const skipListBump = viewing && (staff ? !fromAdmin : fromAdmin);
          if (!skipListBump) {
            setTickets((prev) =>
              prev.map((item) => (item.id === ticketId ? { ...item, customerUnreadCount: n } : item)),
            );
          }
          postUnreadSyncRef.current(ticketId);
          const increasesForMe = staff ? !fromAdmin : fromAdmin;
          if (
            increasesForMe &&
            !viewing &&
            typeof document !== "undefined" &&
            document.visibilityState !== "visible"
          ) {
            playNotifyBeepRef.current();
          }
          return;
        }

        const increasesForMeLegacy = staff ? !fromAdmin : fromAdmin;
        if (!increasesForMeLegacy) return;
        if (handledMessageIdsRef.current.has(mid)) return;
        if (handledMessageIdsRef.current.size >= MAX_HANDLED_MESSAGE_IDS) {
          handledMessageIdsRef.current.clear();
        }
        handledMessageIdsRef.current.add(mid);

        setTickets((prev) =>
          prev.map((item) => {
            if (item.id !== ticketId) return item;
            return {
              ...item,
              customerUnreadCount: Math.max(0, (item.customerUnreadCount ?? 0) + 1),
            };
          }),
        );

        postUnreadSyncRef.current(ticketId);
        if (typeof document !== "undefined" && document.visibilityState !== "visible") {
          playNotifyBeepRef.current();
        }
      };

    const onSeenUpdate =
      (ticketId: string) =>
      (raw: unknown): void => {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
        const o = raw as Record<string, unknown>;
        const staff = isStaffAdminRef.current;
        const key = staff ? o.adminUnreadCount : o.customerUnreadCount;
        if (typeof key !== "number" || !Number.isFinite(key) || key < 0) return;
        const n = Math.floor(key);
        setTickets((prev) =>
          prev.map((item) => (item.id === ticketId ? { ...item, customerUnreadCount: n } : item)),
        );
        if (selectedIdRef.current === ticketId) {
          setDetailTicket((d) => (d && d.id === ticketId ? { ...d, customerUnreadCount: n } : d));
        }
        postUnreadSyncRef.current(ticketId);
      };

    const channelBindings: Array<{
      name: string;
      onNew: (raw: unknown) => void;
      onSeen: (raw: unknown) => void;
    }> = [];

    for (const tid of ids.slice(0, MAX_PUSHER_TICKET_CHANNELS)) {
      if (disposed) break;
      const name = supportTicketChatChannelName(tid);
      try {
        const ch = pusher.subscribe(name);
        const onNew = onNewMessage(tid);
        const onSeen = onSeenUpdate(tid);
        channelBindings.push({ name, onNew, onSeen });
        ch.bind("new-message", onNew);
        ch.bind("seen-update", onSeen);
      } catch {
        /* ignore */
      }
    }

    return () => {
      disposed = true;
      try {
        for (const { name, onNew, onSeen } of channelBindings) {
          const ch = pusher.channel(name);
          if (ch) {
            ch.unbind("new-message", onNew);
            ch.unbind("seen-update", onSeen);
          }
          pusher.unsubscribe(name);
        }
        pusher.disconnect();
      } catch {
        /* ignore */
      }
    };
  }, [open, pusherChannelIdsKey, canUseSupportTicketsApi]);

  const finalizeSendSuccess = useCallback(
    (
      tempId: string,
      body: string,
      messageId: string,
      sentAsAdmin: boolean,
      counts?: { adminUnreadCount: number; customerUnreadCount: number },
    ): void => {
      const merged: ChatMessage = {
        id: messageId,
        body,
        fromAdmin: sentAsAdmin,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => {
        const hasTemp = prev.some((m) => m.id === tempId);
        if (hasTemp) {
          const mapped = prev.map((m) => (m.id === tempId ? merged : m));
          return capChatMessages(mapped.filter((m, i, a) => a.findIndex((x) => x.id === m.id) === i));
        }
        if (prev.some((m) => m.id === messageId)) return prev;
        return capChatMessages([...prev, merged]);
      });
      if (counts) {
        const tid = selectedIdRef.current;
        if (!tid) return;
        const staff = isStaffAdminRef.current;
        const n = staff ? counts.adminUnreadCount : counts.customerUnreadCount;
        const safeN = Math.max(0, Math.floor(n));
        setTickets((prev) => prev.map((row) => (row.id === tid ? { ...row, customerUnreadCount: safeN } : row)));
        setDetailTicket((d) => (d && d.id === tid ? { ...d, customerUnreadCount: safeN } : d));
      }
    },
    [],
  );

  const finalizeSendFailure = useCallback((tempId: string, body: string, message: string): void => {
    setMessages((prev) => capChatMessages(prev.map((m) => (m.id === tempId ? { ...m, isFailed: true } : m))));
    setInput(body);
    setSendError(message);
  }, []);

  const applyAdminQuickReply = useCallback(
    (text: string): void => {
      const el = inputRef.current;
      const cur = input;
      if (!el) {
        setInput(cur ? `${cur.trimEnd()}\n${text}` : text);
        requestAnimationFrame(() => {
          syncComposerHeight();
        });
        return;
      }
      const start = el.selectionStart ?? cur.length;
      const end = el.selectionEnd ?? cur.length;
      const before = cur.slice(0, start);
      const after = cur.slice(end);
      const spacer = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
      const next = before + spacer + text + after;
      setInput(next);
      const caret = (before + spacer + text).length;
      requestAnimationFrame(() => {
        el.focus({ preventScroll: true });
        try {
          el.setSelectionRange(caret, caret);
        } catch {
          /* ignore */
        }
        syncComposerHeight();
      });
    },
    [input, syncComposerHeight],
  );

  const onAdminQuickReplyPick = useCallback(
    async (item: AdminQuickReplyItem): Promise<void> => {
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(ADMIN_QUICK_REPLY_STORAGE_KEY, item.id);
        }
      } catch {
        /* ignore */
      }
      setLastAdminQuickReplyId(item.id);

      if (item.sendImmediately === false) {
        applyAdminQuickReply(item.text);
        return;
      }

      if (!selectedTicket?.id || !isStaffAdmin || detailLoading || detailForSelected?.status === "CLOSED") {
        applyAdminQuickReply(item.text);
        return;
      }

      const id = selectedTicket.id;
      const body = item.text;
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const createdAtIso = new Date().toISOString();
      shouldAutoScrollRef.current = true;
      setMessages((prev) =>
        capChatMessages([
          ...prev,
          {
            id: tempId,
            body,
            fromAdmin: true,
            createdAt: createdAtIso,
            isTemp: true,
            clientCreatedAt: Date.now(),
            senderRole: "ADMIN",
          },
        ]),
      );
      setSendError("");
      setSending(true);
      try {
        const result = await postSupportMessage(id, body, true);
        if (!result.ok || !result.messageId) {
          finalizeSendFailure(tempId, body, result.message ?? "Không gửi được tin nhắn.");
          return;
        }
        const counts =
          result.adminUnreadCount !== undefined && result.customerUnreadCount !== undefined
            ? { adminUnreadCount: result.adminUnreadCount, customerUnreadCount: result.customerUnreadCount }
            : undefined;
        finalizeSendSuccess(tempId, body, result.messageId, true, counts);
        if (item.tag?.trim()) {
          const merged = mergeSupportTicketTags(detailForSelected?.tags ?? [], [item.tag.trim()]);
          await fetchWithAuth(`/api/admin/support-tickets/${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tags: merged }),
          }).catch(() => {});
        }
        setDetailRefreshKey((x) => x + 1);
        void refetchTicketsList({ silent: true });
      } catch {
        finalizeSendFailure(tempId, body, "Không gửi được tin nhắn.");
      } finally {
        setSending(false);
      }
    },
    [
      applyAdminQuickReply,
      detailForSelected?.status,
      detailForSelected?.tags,
      detailLoading,
      finalizeSendFailure,
      finalizeSendSuccess,
      isStaffAdmin,
      refetchTicketsList,
      selectedTicket?.id,
    ],
  );

  const handleSend = useCallback(async (): Promise<void> => {
    if (!selectedTicket?.id) return;
    const id = selectedTicket.id;
    const body = input.trim();
    if (!body) return;
    if (detailLoading) return;
    if (detailForSelected?.status === "CLOSED") return;

    const sentAsAdmin = isStaffAdmin;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const createdAtIso = new Date().toISOString();
    const clientCreatedAt = Date.now();

    shouldAutoScrollRef.current = true;
    setMessages((prev) =>
      capChatMessages([
        ...prev,
        {
          id: tempId,
          body,
          fromAdmin: sentAsAdmin,
          createdAt: createdAtIso,
          isTemp: true,
          clientCreatedAt,
          senderRole: sentAsAdmin
            ? "ADMIN"
            : selectedTicket?.participantKind === "affiliate"
              ? "AFFILIATE"
              : "CUSTOMER",
        },
      ]),
    );
    setInput("");
    setSendError("");
    setSending(true);

    try {
      const result = await postSupportMessage(id, body, sentAsAdmin);
      if (!result.ok || !result.messageId) {
        finalizeSendFailure(tempId, body, result.message ?? "Không gửi được tin nhắn.");
        return;
      }
      shouldAutoScrollRef.current = true;
      const counts =
        result.adminUnreadCount !== undefined && result.customerUnreadCount !== undefined
          ? { adminUnreadCount: result.adminUnreadCount, customerUnreadCount: result.customerUnreadCount }
          : undefined;
      finalizeSendSuccess(tempId, body, result.messageId, sentAsAdmin, counts);
    } catch {
      finalizeSendFailure(tempId, body, "Không gửi được tin nhắn.");
    } finally {
      setSending(false);
    }
  }, [
    detailForSelected?.status,
    detailLoading,
    finalizeSendFailure,
    finalizeSendSuccess,
    input,
    isStaffAdmin,
    selectedTicket,
  ]);

  const retryMessage = useCallback(
    async (msg: ChatMessage): Promise<void> => {
      if (!msg.isFailed || !selectedTicket?.id || detailLoading || detailForSelected?.status === "CLOSED") return;
      const body = msg.body;
      const oldId = msg.id;
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setSendError("");
      setMessages((prev) =>
        capChatMessages(
          prev.map((m) =>
            m.id === oldId
              ? {
                  ...m,
                  id: tempId,
                  isFailed: false,
                  isTemp: true,
                  clientCreatedAt: Date.now(),
                  createdAt: new Date().toISOString(),
                }
              : m,
          ),
        ),
      );
      shouldAutoScrollRef.current = true;
      setSending(true);
      try {
        const result = await postSupportMessage(selectedTicket.id, body, isStaffAdmin);
        if (!result.ok || !result.messageId) {
          finalizeSendFailure(tempId, body, result.message ?? "Không gửi được tin nhắn.");
          return;
        }
        const counts =
          result.adminUnreadCount !== undefined && result.customerUnreadCount !== undefined
            ? { adminUnreadCount: result.adminUnreadCount, customerUnreadCount: result.customerUnreadCount }
            : undefined;
        finalizeSendSuccess(tempId, body, result.messageId, isStaffAdmin, counts);
      } catch {
        finalizeSendFailure(tempId, body, "Không gửi được tin nhắn.");
      } finally {
        setSending(false);
      }
    },
    [
      detailForSelected?.status,
      detailLoading,
      finalizeSendFailure,
      finalizeSendSuccess,
      isStaffAdmin,
      selectedTicket,
    ],
  );

  const retryMessageRef = useRef(retryMessage);
  retryMessageRef.current = retryMessage;
  const retryMessageStable = useCallback((msg: ChatMessage): void => {
    void retryMessageRef.current(msg);
  }, []);

  const handlePickTicket = useCallback((t: SupportTicketListRow) => {
    setSelectedTicket(t);
    if (isNarrow) setMobileChatTab("chat");
  }, [isNarrow]);

  const handleExitChatSurface = useCallback(() => {
    if (isNarrow) setMobileChatTab("list");
    else setSelectedTicket(null);
  }, [isNarrow]);

  useEffect(() => {
    if (!open) customerBootstrapOnceKeyRef.current = "";
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent): void {
      const target = e.target as HTMLElement;

      if (target.closest("[data-support-panel-trigger]")) return;
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent): void {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !selectedTicket?.id) return;
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [open, selectedTicket?.id]);

  useLayoutEffect(() => {
    if (!open || !selectedTicket?.id) return;
    syncComposerHeight();
  }, [input, open, selectedTicket?.id, syncComposerHeight]);

  const listSection = (
    <>
      {isStaffAdmin ? (
        <div className="shrink-0 border-b border-gray-100 px-2.5 py-2">
          <label
            htmlFor="support-admin-ticket-filter"
            className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
          >
            Lọc ticket
          </label>
          <select
            id="support-admin-ticket-filter"
            value={adminListFilter}
            onChange={(e) => {
              const v = e.target.value as AdminSupportTicketListFilter;
              adminListFilterRef.current = v;
              setAdminListFilter(v);
              void refetchTicketsList({ silent: false });
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
          >
            <option value="all">Tất cả (khách + CTV)</option>
            <option value="unread">Chưa đọc (phía admin)</option>
            <option value="open">Trạng thái: Mở</option>
            <option value="pending">Trạng thái: Chờ admin (alias)</option>
            <option value="waiting_admin">Trạng thái: Chờ admin</option>
            <option value="waiting_user">Trạng thái: Chờ khách</option>
            <option value="answered">Trạng thái: Đã trả lời</option>
            <option value="resolved">Trạng thái: Đã xử lý</option>
            <option value="closed">Trạng thái: Đã đóng</option>
            <option value="customer">Khách hàng</option>
            <option value="affiliate">CTV</option>
          </select>
          <label
            htmlFor="support-admin-ticket-tag-filter"
            className="mb-1 mt-2 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
          >
            Lọc theo tag
          </label>
          <select
            id="support-admin-ticket-tag-filter"
            value={adminTagFilter}
            onChange={(e) => {
              const v = e.target.value;
              adminTagFilterRef.current = v;
              setAdminTagFilter(v);
              void refetchTicketsList({ silent: false });
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
          >
            <option value="">Tất cả tag</option>
            <option value="support">support</option>
            <option value="payment">payment</option>
            <option value="bug">bug</option>
            <option value="affiliate">affiliate</option>
          </select>
        </div>
      ) : null}
      {loading ? <div className="p-3 text-sm text-gray-500">Đang tải…</div> : null}

      {!loading && listError ? (
        <div className="p-3 text-sm text-red-600" role="alert">
          <p>Không tải được danh sách. Thử lại.</p>
          <p className="mt-1 text-xs text-gray-600">{listError}</p>
          <button
            type="button"
            className="mt-2 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50"
            onClick={() => void refetchTicketsList({ silent: false })}
          >
            Thử lại
          </button>
        </div>
      ) : null}

      {!loading && !listError && sortedTickets.length === 0 && hasLoadedOnce ? (
        <div className="p-3 text-sm text-gray-500">Chưa có ticket</div>
      ) : null}

      {!loading && !listError && sortedTickets.length > 0
        ? sortedTickets.map((t) => {
            const n = t.customerUnreadCount > 0 ? t.customerUnreadCount : 0;
            const aff =
              t.participantKind === "affiliate" ||
              (t.participantKind !== "customer" && isAffiliateTicketType(t.type));
            const unreadBg = t.customerUnreadCount > 0 ? "bg-blue-50" : "";
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handlePickTicket(t)}
                className={`flex w-full min-w-0 cursor-pointer flex-col border-b border-gray-100 px-2.5 py-2 text-left transition hover:bg-gray-50 ${unreadBg}`}
              >
                <div className="line-clamp-2 min-w-0 break-words text-sm font-medium leading-snug text-gray-900">
                  {t.subject.trim() || "Liên hệ hỗ trợ"}
                </div>
                <div className="mt-0.5 flex min-w-0 items-center gap-1">
                  <TicketStatusBadge status={t.status} />
                </div>

                {n > 0 ? (
                  <div className="mt-1 flex min-w-0 flex-wrap gap-2 text-xs text-gray-700">
                    {aff ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 font-medium text-violet-950 ring-1 ring-violet-200/80">
                        <span aria-hidden>🤝</span>
                        <span>CTV</span>
                        <span className="tabular-nums">{formatSupportUnreadBadge(n)}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-100 px-1.5 py-0.5 font-medium text-sky-950 ring-1 ring-sky-200/80">
                        <span aria-hidden>👤</span>
                        <span>Khách hàng</span>
                        <span className="tabular-nums">{formatSupportUnreadBadge(n)}</span>
                      </span>
                    )}
                  </div>
                ) : null}
              </button>
            );
          })
        : null}
    </>
  );

  const chatSection =
    selectedTicket ? (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f4f6f8]">
        <div className="flex shrink-0 flex-col border-b border-slate-200/90 bg-white">
          <div className="flex items-center gap-2 px-3 py-2 sm:py-2.5">
            <button
              type="button"
              onClick={handleExitChatSurface}
              className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 sm:hidden"
              aria-label="Quay lại danh sách ticket"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setSelectedTicket(null)}
              className="hidden h-9 min-w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 sm:inline-flex"
              aria-label="Quay lại danh sách"
            >
              ←
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-900">
                {detailForSelected?.subject?.trim() || selectedTicket.subject.trim() || "Chat hỗ trợ"}
              </div>
              <div className="mt-0.5 flex max-w-full flex-nowrap items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
                <TicketStatusBadge status={detailForSelected?.status ?? selectedTicket.status} />
                <PriorityBadge priority={detailForSelected?.priority ?? selectedTicket.priority ?? "MEDIUM"} />
                {detailForSelected?.assignedAdmin ? (
                  <span
                    className="max-w-[38%] truncate text-[10px] font-medium text-slate-600 sm:max-w-[12rem]"
                    title={detailForSelected.assignedAdmin.email}
                  >
                    {detailForSelected.assignedAdmin.fullName.trim() || detailForSelected.assignedAdmin.email}
                  </span>
                ) : null}
                {!detailForSelected && !detailLoading ? (
                  <span className="text-[10px] text-slate-500 sm:text-xs">Zendo.vn</span>
                ) : null}
              </div>
            </div>
          </div>
          {detailForSelected && detailForSelected.tags.length > 0 && !detailLoading && !detailError ? (
            <div className="flex max-w-full flex-nowrap gap-1 overflow-x-auto border-t border-slate-100 px-3 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:py-1.5 [&::-webkit-scrollbar]:hidden">
              {detailForSelected.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex max-w-[10rem] shrink-0 truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 ring-1 ring-slate-200/80"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {detailLoading ? (
          <div className="p-3 text-sm text-slate-500">Đang tải tin nhắn…</div>
        ) : null}
        {detailError ? (
          <div className="p-3 text-sm text-red-600" role="alert">
            <p>Không tải được hội thoại. Thử lại sau hoặc quay lại danh sách.</p>
            <p className="mt-1 text-xs text-slate-600">{detailError}</p>
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            ref={messagesScrollRef}
            onScroll={handleMessagesScroll}
            className="flex min-h-0 flex-1 touch-pan-y flex-col gap-3 overflow-y-auto overscroll-y-contain p-3"
          >
            {!detailLoading && !detailError && messages.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">Chưa có tin nhắn</div>
            ) : null}
            <SupportChatMessagesList
              messages={messages}
              ticketClosed={detailForSelected?.status === "CLOSED"}
              sending={sending}
              detailLoading={detailLoading}
              onRetry={retryMessageStable}
            />
            <div ref={bottomRef} className="h-px w-full shrink-0 scroll-mt-2" aria-hidden />
          </div>

          <div ref={composerResizeRef} className="shrink-0 border-t border-slate-200 bg-white p-3">
            {detailForSelected?.status === "CLOSED" ? (
              <p className="text-center text-xs text-slate-500">Ticket đã đóng — không thể gửi thêm.</p>
            ) : (
              <>
                <div className="flex min-w-0 items-end gap-2">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="min-h-11 max-h-48 min-w-0 flex-1 resize-none overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm leading-snug text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0084ff] focus:bg-white focus:ring-1 focus:ring-[#0084ff]/30"
                    placeholder="Nhập tin nhắn…"
                    aria-label="Nội dung tin nhắn"
                    disabled={sending || detailLoading}
                    onFocus={() => {
                      shouldAutoScrollRef.current = true;
                      scrollChatToBottom("auto");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={sending || !input.trim()}
                    onClick={() => void handleSend()}
                    className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-[#0084ff] text-sm font-semibold text-white shadow-sm transition hover:bg-[#0073e6] disabled:opacity-45"
                    aria-label="Gửi tin nhắn"
                  >
                    {sending ? "…" : "➤"}
                  </button>
                </div>
                {!isStaffAdmin ? (
                  <div
                    className="mt-2 flex max-w-full gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    role="group"
                    aria-label="Câu hỏi gợi ý"
                  >
                    {storefrontQuickQuestions.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        disabled={sending || detailLoading}
                        title={q.text}
                        onClick={() => applyAdminQuickReply(q.text)}
                        className="shrink-0 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-900 transition hover:border-sky-400 hover:bg-white disabled:opacity-45"
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div
                    className="mt-2 flex max-w-full gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    role="group"
                    aria-label="Trả lời nhanh"
                  >
                    {sortedAdminQuickReplyItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        disabled={sending || detailLoading}
                        title={item.title}
                        onClick={() => void onAdminQuickReplyPick(item)}
                        className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-sky-300 hover:bg-white hover:text-slate-900 disabled:opacity-45"
                      >
                        {item.shortLabel}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            {sendError ? <p className="mt-2 text-center text-xs text-rose-600">{sendError}</p> : null}
          </div>
        </div>
      </div>
    ) : null;

  if (!open) return null;

  if (disabledOnAdminRoute) return null;

  if (globalOverlayBlocks) return null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal={true}
      aria-hidden={false}
      aria-labelledby="storefront-support-panel-title"
      style={{ pointerEvents: "auto" }}
      className="support-popup-animate fixed z-[9999] flex flex-col overflow-hidden overscroll-y-contain bg-white shadow-none inset-0 h-[100dvh] max-h-[100dvh] w-full min-w-0 rounded-none border-0 pt-[env(safe-area-inset-top)] pb-0 sm:inset-auto sm:bottom-4 sm:right-4 sm:top-auto sm:left-auto sm:h-[min(640px,calc(100dvh-2rem))] sm:max-h-[min(680px,calc(100dvh-1.5rem))] sm:min-h-[480px] sm:w-[min(720px,calc(100vw-2rem))] sm:min-w-0 sm:rounded-2xl sm:border sm:border-slate-200/90 sm:pt-0 sm:pb-0 sm:shadow-xl"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 sm:py-3">
        <span className="text-base font-semibold text-slate-900" id="storefront-support-panel-title">
          Hỗ trợ
        </span>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 min-w-9 items-center justify-center rounded-full text-xl leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          aria-label="Đóng chat hỗ trợ"
        >
          ×
        </button>
      </div>

      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        style={
          isNarrow
            ? {
                paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${keyboardInsetPx}px)`,
              }
            : undefined
        }
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden sm:flex-row">
          <div
            className={
              isNarrow
                ? mobileChatTab === "list"
                  ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain"
                  : "hidden"
                : selectedTicket
                  ? "hidden min-h-0 shrink-0 flex-col overflow-y-auto overscroll-contain border-gray-200 sm:flex sm:w-36 sm:border-r md:w-40"
                  : "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain"
            }
          >
            {listSection}
          </div>
          {selectedTicket && (!isNarrow || mobileChatTab === "chat") ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{chatSection}</div>
          ) : null}
        </div>
        {isNarrow ? (
          <div className="flex shrink-0 border-t border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setMobileChatTab("list")}
              className={`min-h-12 flex-1 text-xs font-semibold transition ${mobileChatTab === "list" ? "text-[#0084ff]" : "text-slate-500"}`}
            >
              Ticket
            </button>
            <button
              type="button"
              disabled={!selectedTicket}
              onClick={() => setMobileChatTab("chat")}
              className={`min-h-12 flex-1 text-xs font-semibold transition disabled:opacity-40 ${mobileChatTab === "chat" ? "text-[#0084ff]" : "text-slate-500"}`}
            >
              Trò chuyện
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
