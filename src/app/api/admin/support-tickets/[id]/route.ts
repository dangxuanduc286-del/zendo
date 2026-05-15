import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { listAllSupportTicketMessagesForTicketId } from "../../../../../lib/account-support-tickets";
import {
  getAdminSupportTicketUnreadTotalDb,
  isAdminSupportTicketRole,
  parseSupportTicketBlockReason,
  parseSupportTicketPriority,
  parseSupportTicketStatus,
  parseSupportTicketTags,
} from "../../../../../lib/admin-support-tickets";
import { supportTicketNotArchivedWhere } from "../../../../../lib/support-ticket-archive";
import {
  adminSupportTicketDetailSelect,
  serializeAdminSupportTicketDetail,
} from "../../../../../lib/support-ticket-api-serializers";
import { serializeSupportTicketMessageForApi } from "../../../../../lib/support-ticket-message-serialize";
import {
  triggerSupportAdminInboxTicketArchived,
  triggerSupportAdminInboxTicketBlockUpdated,
  triggerSupportAdminInboxTicketRestored,
  triggerSupportTicketTicketArchived,
  triggerSupportTicketTicketBlockState,
  triggerSupportTicketTicketRestored,
} from "../../../../../lib/support-ticket-pusher";

type ParamsInput = Promise<{ id: string }>;

export async function GET(
  _request: Request,
  { params }: { params: ParamsInput },
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isAdminSupportTicketRole(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
    }

    const { id } = await Promise.resolve(params);
    if (!id?.trim()) {
      return NextResponse.json({ message: "Thiếu mã ticket." }, { status: 400 });
    }

    const { db } = await import("../../../../../lib/db");

    const ticket = await db.supportTicket.findFirst({
      where: { id: id.trim(), ...supportTicketNotArchivedWhere },
      select: adminSupportTicketDetailSelect,
    });

    if (!ticket) {
      return NextResponse.json({ message: "Không tìm thấy ticket." }, { status: 404 });
    }

    const messages = await listAllSupportTicketMessagesForTicketId(ticket.id);

    const messagePayload = messages.map((m) => serializeSupportTicketMessageForApi(m));

    return NextResponse.json({
      ok: true,
      ticket: serializeAdminSupportTicketDetail(ticket),
      messages: messagePayload,
    });
  } catch {
    return NextResponse.json({ message: "Không tải được chi tiết ticket." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: ParamsInput },
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !isAdminSupportTicketRole(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
    }

    const { id } = await Promise.resolve(params);
    if (!id?.trim()) {
      return NextResponse.json({ message: "Thiếu mã ticket." }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Dữ liệu không hợp lệ." }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ message: "Dữ liệu không hợp lệ." }, { status: 400 });
    }
    const rec = body as Record<string, unknown>;

    const hasStatus = Object.prototype.hasOwnProperty.call(rec, "status");
    const hasPriority = Object.prototype.hasOwnProperty.call(rec, "priority");
    const hasAssigned = Object.prototype.hasOwnProperty.call(rec, "assignedAdminId");
    const hasTags = Object.prototype.hasOwnProperty.call(rec, "tags");
    const hasArchived = Object.prototype.hasOwnProperty.call(rec, "archived");
    const hasDeleted = Object.prototype.hasOwnProperty.call(rec, "deleted");
    const hasBlocked = Object.prototype.hasOwnProperty.call(rec, "blocked");

    const wantsArchive =
      (hasArchived && rec.archived === true) || (hasDeleted && rec.deleted === true);
    const wantsRestore =
      (hasArchived && rec.archived === false) || (hasDeleted && rec.deleted === false);
    if (wantsArchive && wantsRestore) {
      return NextResponse.json({ message: "Không thể vừa lưu trữ vừa khôi phục trong một yêu cầu." }, { status: 400 });
    }

    const wantsBlock = hasBlocked && rec.blocked === true;
    const wantsUnblock = hasBlocked && rec.blocked === false;
    if (wantsBlock && wantsUnblock) {
      return NextResponse.json({ message: "blocked không hợp lệ." }, { status: 400 });
    }
    if (wantsArchive && wantsBlock) {
      return NextResponse.json(
        { message: "Không thể vừa lưu trữ / xóa chat vừa chặn trong một yêu cầu." },
        { status: 400 },
      );
    }

    if (!hasStatus && !hasPriority && !hasAssigned && !hasTags && !hasArchived && !hasDeleted && !hasBlocked) {
      return NextResponse.json(
        {
          message:
            "Thiếu trường cập nhật (status, priority, assignedAdminId, tags, archived, deleted, blocked).",
        },
        { status: 400 },
      );
    }

    const { db } = await import("../../../../../lib/db");
    const tid = id.trim();

    const found = await db.supportTicket.findUnique({
      where: { id: tid },
      select: { id: true, deletedAt: true },
    });
    if (!found) {
      return NextResponse.json({ message: "Không tìm thấy ticket." }, { status: 404 });
    }

    const isArchivedRow = Boolean(found.deletedAt);

    if (isArchivedRow) {
      const restoring = wantsRestore;
      const idempotentArchive = wantsArchive;
      if (idempotentArchive) {
        const ticketRow = await db.supportTicket.findUnique({
          where: { id: tid },
          select: adminSupportTicketDetailSelect,
        });
        if (!ticketRow) {
          return NextResponse.json({ message: "Không tìm thấy ticket." }, { status: 404 });
        }
        return NextResponse.json({
          ok: true,
          ticket: serializeAdminSupportTicketDetail(ticketRow),
        });
      }
      if (!restoring) {
        if (wantsBlock || wantsUnblock) {
          // cho phép chặn / bỏ chặn khi ticket đang ẩn khỏi danh sách admin
        } else {
          return NextResponse.json({ message: "Ticket đã được lưu trữ." }, { status: 404 });
        }
      }
    }

    const data: Prisma.SupportTicketUncheckedUpdateInput = {};

    const allowFieldPatches = !isArchivedRow || (isArchivedRow && wantsRestore);

    if (allowFieldPatches) {
      if (hasStatus) {
        const status = parseSupportTicketStatus(rec.status);
        if (!status) {
          return NextResponse.json({ message: "Trạng thái không hợp lệ." }, { status: 400 });
        }
        data.status = status;
      }

      if (hasPriority) {
        const priority = parseSupportTicketPriority(rec.priority);
        if (!priority) {
          return NextResponse.json(
            { message: "Mức ưu tiên không hợp lệ (LOW | MEDIUM | HIGH)." },
            { status: 400 },
          );
        }
        data.priority = priority;
      }

      if (hasAssigned) {
        const v = rec.assignedAdminId;
        if (v === null || v === "") {
          data.assignedAdminId = null;
        } else if (typeof v === "string") {
          const aid = v.trim();
          if (!aid) {
            data.assignedAdminId = null;
          } else {
            const adm = await db.admin.findUnique({ where: { id: aid }, select: { id: true } });
            if (!adm) {
              return NextResponse.json({ message: "Không tìm thấy admin được gán." }, { status: 400 });
            }
            data.assignedAdminId = aid;
          }
        } else {
          return NextResponse.json({ message: "assignedAdminId không hợp lệ." }, { status: 400 });
        }
      }

      if (hasTags) {
        const parsed = parseSupportTicketTags(rec.tags);
        if (parsed.ok === false) {
          return NextResponse.json({ message: parsed.message }, { status: 400 });
        }
        data.tags = parsed.tags;
      }
    }

    if (wantsArchive) {
      data.deletedAt = new Date();
      data.deletedByAdminId = session.user.id;
      data.status = "CLOSED";
    } else if (wantsRestore) {
      data.deletedAt = null;
      data.deletedByAdminId = null;
    }

    if (wantsBlock) {
      data.blockedAt = new Date();
      data.blockedByAdminId = session.user.id;
      data.blockReason = parseSupportTicketBlockReason(rec.blockReason);
    } else if (wantsUnblock) {
      data.blockedAt = null;
      data.blockedByAdminId = null;
      data.blockReason = null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ message: "Không có thay đổi hợp lệ." }, { status: 400 });
    }

    await db.supportTicket.update({
      where: { id: tid },
      data,
    });

    const ticket = await db.supportTicket.findUnique({
      where: { id: tid },
      select: adminSupportTicketDetailSelect,
    });
    if (!ticket) {
      return NextResponse.json({ message: "Không tìm thấy ticket." }, { status: 404 });
    }

    if (wantsArchive || wantsRestore) {
      const totalAdminUnread = await getAdminSupportTicketUnreadTotalDb();
      const inboxPayload = { totalAdminUnread, ticketId: tid };
      if (wantsArchive) {
        triggerSupportTicketTicketArchived(tid);
        triggerSupportAdminInboxTicketArchived(inboxPayload);
      } else {
        triggerSupportTicketTicketRestored(tid);
        triggerSupportAdminInboxTicketRestored(inboxPayload);
      }
    }

    if (wantsBlock || wantsUnblock) {
      const totalAdminUnread = await getAdminSupportTicketUnreadTotalDb();
      triggerSupportTicketTicketBlockState(tid, {
        blocked: Boolean(ticket.blockedAt),
        blockedAt: ticket.blockedAt ? ticket.blockedAt.toISOString() : null,
        blockReason: ticket.blockReason,
      });
      triggerSupportAdminInboxTicketBlockUpdated({ totalAdminUnread, ticketId: tid });
    }

    return NextResponse.json({
      ok: true,
      ticket: serializeAdminSupportTicketDetail(ticket),
    });
  } catch {
    return NextResponse.json({ message: "Không cập nhật được ticket." }, { status: 500 });
  }
}
