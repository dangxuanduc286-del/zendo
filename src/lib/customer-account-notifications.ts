import { Prisma } from "@prisma/client";
import type { CustomerAccountNotificationCategory } from "@prisma/client";
import { db } from "@/lib/db";

const CTRL_EXCEPT_TAB = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/** Safe snippet for in-app notification (no HTML). */
export function sanitizeCustomerNotificationText(value: string, maxLen: number): string {
  const collapsed = (value || "")
    .replace(CTRL_EXCEPT_TAB, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!collapsed) return "";
  return collapsed.length > maxLen ? `${collapsed.slice(0, maxLen - 1)}…` : collapsed;
}

function sanitizeActionHref(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  if (!s.startsWith("/") || s.startsWith("//")) return null;
  if (s.length > 512) return null;
  return s;
}

export type CreateCustomerAccountNotificationInput = {
  customerId: string;
  category: CustomerAccountNotificationCategory;
  dedupeKey: string;
  title: string;
  body: string;
  actionHref?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Idempotent per (customerId, dedupeKey). Never throws to callers of payout flows.
 */
export async function createCustomerAccountNotificationSafe(input: CreateCustomerAccountNotificationInput): Promise<void> {
  const customerId = (input.customerId || "").trim();
  if (!customerId) return;

  const dedupeKey = (input.dedupeKey || "").trim().slice(0, 180);
  if (!dedupeKey) return;

  const title = (input.title || "").trim().slice(0, 240);
  const body = (input.body || "").trim().slice(0, 8000);
  if (!title || !body) return;

  const actionHref = sanitizeActionHref(input.actionHref ?? null);
  try {
    await db.customerAccountNotification.create({
      data: {
        customerId,
        category: input.category,
        dedupeKey,
        title,
        body,
        actionHref,
        ...(input.metadata != null ? { metadata: input.metadata as Prisma.InputJsonValue } : {}),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return;
    }
  }
}

export function publishCustomerAccountNotification(input: CreateCustomerAccountNotificationInput): void {
  void createCustomerAccountNotificationSafe(input);
}
