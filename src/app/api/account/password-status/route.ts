import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("../../../../lib/db");
    return dbModule.db;
  } catch {
    return null;
  }
}

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const db = await getDbClient();
  if (!db) return NextResponse.json({ hasPassword: true, oauthOnly: false });

  if (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN" || session.user.role === "CONTENT_MANAGER") {
    return NextResponse.json({ hasPassword: true, oauthOnly: false });
  }

  const customer = await db.customer.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  const hasPassword = Boolean(customer?.passwordHash);
  return NextResponse.json({ hasPassword, oauthOnly: !hasPassword });
}
