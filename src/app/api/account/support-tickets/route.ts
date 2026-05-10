import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import {
  clampTicketBody,
  clampTicketSubject,
  createSupportTicketForCustomer,
  listSupportTicketsForCustomer,
  parseSupportTicketType,
} from "../../../../lib/account-support-tickets";
import { serializeCustomerSupportTicketApi } from "../../../../lib/support-ticket-api-serializers";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "USER") {
      return NextResponse.json({ ok: false, tickets: [], error: "UNAUTHENTICATED" }, { status: 401 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ ok: false, tickets: [], error: "SERVICE_UNAVAILABLE" }, { status: 503 });
    }

    const tickets = await listSupportTicketsForCustomer(session.user.id);
    const serialized = tickets.map((t) => serializeCustomerSupportTicketApi(t));
    return NextResponse.json({
      ok: true,
      tickets: serialized,
    });
  } catch (error) {
    const e = error as { name?: unknown; code?: unknown; message?: unknown } | null;
    const name = typeof e?.name === "string" ? e.name : null;
    const code = typeof e?.code === "string" ? e.code : null;
    const message = typeof e?.message === "string" ? e.message : "Không tải được danh sách ticket.";
    console.error("GET SUPPORT TICKETS ERROR:", { name, code, message });
    return NextResponse.json({ ok: false, tickets: [], error: message }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "USER") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ message: "Service unavailable" }, { status: 503 });
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

    const subject = clampTicketSubject(rec.subject);
    if (!subject) {
      return NextResponse.json({ message: "Tiêu đề không được để trống." }, { status: 400 });
    }
    const textBody = clampTicketBody(rec.body);
    if (!textBody) {
      return NextResponse.json({ message: "Nội dung tin nhắn không được để trống." }, { status: 400 });
    }
    const type = parseSupportTicketType(rec.type);
    if (!type) {
      return NextResponse.json({ message: "Loại ticket không hợp lệ." }, { status: 400 });
    }

    const orderId = typeof rec.orderId === "string" ? rec.orderId : null;
    const affiliateApplicationId =
      typeof rec.affiliateApplicationId === "string" ? rec.affiliateApplicationId : null;

    try {
      const created = await createSupportTicketForCustomer(session.user.id, {
        subject,
        type,
        body: textBody,
        orderId,
        affiliateApplicationId,
      });
      return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (code === "ORDER_INVALID" || code === "APPLICATION_INVALID") {
        return NextResponse.json({ message: "Đơn hàng hoặc yêu cầu CTV không thuộc tài khoản của bạn." }, { status: 400 });
      }
      throw e;
    }
  } catch {
    return NextResponse.json({ message: "Không tạo được ticket." }, { status: 500 });
  }
}
