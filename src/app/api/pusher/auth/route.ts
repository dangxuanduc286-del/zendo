import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { isAdminSupportTicketRole } from "../../../../lib/admin-support-ticket-roles";
import { ticketIdFromSupportTicketChatChannel } from "../../../../lib/support-ticket-chat-channel";
import { getPusherServer } from "../../../../lib/support-ticket-pusher";

async function readSocketAndChannel(req: NextRequest): Promise<{ socketId: string; channelName: string } | null> {
  try {
    const raw = (await req.text()).trim();
    if (!raw) return null;
    if (raw.startsWith("{")) {
      const body = JSON.parse(raw) as Record<string, unknown>;
      const socketId = typeof body.socket_id === "string" ? body.socket_id.trim() : "";
      const channelName = typeof body.channel_name === "string" ? body.channel_name.trim() : "";
      if (!socketId || !channelName) return null;
      return { socketId, channelName };
    }
    const params = new URLSearchParams(raw);
    const socketId = (params.get("socket_id") ?? "").trim();
    const channelName = (params.get("channel_name") ?? "").trim();
    if (!socketId || !channelName) return null;
    return { socketId, channelName };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const pusher = getPusherServer();
  if (!pusher) {
    return NextResponse.json({ message: "Pusher chưa cấu hình." }, { status: 503 });
  }

  const parsed = await readSocketAndChannel(req);
  if (!parsed) {
    return NextResponse.json({ message: "Thiếu socket_id hoặc channel_name." }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  const isAdmin = isAdminSupportTicketRole(role);
  if (role !== "USER" && !isAdmin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const ticketId = ticketIdFromSupportTicketChatChannel(parsed.channelName);
  if (!ticketId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
  }

  const { db } = await import("../../../../lib/db");
  const ticket = await db.supportTicket.findFirst({
    where: { id: ticketId },
    select: { id: true, customerId: true },
  });
  if (!ticket) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const isOwner = ticket.customerId === session.user.id;
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const auth = pusher.authorizeChannel(parsed.socketId, parsed.channelName);
  return NextResponse.json(auth);
}
