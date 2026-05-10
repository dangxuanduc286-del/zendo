import type { Prisma } from "@prisma/client";

/** Admin: chi tiết ticket (GET/PATCH + đồng bộ list nếu cần shape tương thích). */
export const adminSupportTicketDetailSelect = {
  id: true,
  subject: true,
  type: true,
  status: true,
  priority: true,
  tags: true,
  assignedAdminId: true,
  assignedAdmin: {
    select: { id: true, fullName: true, email: true },
  },
  orderId: true,
  affiliateApplicationId: true,
  lastMessageAt: true,
  adminUnreadCount: true,
  customerUnreadCount: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      createdAt: true,
      affiliateProfiles: {
        where: { status: "ACTIVE" as const },
        select: { id: true, refCode: true, status: true },
        take: 1,
      },
    },
  },
  order: {
    select: {
      id: true,
      code: true,
      orderStatus: true,
      paymentStatus: true,
      totalAmount: true,
      createdAt: true,
    },
  },
  affiliateApplication: {
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      status: true,
      note: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.SupportTicketSelect;

export type AdminSupportTicketDetailPayload = Prisma.SupportTicketGetPayload<{
  select: typeof adminSupportTicketDetailSelect;
}>;

export function serializeAdminSupportTicketDetail(ticket: AdminSupportTicketDetailPayload): Record<string, unknown> {
  const { customer, order, affiliateApplication, assignedAdmin, ...rest } = ticket;
  const isAffiliate = (customer.affiliateProfiles?.length ?? 0) > 0;
  const cust = {
    id: customer.id,
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
    createdAt: customer.createdAt.toISOString(),
  };

  let orderPayload: {
    id: string;
    code: string;
    orderStatus: string;
    paymentStatus: string;
    totalAmount: string;
    createdAt: string;
  } | null = null;
  if (order) {
    orderPayload = {
      id: order.id,
      code: order.code,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount.toString(),
      createdAt: order.createdAt.toISOString(),
    };
  }

  const appPayload = affiliateApplication
    ? {
        id: affiliateApplication.id,
        fullName: affiliateApplication.fullName,
        phone: affiliateApplication.phone,
        email: affiliateApplication.email,
        status: affiliateApplication.status,
        note: affiliateApplication.note,
        createdAt: affiliateApplication.createdAt.toISOString(),
        updatedAt: affiliateApplication.updatedAt.toISOString(),
      }
    : null;

  return {
    id: rest.id,
    subject: rest.subject,
    type: rest.type,
    status: rest.status,
    priority: rest.priority,
    tags: rest.tags,
    assignedAdminId: rest.assignedAdminId,
    assignedAdmin: assignedAdmin
      ? { id: assignedAdmin.id, fullName: assignedAdmin.fullName, email: assignedAdmin.email }
      : null,
    orderId: rest.orderId,
    affiliateApplicationId: rest.affiliateApplicationId,
    lastMessageAt: rest.lastMessageAt.toISOString(),
    createdAt: rest.createdAt.toISOString(),
    updatedAt: rest.updatedAt.toISOString(),
    adminUnreadCount: rest.adminUnreadCount,
    customerUnreadCount: rest.customerUnreadCount,
    unreadCount: rest.adminUnreadCount,
    participantKind: isAffiliate ? "affiliate" : "customer",
    customer: cust,
    order: orderPayload,
    affiliateApplication: appPayload,
  };
}

/** Admin: danh sách ticket (nhẹ hơn detail nhưng đủ metadata). */
export const adminSupportTicketListSelect = {
  id: true,
  subject: true,
  type: true,
  status: true,
  priority: true,
  tags: true,
  assignedAdminId: true,
  assignedAdmin: {
    select: { id: true, fullName: true, email: true },
  },
  orderId: true,
  affiliateApplicationId: true,
  lastMessageAt: true,
  updatedAt: true,
  createdAt: true,
  adminUnreadCount: true,
  customerUnreadCount: true,
  customer: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      affiliateProfiles: {
        where: { status: "ACTIVE" as const },
        select: { id: true },
        take: 1,
      },
    },
  },
  order: {
    select: { id: true, code: true, orderStatus: true },
  },
  affiliateApplication: {
    select: {
      id: true,
      fullName: true,
      phone: true,
      status: true,
    },
  },
} satisfies Prisma.SupportTicketSelect;

export type AdminSupportTicketListPayload = Prisma.SupportTicketGetPayload<{
  select: typeof adminSupportTicketListSelect;
}>;

export function serializeAdminSupportTicketListRow(r: AdminSupportTicketListPayload): Record<string, unknown> {
  const { customer, order, affiliateApplication, assignedAdmin, ...t } = r;
  const isAffiliate = (customer.affiliateProfiles?.length ?? 0) > 0;
  const cust = {
    id: customer.id,
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
  };
  return {
    id: t.id,
    subject: t.subject,
    type: t.type,
    status: t.status,
    priority: t.priority,
    tags: t.tags,
    assignedAdminId: t.assignedAdminId,
    assignedAdmin: assignedAdmin
      ? { id: assignedAdmin.id, fullName: assignedAdmin.fullName, email: assignedAdmin.email }
      : null,
    orderId: t.orderId,
    affiliateApplicationId: t.affiliateApplicationId,
    lastMessageAt: t.lastMessageAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    createdAt: t.createdAt.toISOString(),
    adminUnreadCount: t.adminUnreadCount,
    customerUnreadCount: t.customerUnreadCount,
    unreadCount: t.adminUnreadCount,
    participantKind: isAffiliate ? "affiliate" : "customer",
    customer: cust,
    order: order ? { id: order.id, code: order.code, orderStatus: order.orderStatus } : null,
    affiliateApplication,
  };
}

/** Khách (USER): list + detail ticket — unreadCount = customerUnreadCount. */
export const customerSupportTicketApiSelect = {
  id: true,
  subject: true,
  type: true,
  status: true,
  priority: true,
  tags: true,
  assignedAdminId: true,
  assignedAdmin: {
    select: { id: true, fullName: true, email: true },
  },
  orderId: true,
  affiliateApplicationId: true,
  lastMessageAt: true,
  customerUnreadCount: true,
  adminUnreadCount: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SupportTicketSelect;

export type CustomerSupportTicketApiPayload = Prisma.SupportTicketGetPayload<{
  select: typeof customerSupportTicketApiSelect;
}>;

export function serializeCustomerSupportTicketApi(row: CustomerSupportTicketApiPayload): Record<string, unknown> {
  return {
    id: row.id,
    subject: row.subject,
    type: row.type,
    status: row.status,
    priority: row.priority,
    tags: row.tags,
    assignedAdminId: row.assignedAdminId,
    assignedAdmin: row.assignedAdmin
      ? {
          id: row.assignedAdmin.id,
          fullName: row.assignedAdmin.fullName,
          email: row.assignedAdmin.email,
        }
      : null,
    orderId: row.orderId,
    affiliateApplicationId: row.affiliateApplicationId,
    lastMessageAt: row.lastMessageAt.toISOString(),
    customerUnreadCount: row.customerUnreadCount,
    adminUnreadCount: row.adminUnreadCount,
    unreadCount: row.customerUnreadCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
