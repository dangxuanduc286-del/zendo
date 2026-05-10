import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { listAllSupportTicketMessagesForTicketId } from "../../../../../lib/account-support-tickets";
import {
  isAdminSupportTicketRole,
  parseSupportTicketPriority,
  parseSupportTicketStatus,
  parseSupportTicketTags,
} from "../../../../../lib/admin-support-tickets";
import {
  adminSupportTicketDetailSelect,
  serializeAdminSupportTicketDetail,
} from "../../../../../lib/support-ticket-api-serializers";

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

    const ticket = await db.supportTicket.findUnique({
      where: { id: id.trim() },
      select: adminSupportTicketDetailSelect,
    });

    if (!ticket) {
      return NextResponse.json({ message: "Không tìm thấy ticket." }, { status: 404 });
    }

    const messages = await listAllSupportTicketMessagesForTicketId(ticket.id);

    const messagePayload = messages.map((m) => ({
      id: m.id,
      body: m.body,
      senderRole: m.senderRole,
      fromAdmin: Boolean(m.senderAdminId),
      createdAt: m.createdAt.toISOString(),
      seenBy: m.seenBy,
    }));

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

    if (!hasStatus && !hasPriority && !hasAssigned && !hasTags) {
      return NextResponse.json(
        { message: "Thiếu trường cập nhật (status, priority, assignedAdminId, tags)." },
        { status: 400 },
      );
    }

    const data: Prisma.SupportTicketUncheckedUpdateInput = {};

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
        return NextResponse.json({ message: "Mức ưu tiên không hợp lệ (LOW | MEDIUM | HIGH)." }, { status: 400 });
      }
      data.priority = priority;
    }

    const { db } = await import("../../../../../lib/db");
    const tid = id.trim();

    const found = await db.supportTicket.findUnique({
      where: { id: tid },
      select: { id: true },
    });
    if (!found) {
      return NextResponse.json({ message: "Không tìm thấy ticket." }, { status: 404 });
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

    return NextResponse.json({
      ok: true,
      ticket: serializeAdminSupportTicketDetail(ticket),
    });
  } catch {
    return NextResponse.json({ message: "Không cập nhật được ticket." }, { status: 500 });
  }
}
