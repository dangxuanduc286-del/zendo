export type AccountRole = "ADMIN" | "COLLABORATOR" | "CUSTOMER";
export type AccountStatus = "ACTIVE" | "LOCKED" | "SOFT_DELETED";
export type AccountSource = "EMAIL" | "GOOGLE" | "FACEBOOK" | "MIXED";

export type AdminAccountListItem = {
  id: string;
  scope: "admin" | "customer";
  fullName: string;
  email: string;
  phone: string;
  role: AccountRole;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  orderCount: number;
};

export type AccountListResponse = {
  items: AdminAccountListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: {
    totalAccounts: number;
    customers: number;
    collaborators: number;
    admins: number;
    active: number;
    locked: number;
  };
  canManageUsers: boolean;
};

export function roleLabel(role: AccountRole): string {
  if (role === "ADMIN") return "Quản trị";
  if (role === "COLLABORATOR") return "Cộng tác viên";
  return "Khách hàng";
}

export function statusLabel(status: AccountStatus): string {
  if (status === "ACTIVE") return "Hoạt động";
  if (status === "LOCKED") return "Đã khóa";
  return "Đã xóa mềm";
}
