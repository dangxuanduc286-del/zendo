"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { roleLabel, statusLabel, type AccountRole, type AccountSource, type AccountStatus } from "../../lib/admin-account";
import { adminPrimaryButton } from "../../lib/admin-ui";

type AccountDetail = {
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
  loginSources: AccountSource[];
  orderCount: number;
  orders: Array<{ id: string; code: string; status: string; totalAmount: number; createdAt: string }>;
  addresses: Array<{ id: string; fullName: string; phone: string; text: string; isDefault: boolean }>;
  ctvStatus?: "ACTIVE" | "PAUSED" | "LOCKED" | "NONE";
};

export default function AdminAccountDetail({ accountId }: { accountId: string }): JSX.Element {
  const [item, setItem] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [guard, setGuard] = useState<{ isSelf: boolean; isRootAdmin: boolean; canManageAccess: boolean }>({
    isSelf: false,
    isRootAdmin: false,
    canManageAccess: false,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/admin/accounts/${accountId}`, { cache: "no-store" });
    const payload = (await response.json()) as {
      item?: AccountDetail;
      guards?: { isSelf: boolean; isRootAdmin: boolean; canManageAccess: boolean };
      message?: string;
    };
    if (!response.ok || !payload.item) {
      setError(payload.message ?? "Không thể tải tài khoản.");
      setLoading(false);
      return;
    }
    setItem(payload.item);
    setFullName(payload.item.fullName);
    setPhone(payload.item.phone);
    setGuard(payload.guards ?? { isSelf: false, isRootAdmin: false, canManageAccess: false });
    setLoading(false);
  }, [accountId]);

  useEffect(() => {
    loadData().catch(() => {
      setError("Không thể tải tài khoản.");
      setLoading(false);
    });
  }, [loadData]);

  const patchAction = async (body: Record<string, unknown>) => {
    setSaving(true);
    setError("");
    const response = await fetch(`/api/admin/accounts/${accountId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setError(payload.message ?? "Không thể cập nhật tài khoản.");
      setSaving(false);
      return false;
    }
    setSaving(false);
    await loadData();
    return true;
  };

  if (loading) return <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6 text-sm text-[#64748B]">Đang tải chi tiết tài khoản...</section>;
  if (!item) return <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error || "Không tìm thấy tài khoản."}</section>;

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
        <p className="text-xs text-[#64748B]">Danh sách tài khoản / Chi tiết tài khoản</p>
        <h1 className="mt-1 text-2xl font-bold text-[#0F172A]">{item.fullName}</h1>
        <p className="text-sm text-[#64748B]">{item.email || item.phone || "-"}</p>
        <div className="mt-2 flex gap-2">
          <Badge>{roleLabel(item.role)}</Badge>
          <Badge tone={item.status === "ACTIVE" ? "success" : item.status === "SOFT_DELETED" ? "danger" : "neutral"}>
            {statusLabel(item.status)}
          </Badge>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card title="Thông tin cơ bản">
            <DataRow label="Vai trò" value={roleLabel(item.role)} />
            <DataRow label="Trạng thái" value={statusLabel(item.status)} />
            <DataRow label="Ngày tạo" value={new Date(item.createdAt).toLocaleString("vi-VN")} />
            <DataRow label="Cập nhật gần nhất" value={new Date(item.updatedAt).toLocaleString("vi-VN")} />
            <DataRow label="Đăng nhập gần nhất" value={item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString("vi-VN") : "-"} />
            <DataRow label="Số điện thoại" value={item.phone || "-"} />
            <DataRow label="Số đơn hàng" value={String(item.orderCount)} />
            <DataRow label="Nguồn đăng nhập" value={item.loginSources.join(", ")} />
          </Card>

          <Card title="Sửa hồ sơ">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-10 rounded-md border border-zinc-300 px-3 text-sm" placeholder="Họ tên" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10 rounded-md border border-zinc-300 px-3 text-sm" placeholder="Số điện thoại" />
            </div>
            <button type="button" disabled={saving} onClick={() => patchAction({ action: "update_profile", fullName, phone })} className={`mt-3 ${adminPrimaryButton}`}>Lưu thông tin</button>
          </Card>

          <Card title="Đơn hàng liên quan">
            {!item.orders.length ? (
              <p className="text-sm text-[#64748B]">Chưa có đơn hàng gắn với tài khoản này.</p>
            ) : (
              <div className="space-y-2">
                {item.orders.map((order) => (
                  <Link key={order.id} href={`/admin/orders/${order.id}`} className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">{order.code}</p>
                      <p className="text-xs text-[#64748B]">{order.status} • {new Date(order.createdAt).toLocaleString("vi-VN")}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#0F172A]">{order.totalAmount.toLocaleString("vi-VN")}đ</p>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card title="Địa chỉ đã lưu">
            {!item.addresses.length ? (
              <p className="text-sm text-[#64748B]">Chưa có địa chỉ trong sổ địa chỉ.</p>
            ) : (
              <div className="space-y-2">
                {item.addresses.map((address) => (
                  <div key={address.id} className="rounded-lg border border-zinc-200 p-3">
                    <p className="text-sm font-semibold text-[#0F172A]">{address.fullName} • {address.phone}</p>
                    <p className="text-sm text-[#64748B]">{address.text}</p>
                    <p className="mt-1 text-xs text-[#64748B]">{address.isDefault ? "Mặc định" : "Không mặc định"}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Liên kết đăng nhập">
            <p className="text-sm text-[#64748B]">
              {item.loginSources.includes("GOOGLE") || item.loginSources.includes("FACEBOOK") || item.loginSources.includes("MIXED")
                ? item.loginSources.join(", ")
                : "Chưa có tài khoản OAuth — có thể chỉ đăng nhập bằng email."}
            </p>
          </Card>

          <Card title="Thao tác quản trị">
            <div className="grid grid-cols-1 gap-2">
              <button type="button" disabled={saving || guard.isSelf || guard.isRootAdmin} onClick={() => patchAction({ action: "set_status", status: "LOCKED" })} className="h-10 rounded-md border border-zinc-300 px-3 text-left text-sm">Khóa tài khoản</button>
              <button type="button" disabled={saving} onClick={() => patchAction({ action: "set_status", status: "ACTIVE" })} className="h-10 rounded-md border border-zinc-300 px-3 text-left text-sm">Mở khóa tài khoản</button>
              <button type="button" disabled={saving || guard.isSelf || guard.isRootAdmin} onClick={() => patchAction({ action: "set_status", status: "SOFT_DELETED" })} className="h-10 rounded-md border border-rose-200 px-3 text-left text-sm text-rose-700">Xóa mềm tài khoản</button>
              <button type="button" disabled={saving} onClick={() => patchAction({ action: "set_status", status: "ACTIVE" })} className="h-10 rounded-md border border-zinc-300 px-3 text-left text-sm">Khôi phục tài khoản</button>
            </div>
          </Card>

          <Card title="Vai trò">
            <p className="mb-2 text-xs text-[#64748B]">Có guard an toàn cho admin gốc và admin cuối cùng.</p>
            <div className="grid grid-cols-1 gap-2">
              <button type="button" disabled={saving} onClick={() => patchAction({ action: "set_role", role: "ADMIN" })} className="h-10 rounded-md border border-zinc-300 px-3 text-left text-sm">Cấp quyền quản trị</button>
              <button type="button" disabled={saving} onClick={() => patchAction({ action: "set_role", role: "COLLABORATOR" })} className="h-10 rounded-md border border-zinc-300 px-3 text-left text-sm">Nâng thành CTV</button>
              <button type="button" disabled={saving} onClick={() => patchAction({ action: "set_role", role: "CUSTOMER" })} className="h-10 rounded-md border border-zinc-300 px-3 text-left text-sm">Gỡ quyền về khách hàng</button>
            </div>
          </Card>

          <Card title="Vai trò & quyền truy cập">
            <div className="space-y-2">
              <p className="text-sm text-[#64748B]">
                Vai trò hiện tại: <span className="font-semibold text-[#0F172A]">{roleLabel(item.role)}</span>
              </p>
              <p className="text-sm text-[#64748B]">
                Trạng thái CTV:{" "}
                <span className="font-semibold text-[#0F172A]">
                  {item.ctvStatus === "ACTIVE"
                    ? "Đang hoạt động"
                    : item.ctvStatus === "PAUSED"
                      ? "Tạm dừng"
                      : item.ctvStatus === "LOCKED"
                        ? "Đã khóa"
                        : "Không phải CTV"}
                </span>
              </p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  disabled={saving || !guard.canManageAccess}
                  onClick={async () => {
                    if (!window.confirm("Nâng tài khoản này thành cộng tác viên?")) return;
                    const ok = await patchAction({ action: "promote_ctv" });
                    if (ok) alert("Đã nâng tài khoản thành cộng tác viên.");
                  }}
                  className="h-10 rounded-md border border-zinc-300 px-3 text-left text-sm"
                >
                  Nâng thành CTV
                </button>
                <button
                  type="button"
                  disabled={saving || !guard.canManageAccess}
                  onClick={async () => {
                    if (!window.confirm("Gỡ vai trò CTV của tài khoản này?")) return;
                    const ok = await patchAction({ action: "remove_ctv" });
                    if (ok) alert("Đã cập nhật trạng thái cộng tác viên.");
                  }}
                  className="h-10 rounded-md border border-zinc-300 px-3 text-left text-sm"
                >
                  Gỡ CTV
                </button>
                <button
                  type="button"
                  disabled={saving || !guard.canManageAccess}
                  onClick={async () => {
                    if (!window.confirm("Cấp quyền quản trị viên cho tài khoản này?")) return;
                    const ok = await patchAction({ action: "grant_admin" });
                    if (ok) alert("Đã cấp quyền quản trị viên.");
                  }}
                  className="h-10 rounded-md border border-zinc-300 px-3 text-left text-sm"
                >
                  Cấp quyền quản trị
                </button>
                <button
                  type="button"
                  disabled={saving || !guard.canManageAccess || guard.isRootAdmin}
                  onClick={async () => {
                    if (!window.confirm("Gỡ quyền quản trị của tài khoản này?")) return;
                    const ok = await patchAction({ action: "revoke_admin" });
                    if (ok) alert("Đã cập nhật quyền quản trị.");
                  }}
                  className="h-10 rounded-md border border-rose-200 px-3 text-left text-sm text-rose-700"
                >
                  Gỡ quyền quản trị
                </button>
              </div>
            </div>
          </Card>

          <Card title="Đặt mật khẩu đăng nhập">
            <div className="space-y-2">
              <div className="flex gap-2">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 flex-1 rounded-md border border-zinc-300 px-3 text-sm" placeholder="Mật khẩu mới (ít nhất 8 ký tự)" />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="h-10 rounded-md border border-zinc-300 px-3 text-sm">{showPassword ? "Ẩn" : "Hiện"}</button>
              </div>
              <div className="flex gap-2">
                <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-10 flex-1 rounded-md border border-zinc-300 px-3 text-sm" placeholder="Nhập lại mật khẩu mới" />
                <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="h-10 rounded-md border border-zinc-300 px-3 text-sm">{showConfirmPassword ? "Ẩn" : "Hiện"}</button>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  if (password.length < 8) {
                    setError("Mật khẩu phải có ít nhất 8 ký tự.");
                    return;
                  }
                  if (password !== confirmPassword) {
                    setError("Mật khẩu nhập lại không khớp.");
                    return;
                  }
                  const ok = await patchAction({ action: "set_password", password });
                  if (ok) {
                    setPassword("");
                    setConfirmPassword("");
                    alert("Đã cập nhật mật khẩu đăng nhập.");
                  }
                }}
                className={adminPrimaryButton}
              >
                Lưu mật khẩu
              </button>
            </div>
          </Card>
        </div>
      </div>
      {error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-[#0F172A]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function DataRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-start justify-between border-b border-[#E2E8F0] py-2 text-sm last:border-none">
      <span className="text-[#64748B]">{label}</span>
      <span className="max-w-[60%] text-right font-medium text-[#0F172A]">{value || "-"}</span>
    </div>
  );
}

function Badge({ children, tone = "neutral" }: { children: string; tone?: "success" | "neutral" | "danger" }): JSX.Element {
  const cls =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "danger"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-slate-100 text-slate-700 border-slate-200";
  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${cls}`}>{children}</span>;
}
